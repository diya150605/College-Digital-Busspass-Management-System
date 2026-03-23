from flask import Flask, request, jsonify
from flask_cors import CORS
import pymysql
import random
import string
import os
from twilio.rest import Client

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# MySQL database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',  # Default WampServer password is empty
    'database': 'digipass',
    'cursorclass': pymysql.cursors.DictCursor
}

# Twilio setup
account_sid = os.getenv('TWILIO_ACCOUNT_SID')
auth_token = os.getenv('TWILIO_AUTH_TOKEN')
twilio_number = os.getenv('TWILIO_PHONE_NUMBER')
client = Client(account_sid, auth_token) if account_sid and auth_token and twilio_number else None

def send_otp_sms(mobile, otp):
    if client:
        try:
            message = client.messages.create(
                body=f"Your OTP for GUNI DigiPass is {otp}",
                from_=twilio_number,
                to=f'+91{mobile}'  # Assuming Indian numbers
            )
            print(f"OTP sent to {mobile}")
            return True
        except Exception as e:
            print(f"Failed to send OTP: {e}")
            return False
    else:
        print(f"OTP for {mobile}: {otp}")  # Fallback to console
        return True

# Create database and table if not exists
def init_db():
    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                enrollment VARCHAR(255) UNIQUE,
                name VARCHAR(255),
                mobile VARCHAR(255) UNIQUE,
                email VARCHAR(255),
                aadhaar VARCHAR(255) UNIQUE,
                dept VARCHAR(255),
                otp VARCHAR(6)
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS applications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_name VARCHAR(255),
                enrollment VARCHAR(255),
                mobile VARCHAR(255),
                email VARCHAR(255),
                aadhaar VARCHAR(255),
                dept VARCHAR(255),
                route_id INT,
                route_title VARCHAR(255),
                fee INT,
                status VARCHAR(255) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (enrollment) REFERENCES users (enrollment)
            )
        """)
    conn.commit()
    conn.close()

def get_db_connection():
    return pymysql.connect(**DB_CONFIG)

# init_db()  # Commented out to avoid connection on import

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    enrollment = data.get('enrollment')
    name = data.get('name')
    mobile = data.get('mobile')
    email = data.get('email')
    aadhaar = data.get('aadhaar')
    dept = data.get('dept')

    if not all([enrollment, name, mobile, email, aadhaar, dept]):
        return jsonify({'success': False, 'message': 'All fields required'}), 400

    otp = ''.join(random.choices(string.digits, k=6))

    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO users (enrollment, name, mobile, email, aadhaar, dept, otp)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (enrollment, name, mobile, email, aadhaar, dept, otp))
        conn.commit()
        # Send OTP via SMS
        send_otp_sms(mobile, otp)
        return jsonify({'success': True, 'message': 'Signup successful. OTP sent.'})
    except pymysql.IntegrityError as e:
        return jsonify({'success': False, 'message': 'User already exists or invalid data'}), 400
    finally:
        conn.close()

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    mobile = data.get('mobile')

    if not mobile:
        return jsonify({'success': False, 'message': 'Mobile required'}), 400

    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE mobile = %s", (mobile,))
            user = cursor.fetchone()
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        otp = ''.join(random.choices(string.digits, k=6))
        with conn.cursor() as cursor:
            cursor.execute("UPDATE users SET otp = %s WHERE mobile = %s", (otp, mobile))
        conn.commit()
        # Send OTP via SMS
        send_otp_sms(mobile, otp)
        return jsonify({'success': True, 'message': 'OTP sent'})
    finally:
        conn.close()

@app.route('/verify_otp', methods=['POST'])
def verify_otp():
    data = request.json
    mobile = data.get('mobile')
    otp = data.get('otp')

    if not all([mobile, otp]):
        return jsonify({'success': False, 'message': 'Mobile and OTP required'}), 400

    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE mobile = %s AND otp = %s", (mobile, otp))
            user = cursor.fetchone()
        if user:
            # Clear OTP after verification
            with conn.cursor() as cursor:
                cursor.execute("UPDATE users SET otp = NULL WHERE mobile = %s", (mobile,))
            conn.commit()
            return jsonify({'success': True, 'message': 'Login successful', 'user': user})
        else:
            return jsonify({'success': False, 'message': 'Invalid OTP'}), 400
    finally:
        conn.close()

# Admin routes
@app.route('/admin/applications', methods=['GET'])
def get_applications():
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT a.*, u.name as student_name
                FROM applications a
                LEFT JOIN users u ON a.enrollment = u.enrollment
                ORDER BY a.created_at DESC
            """)
            applications = cursor.fetchall()
        return jsonify(applications)
    finally:
        conn.close()

