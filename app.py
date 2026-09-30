import os
import json
import sqlite3
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_from_directory
from database import get_db, init_db, generate_unique_id

app = Flask(__name__, static_folder='static', static_url_path='')

# Ensure DB initialized on startup
if not os.path.exists(os.path.join(os.path.dirname(__file__), 'cleanpulse.db')):
    init_db()

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response

# Serve frontend
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

# ----------------- AUTHENTICATION -----------------

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json or {}
    identifier = str(data.get('identifier', '')).strip()
    password = str(data.get('password', '')).strip()
    role = str(data.get('role', 'user')).lower().strip()

    if not identifier or not password:
        return jsonify({'success': False, 'message': 'Please provide email/phone and password'}), 400

    conn = get_db()
    cursor = conn.cursor()

    if role == 'admin':
        cursor.execute('''
            SELECT * FROM admin 
            WHERE (email = ? OR phone = ?) AND password = ?
        ''', (identifier, identifier, password))
        admin = cursor.fetchone()
        conn.close()
        if admin:
            return jsonify({
                'success': True,
                'role': 'admin',
                'user': {
                    'id': admin['id'],
                    'unique_id': admin['unique_id'],
                    'name': admin['name'],
                    'email': admin['email'],
                    'phone': admin['phone'],
                    'role': 'admin'
                }
            })
        return jsonify({'success': False, 'message': 'Invalid Admin credentials'}), 401

    elif role == 'collector':
        cursor.execute('''
            SELECT * FROM collectors 
            WHERE (email = ? OR phone = ?) AND password = ?
        ''', (identifier, identifier, password))
        col = cursor.fetchone()
        conn.close()
        if col:
            return jsonify({
                'success': True,
                'role': 'collector',
                'user': {
                    'id': col['id'],
                    'unique_id': col['unique_id'],
                    'name': col['name'],
                    'gender': col['gender'],
                    'phone': col['phone'],
                    'email': col['email'],
                    'assigned_area': col['assigned_area'],
                    'coins': col['coins'],
                    'role': 'collector'
                }
            })
        return jsonify({'success': False, 'message': 'Invalid Collector credentials'}), 401

    else: # Default User
        cursor.execute('''
            SELECT * FROM users 
            WHERE (email = ? OR phone = ?) AND password = ?
        ''', (identifier, identifier, password))
        user = cursor.fetchone()
        conn.close()
        if user:
            return jsonify({
                'success': True,
                'role': 'user',
                'user': {
                    'id': user['id'],
                    'unique_id': user['unique_id'],
                    'name': user['name'],
                    'age': user['age'],
                    'area': user['area'],
                    'email': user['email'],
                    'phone': user['phone'],
                    'gender': user['gender'],
                    'role': 'user'
                }
            })
        return jsonify({'success': False, 'message': 'Invalid User credentials'}), 401

