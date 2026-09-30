import sqlite3
import os
import random
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), 'cleanpulse.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            unique_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            age INTEGER,
            area TEXT NOT NULL,
            email TEXT UNIQUE,
            phone TEXT UNIQUE NOT NULL,
            gender TEXT,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Collectors table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS collectors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            unique_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            gender TEXT,
            phone TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            assigned_area TEXT NOT NULL,
            password TEXT NOT NULL,
            coins INTEGER DEFAULT 0,
            daily_reward_claimed_date TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Admin table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS admin (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            unique_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    ''')

    # Complaints table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS complaints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tracking_id TEXT UNIQUE NOT NULL,
            user_id INTEGER NOT NULL,
            user_name TEXT NOT NULL,
            user_phone TEXT NOT NULL,
            area TEXT NOT NULL,
            description TEXT NOT NULL,
            complaint_image TEXT,
            status TEXT DEFAULT 'Pending',
            created_at TEXT NOT NULL,
            deadline_at TEXT NOT NULL,
            collector_id INTEGER,
            collector_name TEXT,
            resolved_at TEXT,
            resolution_image TEXT,
            resolution_notes TEXT,
            user_notified INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (collector_id) REFERENCES collectors(id)
        )
    ''')

    # Areas table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS areas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            dumping_spots TEXT NOT NULL,
            waste_capacity TEXT NOT NULL,
            cleanup_schedule TEXT NOT NULL
        )
    ''')

    # Notifications table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            complaint_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            proof_image TEXT,
            is_read INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (complaint_id) REFERENCES complaints(id)
        )
    ''')

    conn.commit()
    seed_data(conn)
    conn.close()

def generate_unique_id(prefix):
    return f"{prefix}-{random.randint(10000, 99999)}"

