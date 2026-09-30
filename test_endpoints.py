import urllib.request
import json
import sys

BASE_URL = "http://127.0.0.1:5000"

def test_request(method, path, data=None):
    url = f"{BASE_URL}{path}"
    headers = {'Content-Type': 'application/json'} if data else {}
    body = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode('utf-8')
            return response.status, json.loads(res_body) if response.headers.get_content_type() == 'application/json' else res_body
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        try:
            return e.code, json.loads(error_body)
        except Exception:
            return e.code, error_body

def run_tests():
    print("=== Testing CleanPulse API Endpoints ===")

    # 1. Test Static Index
    status, body = test_request('GET', '/')
    assert status == 200, f"Expected 200 for index, got {status}"
    assert "CleanPulse" in body, "Index HTML missing CleanPulse title"
    print("PASS: Static frontend serving (GET /)")

    # 2. Test User Login
    status, body = test_request('POST', '/api/auth/login', {
        'identifier': 'aarav.mehta@example.com',
        'password': 'user123',
        'role': 'user'
    })
    assert status == 200 and body['success'], f"User login failed: {body}"
    assert body['user']['unique_id'].startswith('USR-'), "Invalid user unique ID"
    print(f"PASS: User Login -> {body['user']['name']} ({body['user']['unique_id']})")

    # 3. Test Collector Login
    status, body = test_request('POST', '/api/auth/login', {
        'identifier': 'rajesh.collector@cleanwaste.com',
        'password': 'col123',
        'role': 'collector'
    })
    assert status == 200 and body['success'], f"Collector login failed: {body}"
    assert body['user']['unique_id'].startswith('COL-'), "Invalid collector unique ID"
    print(f"PASS: Collector Login -> {body['user']['name']} ({body['user']['unique_id']})")

    # 4. Test Admin Login
    status, body = test_request('POST', '/api/auth/login', {
        'identifier': 'admin@cleanwaste.com',
        'password': 'admin123',
        'role': 'admin'
    })
    assert status == 200 and body['success'], f"Admin login failed: {body}"
    print(f"PASS: Admin Login -> {body['user']['name']} ({body['user']['unique_id']})")

    # 5. Test User Registration with Unique ID
    test_phone = f"9800{sys.hexversion % 100000:06d}"
    test_email = f"testcitizen_{sys.hexversion % 100000}@example.com"
    status, body = test_request('POST', '/api/auth/register-user', {
        'name': 'Test Citizen',
        'age': 30,
        'area': 'Downtown',
        'email': test_email,
        'phone': test_phone,
        'gender': 'Female',
        'password': 'password123'
    })
    assert status == 200 and body['success'], f"User registration failed: {body}"
    new_user_id = body['user']['id']
    assert body['user']['unique_id'].startswith('USR-'), "Generated ID does not start with USR-"
    print(f"PASS: User Registration -> Generated Unique ID: {body['user']['unique_id']}")

    # 6. Test Complaint Creation with 48h SLA
    status, body = test_request('POST', '/api/complaints', {
        'user_id': new_user_id,
        'area': 'Downtown',
        'description': 'Overflowing bin near Sector 4 corner',
        'complaint_image': 'https://images.unsplash.com/photo-1605600659908-0ef719419d41'
    })
    assert status == 200 and body['success'], f"Complaint creation failed: {body}"
    tracking_id = body['tracking_id']
    assert tracking_id.startswith('CMP-'), "Invalid tracking ID format"
    print(f"PASS: Complaint Filed -> {tracking_id} with 48h deadline {body['deadline_at']}")

    # 7. Test User Tracking
    status, body = test_request('GET', f'/api/user/tracking?user_id={new_user_id}')
    assert status == 200 and body['success'], f"User tracking failed: {body}"
    assert len(body['complaints']) >= 1, "Tracking list empty"
    print(f"PASS: User Tracking -> Found {len(body['complaints'])} tracked complaints with SLA countdown")

    # 8. Test Collector Dashboard & Progress
    status, body = test_request('GET', '/api/collector/dashboard?collector_id=1')
    assert status == 200 and body['success'], f"Collector dashboard failed: {body}"
    print(f"PASS: Collector Dashboard -> Assigned: {body['stats']['total_complaints']}, Pending: {body['stats']['pending_complaints']}, Progress: {body['stats']['progress_percentage']}%")

    # 9. Test Complaint Resolution with Mandatory Verification Photo
    # Find pending complaint in Downtown
    complaint_to_resolve = None
    for c in body['complaints']:
        if c['status'] == 'Pending':
            complaint_to_resolve = c
            break
    
    if complaint_to_resolve:
        # First test validation: resolving WITHOUT photo must fail
        fail_status, fail_body = test_request('POST', f"/api/collector/complaints/{complaint_to_resolve['id']}/resolve", {
            'collector_id': 1,
            'resolution_image': ''
        })
        assert fail_status == 400, "Should reject resolution without proof photo"
        print("PASS: Verified mandatory photo upload validation on complaint resolution")

        # Now resolve WITH verification photo
        status, body = test_request('POST', f"/api/collector/complaints/{complaint_to_resolve['id']}/resolve", {
            'collector_id': 1,
            'resolution_image': 'https://images.unsplash.com/photo-1518780664697-55e3ad937233',
            'notes': 'Spot cleared, washed and disinfected.'
        })
        assert status == 200 and body['success'], f"Resolution failed: {body}"
        print(f"PASS: Complaint {complaint_to_resolve['tracking_id']} Resolved with photo proof. New progress: {body['progress_percentage']}%")

    # 10. Test User Notification Generated
    status, body = test_request('GET', f"/api/user/notifications?user_id={complaint_to_resolve['user_id'] if complaint_to_resolve else 1}")
    assert status == 200 and body['success'], f"Notifications failed: {body}"
    assert len(body['notifications']) >= 1, "Notification not created for resolved complaint"
    print(f"PASS: User Notification -> '{body['notifications'][0]['title']}' verified")

    # 11. Test Admin Dashboard
    status, body = test_request('GET', '/api/admin/dashboard')
    assert status == 200 and body['success'], f"Admin dashboard failed: {body}"
    stats = body['stats']
    print(f"PASS: Admin Dashboard -> Users: {stats['total_users']}, Complains: {stats['total_complaints']}, Collectors: {stats['total_collectors']}, Resolved: {stats['total_resolved']}")

    # 12. Test Admin Waste Area Alerts (4 Color Categories)
    status, body = test_request('GET', '/api/admin/waste-area-alerts')
    assert status == 200 and body['success'], f"Waste area alerts failed: {body}"
    summary = body['summary']
    print(f"PASS: Waste Area Alerts -> High (Red): {summary['high_count']}, Medium (Orange): {summary['medium_count']}, Low (Yellow): {summary['low_count']}, Clear (Green): {summary['clear_count']}")

    # 13. Test Admin User Logger & Collector Logger
    status, body = test_request('GET', '/api/admin/users')
    assert status == 200 and body['success'] and len(body['users']) > 0, "Admin user logger empty"
    print(f"PASS: Admin Users Logger -> Retrieved {len(body['users'])} user records with unique IDs and badge stats")

    status, body = test_request('GET', '/api/admin/collectors')
    assert status == 200 and body['success'] and len(body['collectors']) > 0, "Admin collectors logger empty"
    print(f"PASS: Admin Employees Logger -> Retrieved {len(body['collectors'])} collector records with performance stats")

    print("\nALL BACKEND & SYSTEM VERIFICATIONS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    run_tests()
