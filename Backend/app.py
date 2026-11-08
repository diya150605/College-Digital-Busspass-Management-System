from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pymysql
import random
import string
import os
import re
import requests
import smtplib
import ssl
import qrcode
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from dotenv import load_dotenv
from twilio.rest import Client

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)  # Enable CORS for all routes

# Store pending registrations (temp data before OTP verification)
pending_registrations = {}

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


def send_otp_email(email, otp):
    brevo_api_key = os.getenv('BREVO_API_KEY')
    brevo_sender_email = os.getenv('BREVO_SENDER_EMAIL', 'no-reply@guni.example.com')
    brevo_sender_name = os.getenv('BREVO_SENDER_NAME', 'GUNI DigiPass')

    html_content = f"""
                <html>
                <body>
                    <h2>Your GUNI DigiPass OTP</h2>
                    <p>Hello Student,</p>
                    <p>Your One-Time Password (OTP) for GUNI DigiPass is:</p>
                    <h1 style="color: #1f4b93; font-size: 32px; letter-spacing: 5px;">{otp}</h1>
                    <p>This OTP is valid for 10 minutes. Please do not share it with anyone.</p>
                    <p>If you didn't request this OTP, please ignore this email.</p>
                    <br>
                    <p>Best regards,<br>GUNI DigiPass Team</p>
                </body>
                </html>
                """
    text_content = f"Your OTP for GUNI DigiPass is {otp}. This OTP is valid for 10 minutes."

    if brevo_api_key:
        try:
            url = "https://api.brevo.com/v3/smtp/email"
            headers = {
                "accept": "application/json",
                "api-key": brevo_api_key,
                "X-Mailin-api-key": brevo_api_key,
                "content-type": "application/json"
            }
            payload = {
                "sender": {
                    "name": brevo_sender_name,
                    "email": brevo_sender_email
                },
                "to": [{"email": email}],
                "subject": "Your GUNI DigiPass OTP",
                "htmlContent": html_content,
                "textContent": text_content
            }

            response = requests.post(url, json=payload, headers=headers)
            if response.status_code in (200, 201, 202):
                print(f"OTP sent to {email} via Brevo")
                return True
            else:
                print(f"Failed to send OTP via Brevo: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"Failed to send OTP email via Brevo: {e}")

    smtp_host = os.getenv('SMTP_HOST')
    smtp_port = int(os.getenv('SMTP_PORT', '587'))
    smtp_user = os.getenv('SMTP_USER')
    smtp_password = os.getenv('SMTP_PASSWORD')
    smtp_use_tls = os.getenv('SMTP_USE_TLS', 'true').lower() in ['true', '1', 'yes']
    smtp_use_ssl = os.getenv('SMTP_USE_SSL', 'false').lower() in ['true', '1', 'yes']
    smtp_sender_email = os.getenv('SMTP_FROM_EMAIL', brevo_sender_email)
    smtp_sender_name = os.getenv('SMTP_FROM_NAME', brevo_sender_name)

    if smtp_host and smtp_user and smtp_password:
        try:
            message = MIMEMultipart('alternative')
            message['Subject'] = 'Your GUNI DigiPass OTP'
            message['From'] = f"{smtp_sender_name} <{smtp_sender_email}>"
            message['To'] = email

            part1 = MIMEText(text_content, 'plain')
            part2 = MIMEText(html_content, 'html')
            message.attach(part1)
            message.attach(part2)

            if smtp_use_ssl:
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(smtp_host, smtp_port, context=context) as server:
                    server.login(smtp_user, smtp_password)
                    server.sendmail(smtp_sender_email, email, message.as_string())
            else:
                with smtplib.SMTP(smtp_host, smtp_port) as server:
                    if smtp_use_tls:
                        server.starttls(context=ssl.create_default_context())
                    server.login(smtp_user, smtp_password)
                    server.sendmail(smtp_sender_email, email, message.as_string())
            print(f"OTP sent to {email} via SMTP")
            return True
        except Exception as e:
            print(f"Failed to send OTP email via SMTP: {e}")

    print(f"OTP for {email}: {otp}")
    return False

def send_confirmation_email(email, student_name, pass_id):
    brevo_api_key = os.getenv('BREVO_API_KEY')
    brevo_sender_email = os.getenv('BREVO_SENDER_EMAIL', 'no-reply@guni.example.com')
    brevo_sender_name = os.getenv('BREVO_SENDER_NAME', 'GUNI DigiPass')

    if brevo_api_key:
        try:
            url = "https://api.brevo.com/v3/smtp/email"
            headers = {
                "accept": "application/json",
                "api-key": brevo_api_key,
                "X-Mailin-api-key": brevo_api_key,
                "content-type": "application/json"
            }
            payload = {
                "sender": {
                    "name": brevo_sender_name,
                    "email": brevo_sender_email
                },
                "to": [{"email": email}],
                "subject": "GUNI DigiPass Application Submitted Successfully",
                "htmlContent": f"""
                <html>
                <body>
                    <h2>Application Submitted Successfully</h2>
                    <p>Dear {student_name},</p>
                    <p>Your bus pass application has been successfully submitted. Your application is now pending approval.</p>
                    <p><strong>Pass ID:</strong> {pass_id}</p>
                    <p>Your pass will be processed within 2-3 business days. You will receive a notification once your pass is approved.</p>
                    <p>If you have any questions, please contact the Transportation Department.</p>
                    <br>
                    <p>Best regards,<br>GUNI DigiPass Team</p>
                </body>
                </html>
                """,
                "textContent": f"Dear {student_name}, Your bus pass application has been submitted. Pass ID: {pass_id}. Your pass will be processed within 2-3 business days."
            }

            response = requests.post(url, json=payload, headers=headers)
            if response.status_code in (200, 201, 202):
                print(f"Confirmation email sent to {email}")
                return True
            else:
                print(f"Failed to send confirmation email: {response.status_code}")
                return False
        except Exception as e:
            print(f"Failed to send confirmation email: {e}")
            return False
    else:
        print(f"Brevo API key not configured - confirmation not sent to {email}")
        return False


def send_pass_approved_email(email, student_name, pass_id):
    brevo_api_key = os.getenv('BREVO_API_KEY')
    brevo_sender_email = os.getenv('BREVO_SENDER_EMAIL', 'no-reply@guni.example.com')
    brevo_sender_name = os.getenv('BREVO_SENDER_NAME', 'GUNI DigiPass')

    if brevo_api_key:
        try:
            url = "https://api.brevo.com/v3/smtp/email"
            headers = {
                "accept": "application/json",
                "api-key": brevo_api_key,
                "X-Mailin-api-key": brevo_api_key,
                "content-type": "application/json"
            }
            payload = {
                "sender": {
                    "name": brevo_sender_name,
                    "email": brevo_sender_email
                },
                "to": [{"email": email}],
                "subject": "Your GUNI DigiPass has been approved",
                "htmlContent": f"""
                <html>
                <body>
                    <h2>GUNI DigiPass Approved</h2>
                    <p>Dear {student_name},</p>
                    <p>Great news! Your bus pass application has been approved.</p>
                    <p><strong>Pass ID:</strong> {pass_id}</p>
                    <p>You can now download your pass from the DigiPass dashboard.</p>
                    <p>If you need help, please contact the Transportation Department.</p>
                    <br>
                    <p>Best regards,<br>GUNI DigiPass Team</p>
                </body>
                </html>
                """,
                "textContent": f"Dear {student_name}, Your bus pass application has been approved. Pass ID: {pass_id}."
            }

            response = requests.post(url, json=payload, headers=headers)
            if response.status_code in (200, 201, 202):
                print(f"Pass approval email sent to {email}")
                return True
            else:
                print(f"Failed to send pass approval email: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"Failed to send pass approval email: {e}")
            return False
    else:
        print(f"Brevo API key not configured - pass approval email not sent to {email}")
        return False

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
                dept VARCHAR(255),
                otp VARCHAR(6)
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS admins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) UNIQUE,
                password VARCHAR(255),
                name VARCHAR(255),
                email VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS applications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_name VARCHAR(255),
                enrollment VARCHAR(255),
                mobile VARCHAR(255),
                email VARCHAR(255),
                dept VARCHAR(255),
                route_id INT,
                route_title VARCHAR(255),
                fee INT,
                status VARCHAR(255) DEFAULT 'pending',
                pass_id VARCHAR(50) UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (enrollment) REFERENCES users (enrollment)
            )
        """)
        cursor.execute("SHOW COLUMNS FROM applications LIKE 'pass_id'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE applications ADD COLUMN pass_id VARCHAR(50) UNIQUE AFTER status")
        
        # Insert default admin if not exists
        cursor.execute("SELECT * FROM admins WHERE username = 'admin'")
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO admins (username, password, name, email)
                VALUES (%s, %s, %s, %s)
            """, ('admin', 'admin123', 'Administrator', 'admin@guni.ac.in'))
            print('[DB] Default admin user created')
    
    conn.commit()
    conn.close()