def seed_data(conn):
    cursor = conn.cursor()

    # Seed Admin if not exists
    cursor.execute("SELECT COUNT(*) FROM admin")
    if cursor.fetchone()[0] == 0:
        cursor.execute('''
            INSERT INTO admin (unique_id, name, email, phone, password)
            VALUES (?, ?, ?, ?, ?)
        ''', ('ADM-001', 'Chief Sanitation Director', 'admin@cleanwaste.com', '9999999999', 'admin123'))

    # Seed Areas if not exists
    cursor.execute("SELECT COUNT(*) FROM areas")
    if cursor.fetchone()[0] == 0:
        areas_data = [
            ("Downtown", "Sector 4 Central Bin, Metro Pillar 18 Dumping Point, Old Market Alley Corner", "12 Tons/Day", "Daily at 06:00 AM & 04:00 PM"),
            ("Green Valley", "Parkview Avenue Waste Enclosure, Eco-Bin Station 3", "6 Tons/Day", "Mon, Wed, Fri at 07:30 AM"),
            ("Riverbank", "Riverside Promenade Dump Site 1, Wharf Road Collection Point", "15 Tons/Day", "Daily at 05:30 AM & 02:00 PM"),
            ("North Ward", "Civic Center Dumpster Yard, High School Lane Secondary Spot", "8 Tons/Day", "Daily at 07:00 AM"),
            ("Market Square", "Wholesale Produce Waste Bin 1-4, Commercial Lane Compactor", "20 Tons/Day", "Twice Daily at 05:00 AM & 08:00 PM"),
            ("West End", "Suburban Crossway Bin 12, West Hills Community Dumpster", "5 Tons/Day", "Tue, Thu, Sat at 08:00 AM"),
            ("Metro Hub", "Transit Terminal Dump Zone A & B, Underpass Bin 9", "18 Tons/Day", "Daily continuous pickup (Every 6 hrs)"),
            ("South Ridge", "Hilltop Viewpoint Waste Receptacle, Valley Road Dump Site", "4 Tons/Day", "Every alternate day at 09:00 AM")
        ]
        cursor.executemany('''
            INSERT INTO areas (name, dumping_spots, waste_capacity, cleanup_schedule)
            VALUES (?, ?, ?, ?)
        ''', areas_data)

    # Seed Collectors if not exists
    cursor.execute("SELECT COUNT(*) FROM collectors")
    if cursor.fetchone()[0] == 0:
        collectors_data = [
            ('COL-41092', 'Rajesh Sharma', 'Male', '9876543210', 'rajesh.collector@cleanwaste.com', 'Downtown', 'col123', 8),
            ('COL-72314', 'Anita Deshmukh', 'Female', '9876543211', 'anita.collector@cleanwaste.com', 'Green Valley', 'col123', 14),
            ('COL-18593', 'Vikram Singh', 'Male', '9876543212', 'vikram.collector@cleanwaste.com', 'Riverbank', 'col123', 5),
            ('COL-39401', 'Pooja Verma', 'Female', '9876543213', 'pooja.collector@cleanwaste.com', 'North Ward', 'col123', 19),
            ('COL-65239', 'Manoj Kumar', 'Male', '9876543214', 'manoj.collector@cleanwaste.com', 'Market Square', 'col123', 22),
            ('COL-88210', 'Sunita Rao', 'Female', '9876543215', 'sunita.collector@cleanwaste.com', 'West End', 'col123', 11),
            ('COL-53109', 'Deepak Patel', 'Male', '9876543216', 'deepak.collector@cleanwaste.com', 'Metro Hub', 'col123', 16),
            ('COL-94028', 'Kavita Joshi', 'Female', '9876543217', 'kavita.collector@cleanwaste.com', 'South Ridge', 'col123', 7)
        ]
        cursor.executemany('''
            INSERT INTO collectors (unique_id, name, gender, phone, email, assigned_area, password, coins)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', collectors_data)

    # Seed Users if not exists
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        users_data = [
            ('USR-29481', 'Aarav Mehta', 28, 'Downtown', 'aarav.mehta@example.com', '9123456780', 'Male', 'user123'),
            ('USR-58291', 'Priya Nair', 34, 'Market Square', 'priya.nair@example.com', '9123456781', 'Female', 'user123'),
            ('USR-81934', 'Rohan Gupta', 24, 'Green Valley', 'rohan.gupta@example.com', '9123456782', 'Male', 'user123'),
            ('USR-64102', 'Sneha Kulkarni', 31, 'Riverbank', 'sneha.k@example.com', '9123456783', 'Female', 'user123'),
            ('USR-73921', 'Arjun Kapoor', 42, 'North Ward', 'arjun.k@example.com', '9123456784', 'Male', 'user123')
        ]
        cursor.executemany('''
            INSERT INTO users (unique_id, name, age, area, email, phone, gender, password)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', users_data)

    # Seed Sample Complaints if empty
    cursor.execute("SELECT COUNT(*) FROM complaints")
    if cursor.fetchone()[0] == 0:
        now = datetime.now()
        
        # Sample images (SVG data URIs or realistic photo placeholders)
        waste_svg_1 = "https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=600&auto=format&fit=crop&q=60"
        waste_svg_2 = "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600&auto=format&fit=crop&q=60"
        waste_svg_3 = "https://images.unsplash.com/photo-1528323273322-d81458248d40?w=600&auto=format&fit=crop&q=60"
        clean_svg_1 = "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=600&auto=format&fit=crop&q=60"
        clean_svg_2 = "https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=600&auto=format&fit=crop&q=60"

        # Complaint 1: In progress / Pending in Downtown (Aarav Mehta)
        c1_time = (now - timedelta(hours=14)).isoformat()
        c1_deadline = (now - timedelta(hours=14) + timedelta(hours=48)).isoformat()
        
        # Complaint 2: Resolved in Downtown (Aarav Mehta)
        c2_time = (now - timedelta(hours=36)).isoformat()
        c2_deadline = (now - timedelta(hours=36) + timedelta(hours=48)).isoformat()
        c2_resolved = (now - timedelta(hours=12)).isoformat()

        # Complaint 3: Market Square high volume
        c3_time = (now - timedelta(hours=8)).isoformat()
        c3_deadline = (now - timedelta(hours=8) + timedelta(hours=48)).isoformat()

        # Complaint 4: Market Square pending
        c4_time = (now - timedelta(hours=22)).isoformat()
        c4_deadline = (now - timedelta(hours=22) + timedelta(hours=48)).isoformat()

        # Complaint 5: Market Square pending
        c5_time = (now - timedelta(hours=4)).isoformat()
        c5_deadline = (now - timedelta(hours=4) + timedelta(hours=48)).isoformat()

        # Complaint 6: Riverbank medium
        c6_time = (now - timedelta(hours=18)).isoformat()
        c6_deadline = (now - timedelta(hours=18) + timedelta(hours=48)).isoformat()

        # Complaint 7: Riverbank medium
        c7_time = (now - timedelta(hours=6)).isoformat()
        c7_deadline = (now - timedelta(hours=6) + timedelta(hours=48)).isoformat()

        # Complaint 8: Riverbank medium
        c8_time = (now - timedelta(hours=2)).isoformat()
        c8_deadline = (now - timedelta(hours=2) + timedelta(hours=48)).isoformat()

        # Complaint 9: Green Valley low
        c9_time = (now - timedelta(hours=10)).isoformat()
        c9_deadline = (now - timedelta(hours=10) + timedelta(hours=48)).isoformat()

        # Complaint 10: North Ward low
        c10_time = (now - timedelta(hours=26)).isoformat()
        c10_deadline = (now - timedelta(hours=26) + timedelta(hours=48)).isoformat()

        complaints_data = [
            ('CMP-10492', 1, 'Aarav Mehta', '9123456780', 'Downtown', 
             'Heavy overflow near Sector 4 Central Bin, plastics spilling on main road.', waste_svg_1,
             'Pending', c1_time, c1_deadline, 1, 'Rajesh Sharma', None, None, None, 0),
            
            ('CMP-10385', 1, 'Aarav Mehta', '9123456780', 'Downtown',
             'Construction debris and discarded cartons dumped by commercial shop.', waste_svg_2,
             'Resolved', c2_time, c2_deadline, 1, 'Rajesh Sharma', c2_resolved, clean_svg_1,
             'Sanitation crew dispatched with dump truck #4. Site washed and cleared.', 1),

            ('CMP-20941', 2, 'Priya Nair', '9123456781', 'Market Square',
             'Rotting vegetable waste piles near wholesale entrance creating foul odor.', waste_svg_3,
             'Pending', c3_time, c3_deadline, 5, 'Manoj Kumar', None, None, None, 0),

            ('CMP-20942', 2, 'Priya Nair', '9123456781', 'Market Square',
             'Discarded wooden pallets and wet organic waste blocking pedestrian walkway.', waste_svg_1,
             'Pending', c4_time, c4_deadline, 5, 'Manoj Kumar', None, None, None, 0),

            ('CMP-20943', 2, 'Priya Nair', '9123456781', 'Market Square',
             'Commercial garbage compactor overflow near gate 3.', waste_svg_2,
             'Pending', c5_time, c5_deadline, 5, 'Manoj Kumar', None, None, None, 0),

            ('CMP-20944', 2, 'Priya Nair', '9123456781', 'Market Square',
             'Multiple plastic bags scattered after morning market unload.', waste_svg_3,
             'Pending', c3_time, c3_deadline, 5, 'Manoj Kumar', None, None, None, 0),

            ('CMP-20945', 2, 'Priya Nair', '9123456781', 'Market Square',
             'Animal scavengers tearing trash bags outside stall 14.', waste_svg_1,
             'Pending', c4_time, c4_deadline, 5, 'Manoj Kumar', None, None, None, 0),

            ('CMP-20946', 2, 'Priya Nair', '9123456781', 'Market Square',
             'Uncollected fish market wet waste leaking onto asphalt.', waste_svg_2,
             'Pending', c5_time, c5_deadline, 5, 'Manoj Kumar', None, None, None, 0),

            ('CMP-40182', 4, 'Sneha Kulkarni', '9123456783', 'Riverbank',
             'Trash pile left behind along river promenade near Wharf Road.', waste_svg_1,
             'Pending', c6_time, c6_deadline, 3, 'Vikram Singh', None, None, None, 0),

            ('CMP-40183', 4, 'Sneha Kulkarni', '9123456783', 'Riverbank',
             'Plastic bottles and polystyrene packaging floating near drain outlet.', waste_svg_2,
             'Pending', c7_time, c7_deadline, 3, 'Vikram Singh', None, None, None, 0),

            ('CMP-40184', 4, 'Sneha Kulkarni', '9123456783', 'Riverbank',
             'Illegal dumping of residential sacks behind picnic gazebo.', waste_svg_3,
             'Pending', c8_time, c8_deadline, 3, 'Vikram Singh', None, None, None, 0),

            ('CMP-30112', 3, 'Rohan Gupta', '9123456782', 'Green Valley',
             'Fallen tree branches and scattered dry yard waste near Parkview Ave.', waste_svg_1,
             'Pending', c9_time, c9_deadline, 2, 'Anita Deshmukh', None, None, None, 0),

            ('CMP-50211', 5, 'Arjun Kapoor', '9123456784', 'North Ward',
             'Single overflowing metal bin at High School Lane.', waste_svg_3,
             'Pending', c10_time, c10_deadline, 4, 'Pooja Verma', None, None, None, 0)
        ]

        cursor.executemany('''
            INSERT INTO complaints (
                tracking_id, user_id, user_name, user_phone, area, description, complaint_image,
                status, created_at, deadline_at, collector_id, collector_name, resolved_at,
                resolution_image, resolution_notes, user_notified
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', complaints_data)

        # Seed initial notification for user 1 regarding resolved complaint #CMP-10385
        cursor.execute('''
            INSERT INTO notifications (user_id, complaint_id, title, message, proof_image, is_read, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (1, 2, 'Task Completed: CMP-10385', 
              'Your reported complaint at Downtown has been cleared by collector Rajesh Sharma.', 
              clean_svg_1, 0, c2_resolved))

    conn.commit()

if __name__ == '__main__':
    init_db()
    print("Database initialized successfully.")