@app.route('/api/auth/register-user', methods=['POST'])
def register_user():
    data = request.json or {}
    name = str(data.get('name', '')).strip()
    age = data.get('age')
    area = str(data.get('area', '')).strip()
    email = str(data.get('email', '')).strip()
    phone = str(data.get('phone', '')).strip()
    gender = str(data.get('gender', 'Other')).strip()
    password = str(data.get('password', '')).strip()

    if not (name and area and phone and password):
        return jsonify({'success': False, 'message': 'Name, Area, Phone, and Password are required'}), 400

    conn = get_db()
    cursor = conn.cursor()

    # Check uniqueness
    cursor.execute("SELECT id FROM users WHERE phone = ? OR (email != '' AND email = ?)", (phone, email))
    if cursor.fetchone():
        conn.close()
        return jsonify({'success': False, 'message': 'User with this phone or email already exists'}), 409

    unique_id = generate_unique_id('USR')
    try:
        cursor.execute('''
            INSERT INTO users (unique_id, name, age, area, email, phone, gender, password)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (unique_id, name, age, area, email, phone, gender, password))
        user_id = cursor.lastrowid
        conn.commit()

        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        new_user = cursor.fetchone()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'User registered successfully!',
            'user': {
                'id': new_user['id'],
                'unique_id': new_user['unique_id'],
                'name': new_user['name'],
                'age': new_user['age'],
                'area': new_user['area'],
                'email': new_user['email'],
                'phone': new_user['phone'],
                'gender': new_user['gender'],
                'role': 'user'
            }
        })
    except Exception as e:
        conn.close()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/auth/register-collector', methods=['POST'])
def register_collector():
    data = request.json or {}
    name = str(data.get('name', '')).strip()
    gender = str(data.get('gender', 'Male')).strip()
    phone = str(data.get('phone', '')).strip()
    email = str(data.get('email', '')).strip()
    assigned_area = str(data.get('assigned_area', '')).strip()
    password = str(data.get('password', '')).strip()

    if not (name and phone and email and assigned_area and password):
        return jsonify({'success': False, 'message': 'All collector fields are required'}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM collectors WHERE phone = ? OR email = ?", (phone, email))
    if cursor.fetchone():
        conn.close()
        return jsonify({'success': False, 'message': 'Collector with this phone or email already exists'}), 409

    unique_id = generate_unique_id('COL')
    try:
        cursor.execute('''
            INSERT INTO collectors (unique_id, name, gender, phone, email, assigned_area, password, coins)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)
        ''', (unique_id, name, gender, phone, email, assigned_area, password))
        col_id = cursor.lastrowid
        conn.commit()

        cursor.execute("SELECT * FROM collectors WHERE id = ?", (col_id,))
        new_col = cursor.fetchone()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'Collector registered successfully!',
            'user': {
                'id': new_col['id'],
                'unique_id': new_col['unique_id'],
                'name': new_col['name'],
                'gender': new_col['gender'],
                'phone': new_col['phone'],
                'email': new_col['email'],
                'assigned_area': new_col['assigned_area'],
                'coins': new_col['coins'],
                'role': 'collector'
            }
        })
    except Exception as e:
        conn.close()
        return jsonify({'success': False, 'message': str(e)}), 500

# ----------------- USER FEATURES -----------------

@app.route('/api/user/profile', methods=['GET', 'PUT'])
def user_profile():
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'GET':
        user_id = request.args.get('user_id')
        if not user_id:
            conn.close()
            return jsonify({'success': False, 'message': 'User ID required'}), 400

        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        if not user:
            conn.close()
            return jsonify({'success': False, 'message': 'User not found'}), 404

        # Calculate reward badge based on complaints filed
        cursor.execute("SELECT COUNT(*) FROM complaints WHERE user_id = ?", (user_id,))
        complaint_count = cursor.fetchone()[0]

        # Badges rule: 25 = Bronze, 50 = Silver, 100 = Gold
        badge = "Citizen"
        badge_level = "Novice"
        next_badge = "Bronze (25)"
        progress_to_next = round((complaint_count / 25) * 100, 1) if complaint_count < 25 else 100

        if complaint_count >= 100:
            badge = "Gold"
            badge_level = "Eco Champion"
            next_badge = "Maximum Tier Achieved"
            progress_to_next = 100
        elif complaint_count >= 50:
            badge = "Silver"
            badge_level = "Green Guardian"
            next_badge = "Gold (100)"
            progress_to_next = round(((complaint_count - 50) / 50) * 100, 1)
        elif complaint_count >= 25:
            badge = "Bronze"
            badge_level = "Clean Warrior"
            next_badge = "Silver (50)"
            progress_to_next = round(((complaint_count - 25) / 25) * 100, 1)

        # Get complaint history
        cursor.execute('''
            SELECT * FROM complaints 
            WHERE user_id = ? 
            ORDER BY datetime(created_at) DESC
        ''', (user_id,))
        complaints = [dict(row) for row in cursor.fetchall()]

        conn.close()
        return jsonify({
            'success': True,
            'user': {
                'id': user['id'],
                'unique_id': user['unique_id'],
                'name': user['name'],
                'age': user['age'],
                'area': user['area'],
                'email': user['email'],
                'phone': user['phone'],
                'gender': user['gender'],
                'created_at': user['created_at']
            },
            'rewards': {
                'total_complaints': complaint_count,
                'badge': badge,
                'badge_level': badge_level,
                'next_badge': next_badge,
                'progress_to_next': min(100, progress_to_next),
                'bronze_threshold': 25,
                'silver_threshold': 50,
                'gold_threshold': 100
            },
            'complaints': complaints
        })

    elif request.method == 'PUT':
        data = request.json or {}
        user_id = data.get('id')
        name = str(data.get('name', '')).strip()
        age = data.get('age')
        area = str(data.get('area', '')).strip()
        email = str(data.get('email', '')).strip()
        phone = str(data.get('phone', '')).strip()
        gender = str(data.get('gender', '')).strip()

        if not user_id:
            conn.close()
            return jsonify({'success': False, 'message': 'User ID required'}), 400

        cursor.execute('''
            UPDATE users 
            SET name = ?, age = ?, area = ?, email = ?, phone = ?, gender = ?
            WHERE id = ?
        ''', (name, age, area, email, phone, gender, user_id))
        conn.commit()

        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        updated_user = cursor.fetchone()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'Profile updated successfully!',
            'user': dict(updated_user)
        })

@app.route('/api/complaints', methods=['POST'])
def create_complaint():
    data = request.json or {}
    user_id = data.get('user_id')
    area = str(data.get('area', '')).strip()
    description = str(data.get('description', '')).strip()
    complaint_image = data.get('complaint_image', '')

    if not (user_id and area and description):
        return jsonify({'success': False, 'message': 'Area, description, and user information are required'}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT name, phone FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        return jsonify({'success': False, 'message': 'User not found'}), 404

    # Find assigned collector for this area if available
    cursor.execute("SELECT id, name FROM collectors WHERE assigned_area = ? LIMIT 1", (area,))
    collector = cursor.fetchone()
    collector_id = collector['id'] if collector else None
    collector_name = collector['name'] if collector else "Unassigned"

    now = datetime.now()
    created_at = now.isoformat()
    # 48 hour SLA deadline
    deadline_at = (now + timedelta(hours=48)).isoformat()
    tracking_id = generate_unique_id('CMP')

    # If no image provided, assign an aesthetic placeholder
    if not complaint_image:
        complaint_image = "https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=600&auto=format&fit=crop&q=60"

    cursor.execute('''
        INSERT INTO complaints (
            tracking_id, user_id, user_name, user_phone, area, description, complaint_image,
            status, created_at, deadline_at, collector_id, collector_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?, ?)
    ''', (tracking_id, user_id, user['name'], user['phone'], area, description, 
          complaint_image, created_at, deadline_at, collector_id, collector_name))
    
    conn.commit()
    conn.close()

    return jsonify({
        'success': True,
        'message': 'Waste complaint filed successfully! 48-hour resolution tracking initialized.',
        'tracking_id': tracking_id,
        'deadline_at': deadline_at
    })

@app.route('/api/user/tracking', methods=['GET'])
def get_user_tracking():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'User ID required'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT c.*, col.phone as collector_phone 
        FROM complaints c
        LEFT JOIN collectors col ON c.collector_id = col.id
        WHERE c.user_id = ?
        ORDER BY datetime(c.created_at) DESC
    ''', (user_id,))
    complaints = [dict(row) for row in cursor.fetchall()]
    conn.close()

    now = datetime.now()
    for item in complaints:
        # Calculate SLA remaining time
        try:
            deadline = datetime.fromisoformat(item['deadline_at'])
            remaining_seconds = (deadline - now).total_seconds()
            item['remaining_seconds'] = max(0, int(remaining_seconds))
            item['is_overdue'] = remaining_seconds < 0 and item['status'] != 'Resolved'
        except Exception:
            item['remaining_seconds'] = 0
            item['is_overdue'] = False

    return jsonify({'success': True, 'complaints': complaints})