def get_db_connection():
    return pymysql.connect(**DB_CONFIG)

# Generate a QR code image file for the given pass ID
def generate_qr_code(pass_id):
    folder = os.path.join(app.root_path, 'static', 'qrcodes')
    os.makedirs(folder, exist_ok=True)

    qr_data = f"http://127.0.0.1:5000/verify_pass/{pass_id}"
    file_path = os.path.join(folder, f"{pass_id}.png")

    img = qrcode.make(qr_data)
    img.save(file_path)

    return file_path

# init_db()  # Commented out to avoid connection on import

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    enrollment = data.get('enrollment')
    name = data.get('name')
    mobile = data.get('mobile')
    email = data.get('email')
    dept = data.get('dept')

    if not all([enrollment, name, mobile, email, dept]):
        return jsonify({'success': False, 'message': 'All fields required'}), 400

    if not re.match(r'^[^\s@]+@gnu\.ac\.in$', email, re.I):
        return jsonify({'success': False, 'message': 'Only @gnu.ac.in college email is accepted'}), 400
    if not enrollment.isdigit():
        return jsonify({'success': False, 'message': 'Enrollment must contain only digits'}), 400
    if not (mobile.isdigit() and len(mobile) == 10):
        return jsonify({'success': False, 'message': 'Enter a valid 10-digit mobile number'}), 400

    # Check if email already exists in users table
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
            existing_user = cursor.fetchone()
        
        if existing_user:
            return jsonify({'success': False, 'message': 'Email already registered. Please login instead.'}), 400
    finally:
        if conn:
            conn.close()

    # Generate OTP
    otp = ''.join(random.choices(string.digits, k=6))
    
    # Store registration data temporarily (before OTP verification)
    pending_registrations[email] = {
        'enrollment': enrollment,
        'name': name,
        'mobile': mobile,
        'email': email,
        'dept': dept,
        'otp': otp
    }
    
    print(f'[Registration] Stored pending registration for {email}: {pending_registrations[email]}')
    
    # Send OTP via email or SMTP
    if send_otp_email(email, otp):
        return jsonify({'success': True, 'message': f'OTP sent to {email}. Check your college inbox or spam folder. Please verify your OTP to complete registration.'})
    elif mobile and send_otp_sms(mobile, otp):
        return jsonify({'success': True, 'message': f'OTP sent via SMS to {mobile}. Please verify the OTP.'})
    else:
        return jsonify({'success': False, 'message': 'OTP could not be sent. Please check mail/SMS settings or contact support.'}), 500

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')

    if not email:
        return jsonify({'success': False, 'message': 'College email required'}), 400
    if not re.match(r'^[^\s@]+@gnu\.ac\.in$', email, re.I):
        return jsonify({'success': False, 'message': 'Only @gnu.ac.in college email is accepted'}), 400

    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
            user = cursor.fetchone()
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        otp = ''.join(random.choices(string.digits, k=6))
        with conn.cursor() as cursor:
            cursor.execute("UPDATE users SET otp = %s WHERE email = %s", (otp, email))
        conn.commit()
        # Send OTP via email or SMTP
        if send_otp_email(email, otp):
            return jsonify({'success': True, 'message': f'OTP sent to {email}. Check your college inbox or spam folder.'})
        elif user.get('mobile') and send_otp_sms(user['mobile'], otp):
            return jsonify({'success': True, 'message': f"OTP sent via SMS to {user['mobile']}. Please verify the OTP."})
        else:
            return jsonify({'success': False, 'message': 'OTP could not be sent. Please check mail/SMS settings or contact support.'}), 500
    finally:
        conn.close()