@app.route('/admin/applications/<int:app_id>/status', methods=['PUT'])
def update_application_status(app_id):
    data = request.json
    status = data.get('status')

    if status not in ['pending', 'approved', 'rejected']:
        return jsonify({'success': False, 'message': 'Invalid status'}), 400

    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("UPDATE applications SET status = %s WHERE id = %s", (status, app_id))
        conn.commit()
        return jsonify({'success': True, 'message': f'Application {status}'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()

# Reports routes
@app.route('/reports/data', methods=['GET'])
def get_reports_data():
    report_type = request.args.get('type', 'overview')
    time_period = request.args.get('period', 'all')
    status_filter = request.args.get('status', 'all')

    try:
        conn = get_db_connection()

        # Build WHERE clause based on filters
        where_conditions = []
        params = []

        if status_filter != 'all':
            where_conditions.append("a.status = %s")
            params.append(status_filter)

        if time_period != 'all':
            if time_period == 'this-month':
                where_conditions.append("DATE_FORMAT(a.created_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')")
            elif time_period == 'last-month':
                where_conditions.append("DATE_FORMAT(a.created_at, '%Y-%m') = DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH), '%Y-%m')")
            elif time_period == 'this-semester':
                # Assuming semester starts in July
                where_conditions.append("YEAR(a.created_at) = YEAR(NOW()) AND MONTH(a.created_at) >= 7")
            elif time_period == 'last-semester':
                where_conditions.append("YEAR(a.created_at) = YEAR(NOW()) AND MONTH(a.created_at) < 7")

        where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"

        # Get applications
        with conn.cursor() as cursor:
            cursor.execute(f"""
                SELECT a.*, u.name as student_name
                FROM applications a
                LEFT JOIN users u ON a.enrollment = u.enrollment
                WHERE {where_clause}
                ORDER BY a.created_at DESC
            """, params)
            applications = cursor.fetchall()

        # Calculate metrics
        total_apps = len(applications)
        approved_apps = len([app for app in applications if app['status'] == 'approved'])
        revenue = sum(app['fee'] for app in applications if app['status'] == 'approved')

        # Calculate growth rate (comparing to previous period)
        growth_rate = 0
        if time_period == 'this-month':
            # Compare with last month
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT COUNT(*) as count FROM applications
                    WHERE DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH), '%Y-%m')
                """)
                result = cursor.fetchone()
                last_month = result['count'] if result else 0
            if last_month > 0:
                growth_rate = round(((total_apps - last_month) / last_month) * 100, 1)

        # Generate chart data based on report type
        charts = generate_chart_data(applications, report_type)

        return jsonify({
            'applications': applications,
            'metrics': {
                'total': total_apps,
                'approved': approved_apps,
                'revenue': revenue,
                'growth': growth_rate
            },
            'charts': charts
        })

    finally:
        conn.close()

def generate_chart_data(applications, report_type):
    if report_type == 'monthly':
        # Monthly trends
        monthly_data = {}
        for app in applications:
            month = app['created_at'][:7]  # YYYY-MM
            monthly_data[month] = monthly_data.get(month, 0) + 1

        labels = sorted(monthly_data.keys())
        data = [monthly_data[label] for label in labels]

        return {
            'main': {
                'title': 'Monthly Application Trends',
                'labels': labels,
                'data': data
            }
        }

    elif report_type == 'department':
        # Department distribution
        dept_data = {}
        for app in applications:
            dept = app['dept'] or 'Unknown'
            dept_data[dept] = dept_data.get(dept, 0) + 1

        return {
            'main': {
                'title': 'Applications by Department',
                'labels': list(dept_data.keys()),
                'data': list(dept_data.values())
            }
        }

    elif report_type == 'routes':
        # Route popularity
        route_data = {}
        for app in applications:
            route = app['route_title'][:20] + '...' if len(app['route_title']) > 20 else app['route_title']
            route_data[route] = route_data.get(route, 0) + 1

        return {
            'main': {
                'title': 'Route Popularity',
                'labels': list(route_data.keys()),
                'data': list(route_data.values())
            }
        }

    else:  # overview
        # Status distribution
        status_data = {'approved': 0, 'pending': 0, 'rejected': 0}
        for app in applications:
            status_data[app['status']] = status_data.get(app['status'], 0) + 1

        return {
            'main': {
                'title': 'Application Status Overview',
                'labels': ['Approved', 'Pending', 'Rejected'],
                'data': [status_data['approved'], status_data['pending'], status_data['rejected']]
            }
        }

    # Department and route charts (always included)
    dept_data = {}
    route_data = {}

    for app in applications:
        # Department
        dept = app['dept'] or 'Unknown'
        dept_data[dept] = dept_data.get(dept, 0) + 1

        # Route
        route = app['route_title'][:15] + '...' if len(app['route_title']) > 15 else app['route_title']
        route_data[route] = route_data.get(route, 0) + 1

    return {
        'main': {
            'title': 'Applications Overview',
            'labels': ['Approved', 'Pending', 'Rejected'],
            'data': [
                len([app for app in applications if app['status'] == 'approved']),
                len([app for app in applications if app['status'] == 'pending']),
                len([app for app in applications if app['status'] == 'rejected'])
            ]
        },
        'department': {
            'labels': list(dept_data.keys()),
            'data': list(dept_data.values())
        },
        'route': {
            'labels': list(route_data.keys()),
            'data': list(route_data.values())
        }
    }

@app.route('/submit_application', methods=['POST'])
def submit_application():
    data = request.json

    required_fields = ['student_name', 'enrollment', 'mobile', 'email', 'aadhaar', 'dept', 'route_id', 'route_title', 'fee']
    if not all(field in data for field in required_fields):
        return jsonify({'success': False, 'message': 'Missing required fields'}), 400

    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO applications (student_name, enrollment, mobile, email, aadhaar, dept, route_id, route_title, fee)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                data['student_name'], data['enrollment'], data['mobile'], data['email'],
                data['aadhaar'], data['dept'], data['route_id'], data['route_title'], data['fee']
            ))
        conn.commit()
        return jsonify({'success': True, 'message': 'Application submitted successfully'})
    except pymysql.IntegrityError:
        return jsonify({'success': False, 'message': 'Application already exists'}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()

if __name__ == '__main__':
    # Initialize database when running the app
    try:
        init_db()
        print("Database initialized successfully")
    except Exception as e:
        print(f"Database initialization failed: {e}")
        print("Make sure MySQL is running and the database exists")
    
    app.run(debug=True)