@app.route('/api/user/notifications', methods=['GET'])
def get_user_notifications():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'message': 'User ID required'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT * FROM notifications 
        WHERE user_id = ? 
        ORDER BY datetime(created_at) DESC
    ''', (user_id,))
    notifs = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return jsonify({'success': True, 'notifications': notifs})

@app.route('/api/user/notifications/mark-read', methods=['POST'])
def mark_notifications_read():
    data = request.json or {}
    user_id = data.get('user_id')
    notification_id = data.get('notification_id')

    conn = get_db()
    cursor = conn.cursor()
    if notification_id:
        cursor.execute("UPDATE notifications SET is_read = 1 WHERE id = ?", (notification_id,))
    elif user_id:
        cursor.execute("UPDATE notifications SET is_read = 1 WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()

    return jsonify({'success': True, 'message': 'Notifications updated'})

@app.route('/api/area-details', methods=['GET'])
def get_area_details():
    area_name = request.args.get('area', '').strip()
    conn = get_db()
    cursor = conn.cursor()

    if area_name:
        cursor.execute("SELECT * FROM areas WHERE name = ?", (area_name,))
        area_info = cursor.fetchone()
        if not area_info:
            conn.close()
            return jsonify({'success': False, 'message': 'Area not found'}), 404
        
        # Get assigned collectors for this area
        cursor.execute("SELECT unique_id, name, phone, email, gender FROM collectors WHERE assigned_area = ?", (area_name,))
        collectors = [dict(row) for row in cursor.fetchall()]

        # Active complaints in area
        cursor.execute("SELECT COUNT(*) FROM complaints WHERE area = ? AND status != 'Resolved'", (area_name,))
        active_complaints = cursor.fetchone()[0]

        conn.close()
        return jsonify({
            'success': True,
            'area': dict(area_info),
            'collectors': collectors,
            'active_complaints': active_complaints
        })
    else:
        # All areas
        cursor.execute("SELECT * FROM areas")
        all_areas = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify({'success': True, 'areas': all_areas})

# ----------------- WASTE COLLECTOR FEATURES -----------------

@app.route('/api/collector/dashboard', methods=['GET'])
def get_collector_dashboard():
    collector_id = request.args.get('collector_id')
    if not collector_id:
        return jsonify({'success': False, 'message': 'Collector ID required'}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM collectors WHERE id = ?", (collector_id,))
    col = cursor.fetchone()
    if not col:
        conn.close()
        return jsonify({'success': False, 'message': 'Collector not found'}), 404

    # Complaints assigned to collector or collector's area
    cursor.execute('''
        SELECT * FROM complaints 
        WHERE collector_id = ? OR area = ?
        ORDER BY datetime(created_at) DESC
    ''', (collector_id, col['assigned_area']))
    complaints = [dict(row) for row in cursor.fetchall()]

    total = len(complaints)
    resolved = sum(1 for c in complaints if c['status'] == 'Resolved')
    pending = total - resolved

    # Progress bar percentage
    progress_percentage = round((resolved / total * 100), 1) if total > 0 else 100.0

    # Daily reward check: if progress >= 70%, eligible for +1 digital coin per day
    today_str = datetime.now().strftime("%Y-%m-%d")
    already_claimed_today = (col['daily_reward_claimed_date'] == today_str)
    eligible_for_daily_coin = (progress_percentage >= 70.0 and total > 0 and not already_claimed_today)

    conn.close()

    return jsonify({
        'success': True,
        'collector': dict(col),
        'stats': {
            'total_complaints': total,
            'pending_complaints': pending,
            'resolved_complaints': resolved,
            'progress_percentage': progress_percentage,
            'coins': col['coins'],
            'cash_value_usd': col['coins'] * 10, # Conversion rate: 1 coin = $10
            'eligible_for_daily_coin': eligible_for_daily_coin,
            'already_claimed_today': already_claimed_today,
            'progress_threshold': 70.0
        },
        'complaints': complaints
    })

@app.route('/api/collector/complaints/<int:complaint_id>/resolve', methods=['POST'])
def resolve_complaint(complaint_id):
    data = request.json or {}
    collector_id = data.get('collector_id')
    resolution_image = data.get('resolution_image', '').strip()
    resolution_notes = data.get('notes', 'Site thoroughly cleaned and sanitised. Waste moved to recycling depot.')

    # Requirement: "after resolving the complain collector have to upload a picture of place to be verified"
    if not resolution_image:
        return jsonify({'success': False, 'message': 'Verification picture of cleared place is mandatory to resolve.'}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM complaints WHERE id = ?", (complaint_id,))
    complaint = cursor.fetchone()
    if not complaint:
        conn.close()
        return jsonify({'success': False, 'message': 'Complaint not found'}), 404

    cursor.execute("SELECT name, coins, daily_reward_claimed_date FROM collectors WHERE id = ?", (collector_id,))
    col = cursor.fetchone()
    col_name = col['name'] if col else "Area Waste Collector"

    now_iso = datetime.now().isoformat()
    cursor.execute('''
        UPDATE complaints 
        SET status = 'Resolved', 
            resolved_at = ?, 
            resolution_image = ?, 
            resolution_notes = ?,
            collector_id = ?,
            collector_name = ?,
            user_notified = 1
        WHERE id = ?
    ''', (now_iso, resolution_image, resolution_notes, collector_id, col_name, complaint_id))

    # Notify the user: "Notify the user when collector clear the complain by his side 'task completed'"
    cursor.execute('''
        INSERT INTO notifications (user_id, complaint_id, title, message, proof_image, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, 0, ?)
    ''', (
        complaint['user_id'], 
        complaint_id, 
        f"Task Completed: {complaint['tracking_id']}", 
        f"Collector {col_name} has cleaned your reported spot in {complaint['area']}. Verification proof uploaded.", 
        resolution_image, 
        now_iso
    ))

    # Check progress bar increment and daily reward auto-evaluation
    # Get all complaints for this collector's area
    cursor.execute('''
        SELECT COUNT(*) as total,
               SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved
        FROM complaints 
        WHERE collector_id = ? OR area = (SELECT assigned_area FROM collectors WHERE id = ?)
    ''', (collector_id, collector_id))
    prog = cursor.fetchone()
    total = prog['total'] or 1
    resolved = prog['resolved'] or 1
    progress_percentage = (resolved / total) * 100

    coin_rewarded = False
    today_str = datetime.now().strftime("%Y-%m-%d")
    if progress_percentage >= 70.0 and col and col['daily_reward_claimed_date'] != today_str:
        # Increment coin by 1
        cursor.execute('''
            UPDATE collectors 
            SET coins = coins + 1, daily_reward_claimed_date = ? 
            WHERE id = ?
        ''', (today_str, collector_id))
        coin_rewarded = True

    conn.commit()

    # Fetch updated collector info
    cursor.execute("SELECT coins FROM collectors WHERE id = ?", (collector_id,))
    new_coins = cursor.fetchone()['coins']
    conn.close()

    return jsonify({
        'success': True,
        'message': 'Complaint marked as resolved! User has been notified with verification photo.',
        'progress_percentage': round(progress_percentage, 1),
        'coin_rewarded': coin_rewarded,
        'current_coins': new_coins
    })

@app.route('/api/collector/claim-daily-reward', methods=['POST'])
def claim_daily_reward():
    data = request.json or {}
    collector_id = data.get('collector_id')

    if not collector_id:
        return jsonify({'success': False, 'message': 'Collector ID required'}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM collectors WHERE id = ?", (collector_id,))
    col = cursor.fetchone()
    if not col:
        conn.close()
        return jsonify({'success': False, 'message': 'Collector not found'}), 404

    # Calculate progress
    cursor.execute('''
        SELECT COUNT(*) as total,
               SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved
        FROM complaints 
        WHERE collector_id = ? OR area = ?
    ''', (collector_id, col['assigned_area']))
    prog = cursor.fetchone()
    total = prog['total'] or 0
    resolved = prog['resolved'] or 0
    progress = (resolved / total * 100) if total > 0 else 100.0

    today_str = datetime.now().strftime("%Y-%m-%d")
    if col['daily_reward_claimed_date'] == today_str:
        conn.close()
        return jsonify({'success': False, 'message': 'Daily reward already claimed today! Check back tomorrow.'}), 400

    if progress < 70.0:
        conn.close()
        return jsonify({'success': False, 'message': f'Progress is currently {progress:.1f}%. Complete at least 70% to unlock today\'s digital coin.'}), 400

    cursor.execute('''
        UPDATE collectors 
        SET coins = coins + 1, daily_reward_claimed_date = ? 
        WHERE id = ?
    ''', (today_str, collector_id))
    conn.commit()

    cursor.execute("SELECT coins FROM collectors WHERE id = ?", (collector_id,))
    updated_coins = cursor.fetchone()['coins']
    conn.close()

    return jsonify({
        'success': True,
        'message': f'Congratulations! +1 Digital Coin awarded for reaching >= 70% daily goal. Total coins: {updated_coins}',
        'coins': updated_coins
    })

@app.route('/api/collector/convert-coins', methods=['POST'])
def convert_coins():
    data = request.json or {}
    collector_id = data.get('collector_id')
    amount_coins = int(data.get('coins', 0))

    if not collector_id or amount_coins <= 0:
        return jsonify({'success': False, 'message': 'Valid collector ID and coin amount required'}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT coins FROM collectors WHERE id = ?", (collector_id,))
    col = cursor.fetchone()
    if not col or col['coins'] < amount_coins:
        conn.close()
        return jsonify({'success': False, 'message': 'Insufficient coins balance'}), 400

    new_balance = col['coins'] - amount_coins
    cursor.execute("UPDATE collectors SET coins = ? WHERE id = ?", (new_balance, collector_id))
    conn.commit()
    conn.close()

    cash_payout = amount_coins * 10 # $10 per coin
    return jsonify({
        'success': True,
        'message': f'Successfully converted {amount_coins} Digital Coins into ${cash_payout} USD! Direct transfer initiated to your registered account.',
        'payout_amount': cash_payout,
        'remaining_coins': new_balance
    })

# ----------------- ADMIN FEATURES -----------------

@app.route('/api/admin/dashboard', methods=['GET'])
def get_admin_dashboard():
    conn = get_db()
    cursor = conn.cursor()

    # Total counts required: Users, Complains, Collector, Resolve complains
    cursor.execute("SELECT COUNT(*) FROM users")
    total_users = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM complaints")
    total_complaints = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM collectors")
    total_collectors = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM complaints WHERE status = 'Resolved'")
    total_resolved = cursor.fetchone()[0]

    pending_complaints = total_complaints - total_resolved
    resolution_rate = round((total_resolved / total_complaints * 100), 1) if total_complaints > 0 else 0

    conn.close()

    return jsonify({
        'success': True,
        'stats': {
            'total_users': total_users,
            'total_complaints': total_complaints,
            'total_collectors': total_collectors,
            'total_resolved': total_resolved,
            'pending_complaints': pending_complaints,
            'resolution_rate': resolution_rate
        }
    })

@app.route('/api/admin/waste-area-alerts', methods=['GET'])
def get_waste_area_alerts():
    conn = get_db()
    cursor = conn.cursor()

    # Fetch all areas
    cursor.execute("SELECT * FROM areas")
    areas = [dict(row) for row in cursor.fetchall()]

    categorized_areas = {
        'high': [],    # Red: > 4 active complaints
        'medium': [],  # Orange: 2 to 4 active complaints
        'low': [],     # Yellow: 1 active complaint
        'clear': []    # Green: 0 active complaints
    }

    for area in areas:
        name = area['name']
        # Count active (unresolved) complaints
        cursor.execute("SELECT COUNT(*) FROM complaints WHERE area = ? AND status != 'Resolved'", (name,))
        active_count = cursor.fetchone()[0]

        # Get total complaints ever reported
        cursor.execute("SELECT COUNT(*) FROM complaints WHERE area = ?", (name,))
        total_count = cursor.fetchone()[0]

        # Get collectors assigned
        cursor.execute("SELECT name, phone FROM collectors WHERE assigned_area = ?", (name,))
        collectors = [dict(r) for r in cursor.fetchall()]

        area_item = {
            'id': area['id'],
            'name': name,
            'dumping_spots': area['dumping_spots'],
            'waste_capacity': area['waste_capacity'],
            'cleanup_schedule': area['cleanup_schedule'],
            'active_complaints': active_count,
            'total_complaints': total_count,
            'collectors': collectors
        }

        # Divide into 4 categories:
        # High: Red
        # Medium: Orange
        # Low: Yellow
        # Clear: Green
        if active_count >= 5:
            area_item['category'] = 'High'
            area_item['color'] = 'red'
            area_item['badge_class'] = 'bg-rose-600 text-white'
            categorized_areas['high'].append(area_item)
        elif active_count >= 2:
            area_item['category'] = 'Medium'
            area_item['color'] = 'orange'
            area_item['badge_class'] = 'bg-amber-500 text-white'
            categorized_areas['medium'].append(area_item)
        elif active_count == 1:
            area_item['category'] = 'Low'
            area_item['color'] = 'yellow'
            area_item['badge_class'] = 'bg-yellow-400 text-slate-900'
            categorized_areas['low'].append(area_item)
        else:
            area_item['category'] = 'Clear'
            area_item['color'] = 'green'
            area_item['badge_class'] = 'bg-emerald-600 text-white'
            categorized_areas['clear'].append(area_item)

    conn.close()

    return jsonify({
        'success': True,
        'summary': {
            'high_count': len(categorized_areas['high']),
            'medium_count': len(categorized_areas['medium']),
            'low_count': len(categorized_areas['low']),
            'clear_count': len(categorized_areas['clear'])
        },
        'categories': categorized_areas
    })

@app.route('/api/admin/users', methods=['GET'])
def get_admin_users():
    conn = get_db()
    cursor = conn.cursor()

    # Logger: users Id and details in form of table
    cursor.execute('''
        SELECT u.id, u.unique_id, u.name, u.age, u.area, u.email, u.phone, u.gender, u.created_at,
               COUNT(c.id) as total_complaints,
               SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) as resolved_complaints
        FROM users u
        LEFT JOIN complaints c ON u.id = c.user_id
        GROUP BY u.id
        ORDER BY u.id ASC
    ''')
    users_list = [dict(row) for row in cursor.fetchall()]
    conn.close()

    for u in users_list:
        tc = u['total_complaints'] or 0
        if tc >= 100:
            u['badge'] = 'Gold'
        elif tc >= 50:
            u['badge'] = 'Silver'
        elif tc >= 25:
            u['badge'] = 'Bronze'
        else:
            u['badge'] = 'Standard'

    return jsonify({'success': True, 'users': users_list})

@app.route('/api/admin/collectors', methods=['GET'])
def get_admin_collectors():
    conn = get_db()
    cursor = conn.cursor()

    # Employees: collector details in form of table
    cursor.execute('''
        SELECT col.id, col.unique_id, col.name, col.gender, col.phone, col.email, 
               col.assigned_area, col.coins, col.created_at,
               COUNT(c.id) as assigned_tasks,
               SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) as resolved_tasks
        FROM collectors col
        LEFT JOIN complaints c ON col.id = c.collector_id OR col.assigned_area = c.area
        GROUP BY col.id
        ORDER BY col.id ASC
    ''')
    collectors_list = [dict(row) for row in cursor.fetchall()]
    conn.close()

    for col in collectors_list:
        assigned = col['assigned_tasks'] or 0
        resolved = col['resolved_tasks'] or 0
        col['performance_rate'] = round((resolved / assigned * 100), 1) if assigned > 0 else 100.0

    return jsonify({'success': True, 'collectors': collectors_list})

# ----------------- SYSTEM & SEED HELPERS -----------------

@app.route('/api/areas', methods=['GET'])
def list_areas():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM areas ORDER BY name ASC")
    areas = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify({'success': True, 'areas': areas})

if __name__ == '__main__':
    print("CleanPulse Waste Management System starting on http://localhost:5000 ...")
    app.run(host='0.0.0.0', port=5000, debug=True)