@app.route('/verify_otp', methods=['POST'])
def verify_otp():
    data = request.json
    email = data.get('email')
    otp = data.get('otp')

    if not all([email, otp]):
        return jsonify({'success': False, 'message': 'Email and OTP required'}), 400

    # Check if this is a pending registration
    if email in pending_registrations:
        pending = pending_registrations[email]
        if pending['otp'] == otp:
            # OTP is correct, now insert user into database
            try:
                conn = get_db_connection()
                with conn.cursor() as cursor:
                    cursor.execute("""
                        INSERT INTO users (enrollment, name, mobile, email, dept)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (pending['enrollment'], pending['name'], pending['mobile'], pending['email'], pending['dept']))
                conn.commit()
                print(f'[Registration] User inserted for {email}')
                # Remove from pending registrations
                del pending_registrations[email]
                # Fetch the inserted user to return complete user object
                with conn.cursor() as cursor:
                    cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
                    user_data = cursor.fetchone()
                print(f'[Registration] Returning user data: {user_data}')
                return jsonify({'success': True, 'message': 'Registration successful. Redirecting...', 'user': user_data})
            except pymysql.IntegrityError as e:
                error_text = str(e)
                if 'Duplicate entry' in error_text:
                    if 'enrollment' in error_text.lower():
                        return jsonify({'success': False, 'message': 'Enrollment number already registered'}), 400
                    elif 'mobile' in error_text.lower():
                        return jsonify({'success': False, 'message': 'Mobile number already registered'}), 400
                return jsonify({'success': False, 'message': 'Registration failed'}), 400
            finally:
                if conn:
                    conn.close()
        else:
            return jsonify({'success': False, 'message': 'Invalid OTP'}), 400
    else:
        # Handle existing user login
        try:
            conn = get_db_connection()
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM users WHERE email = %s AND otp = %s", (email, otp))
                user = cursor.fetchone()
            if user:
                # Clear OTP after verification
                with conn.cursor() as cursor:
                    cursor.execute("UPDATE users SET otp = NULL WHERE email = %s", (email,))
                conn.commit()
                return jsonify({'success': True, 'message': 'Login successful', 'user': user})
            else:
                return jsonify({'success': False, 'message': 'Invalid OTP'}), 400
        finally:
            conn.close()

# Admin authentication routes
@app.route('/admin/login', methods=['POST'])
def admin_login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'success': False, 'message': 'Username and password required'}), 400

    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM admins WHERE username = %s AND password = %s", (username, password))
            admin = cursor.fetchone()
        
        if admin:
            print(f'[AdminAuth] Login successful for admin: {username}')
            return jsonify({
                'success': True,
                'message': 'Admin login successful',
                'admin': admin
            })
        else:
            print(f'[AdminAuth] Login failed for admin: {username}')
            return jsonify({'success': False, 'message': 'Invalid credentials'}), 401
    except Exception as e:
        print(f'[AdminAuth] Error: {e}')
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()

@app.route('/admin/profile', methods=['GET'])
def get_admin_profile():
    admin_id = request.args.get('id')
    if not admin_id:
        return jsonify({'success': False, 'message': 'Admin ID required'}), 400

    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, username, name, email, created_at FROM admins WHERE id = %s", (admin_id,))
            admin = cursor.fetchone()
        
        if admin:
            return jsonify({'success': True, 'admin': admin})
        else:
            return jsonify({'success': False, 'message': 'Admin not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()

# Admin routes
@app.route('/admin/stats', methods=['GET'])
def get_admin_stats():
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # Get total users
            cursor.execute("SELECT COUNT(*) as count FROM users")
            total_users = cursor.fetchone()['count']
            
            # Get application stats
            cursor.execute("SELECT COUNT(*) as count FROM applications")
            total_apps = cursor.fetchone()['count']
            
            cursor.execute("SELECT COUNT(*) as count FROM applications WHERE status = 'approved'")
            approved_apps = cursor.fetchone()['count']
            
            cursor.execute("SELECT COUNT(*) as count FROM applications WHERE status = 'pending'")
            pending_apps = cursor.fetchone()['count']
            
            cursor.execute("SELECT COUNT(*) as count FROM applications WHERE status = 'rejected'")
            rejected_apps = cursor.fetchone()['count']
            
            # Get total revenue from approved applications
            cursor.execute("SELECT SUM(fee) as total FROM applications WHERE status = 'approved'")
            revenue_result = cursor.fetchone()
            total_revenue = revenue_result['total'] if revenue_result['total'] else 0
        
        return jsonify({
            'total_users': total_users,
            'total_applications': total_apps,
            'approved_applications': approved_apps,
            'pending_applications': pending_apps,
            'rejected_applications': rejected_apps,
            'total_revenue': total_revenue
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

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
            if status == 'approved':
                cursor.execute("SELECT student_name, email FROM applications WHERE id = %s", (app_id,))
                application = cursor.fetchone()
                if not application:
                    return jsonify({'success': False, 'message': 'Application not found'}), 404

                # Generate a unique pass_id when application is approved
                pass_id = f"BP-{datetime.now().year}-{random.randint(100000, 999999)}"
                cursor.execute("UPDATE applications SET status = %s, pass_id = %s WHERE id = %s", (status, pass_id, app_id))
                conn.commit()

                try:
                    generate_qr_code(pass_id)
                except Exception as qr_err:
                    print(f"Failed to generate QR code: {qr_err}")

                try:
                    send_pass_approved_email(application['email'], application['student_name'], pass_id)
                except Exception as email_err:
                    print(f"Failed to send approval email: {email_err}")

                return jsonify({'success': True, 'message': f'Application {status}', 'pass_id': pass_id})
            else:
                cursor.execute("UPDATE applications SET status = %s WHERE id = %s", (status, app_id))
                conn.commit()
                return jsonify({'success': True, 'message': f'Application {status}'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()

@app.route('/admin/applications/<int:app_id>', methods=['DELETE'])
def delete_application(app_id):
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT pass_id FROM applications WHERE id = %s", (app_id,))
            row = cursor.fetchone()
            if not row:
                return jsonify({'success': False, 'message': 'Application not found'}), 404
            pass_id = row.get('pass_id')
            cursor.execute("DELETE FROM applications WHERE id = %s", (app_id,))
        conn.commit()

        if pass_id:
            qr_path = os.path.join(app.root_path, 'static', 'qrcodes', f"{pass_id}.png")
            try:
                if os.path.exists(qr_path):
                    os.remove(qr_path)
            except Exception as qr_err:
                print(f"Warning: failed to remove QR file {qr_path}: {qr_err}")

        return jsonify({'success': True, 'message': 'Application deleted successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()

@app.route('/verify_pass/<pass_id>', methods=['GET'])
def verify_pass(pass_id):
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM applications WHERE pass_id = %s", (pass_id,))
            app_data = cursor.fetchone()

        if app_data:
            return jsonify({
                "success": True,
                "message": "Pass verified successfully",
                "data": app_data
            })
        else:
            return jsonify({
                "success": False,
                "message": "Invalid pass ID"
            }), 404
    finally:
        conn.close()

@app.route('/student/application', methods=['GET'])
def get_student_application():
    enrollment = request.args.get('enrollment')
    if not enrollment:
        return jsonify({'success': False, 'message': 'Enrollment required'}), 400

    print(f'[StudentApp] Fetching application for enrollment: {enrollment}')
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM applications WHERE enrollment = %s ORDER BY created_at DESC LIMIT 1", (enrollment,))
            app_data = cursor.fetchone()
            if not app_data:
                print(f'[StudentApp] No application found for enrollment: {enrollment}')
                return jsonify({'success': False, 'message': 'Application not found'}), 404

            cursor.execute("SELECT name, email, mobile, dept FROM users WHERE enrollment = %s", (enrollment,))
            user_data = cursor.fetchone() or {}

        print(f'[StudentApp] Found application: {app_data}')
        return jsonify({
            'success': True,
            'application': app_data,
            'user': user_data
        })
    except Exception as e:
        print(f'[StudentApp] Error: {e}')
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()

# Reports routes
@app.route('/reports')
def reports_page():
    return send_from_directory('.', 'reports.html')


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

        # Get all department counts from registration users
        with conn.cursor() as cursor:
            cursor.execute("SELECT dept, COUNT(*) as count FROM users GROUP BY dept ORDER BY count DESC")
            user_dept_counts = cursor.fetchall()

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
        charts = generate_chart_data(applications, report_type, user_dept_counts)

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

def generate_chart_data(applications, report_type, user_dept_counts=None):
    def safe_date_label(created_at):
        if isinstance(created_at, str):
            return created_at[:7]
        return created_at.strftime('%Y-%m')

    # Build route chart from application records
    route_data = {}
    for app in applications:
        route_title = app.get('route_title') or 'Unknown Route'
        route = route_title if len(route_title) <= 20 else route_title[:20] + '...'
        route_data[route] = route_data.get(route, 0) + 1

    # Build department chart from registration data when available
    def normalize_department(name):
        if not name:
            return 'Unknown'
        normalized = name.strip()
        if normalized.lower() == 'computer engineer':
            return 'Computer Engineering'
        return normalized

    dept_data = {}
    if user_dept_counts:
        for row in user_dept_counts:
            dept_name = normalize_department(row.get('dept'))
            dept_data[dept_name] = dept_data.get(dept_name, 0) + row.get('count', 0)
    else:
        for app in applications:
            dept = normalize_department(app.get('dept'))
            dept_data[dept] = dept_data.get(dept, 0) + 1

    if report_type == 'monthly':
        monthly_data = {}
        for app in applications:
            month = safe_date_label(app.get('created_at'))
            monthly_data[month] = monthly_data.get(month, 0) + 1

        labels = sorted(monthly_data.keys())
        data = [monthly_data[label] for label in labels]
        main_chart = {
            'title': 'Applications Over Time',
            'labels': labels,
            'data': data
        }

    elif report_type == 'department':
        main_chart = {
            'title': 'Applications by Department',
            'labels': list(dept_data.keys()),
            'data': list(dept_data.values())
        }

    elif report_type == 'routes':
        main_chart = {
            'title': 'Route Popularity',
            'labels': list(route_data.keys()),
            'data': list(route_data.values())
        }

    else:
        status_data = {'approved': 0, 'pending': 0, 'rejected': 0}
        for app in applications:
            status = app.get('status') or 'pending'
            status_data[status] = status_data.get(status, 0) + 1

        main_chart = {
            'title': 'Application Status Overview',
            'labels': ['Approved', 'Pending', 'Rejected'],
            'data': [status_data['approved'], status_data['pending'], status_data['rejected']]
        }

    return {
        'main': main_chart,
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

    required_fields = ['student_name', 'enrollment', 'mobile', 'email', 'dept', 'route_id', 'route_title', 'fee']
    if not all(field in data for field in required_fields):
        return jsonify({'success': False, 'message': 'Missing required fields'}), 400

    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO applications (student_name, enrollment, mobile, email, dept, route_id, route_title, fee)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                data['student_name'], data['enrollment'], data['mobile'], data['email'],
                data['dept'], data['route_id'], data['route_title'], data['fee']
            ))
        conn.commit()
        return jsonify({'success': True, 'message': 'Application submitted successfully'})
    except pymysql.IntegrityError:
        return jsonify({'success': False, 'message': 'Application already exists'}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        conn.close()

@app.route('/send_confirmation_email', methods=['POST'])
def send_confirmation():
    data = request.json
    email = data.get('email')
    student_name = data.get('student_name')
    pass_id = data.get('pass_id', 'N/A')
    
    if not email or not student_name:
        return jsonify({'success': False, 'message': 'Email and name required'}), 400
    
    result = send_confirmation_email(email, student_name, pass_id)
    return jsonify({'success': result, 'message': 'Confirmation email sent' if result else 'Failed to send email'})

# Serve HTML pages
@app.route('/')
def home_page():
    return send_from_directory('.', 'homepage.html')

@app.route('/dashboard')
def dashboard_page():
    return send_from_directory('.', 'dashboard.html')

@app.route('/digipass')
def digipass_page():
    return send_from_directory('.', 'digipass.html')

@app.route('/applypass')
def applypass_page():
    return send_from_directory('.', 'applypass.html')

@app.route('/admin')
def admin_page():
    return send_from_directory('.', 'admin.html')

if __name__ == '__main__':
    # Initialize database when running the app
    try:
        init_db()
        print("Database initialized successfully")
    except Exception as e:
        print(f"Database initialization failed: {e}")
        print("Make sure MySQL is running and the database exists")
    
    app.run(debug=True)