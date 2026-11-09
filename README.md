# GUNI DigiPass — College Bus Pass Management System

GUNI DigiPass is a web application for managing college bus-pass applications. Students can register and apply for a pass, check its status, and use the generated QR code for verification. Administrators can review applications, update their status, and view reports.

## Features

- Student registration with OTP verification and student login
- Bus-pass application and application-status tracking
- QR-code generation for approved passes and pass verification
- Admin dashboard with application totals and approve/reject actions
- Application reports and filtering
- Email and SMS OTP integrations (optional; require service credentials)

## Technology

- **Frontend:** HTML, CSS, and JavaScript
- **Backend:** Python, Flask, and Flask-CORS
- **Database:** MySQL
- **Integrations:** QR code generation, Brevo or SMTP email, and Twilio SMS

## Project layout

```text
Backend/
  app.py                 Flask API and server
  create_db.sql          Creates the MySQL database
  kdp.db                 SQLite file in the repository (the app uses MySQL)
Frontend/
  *.html                 Student, admin, verification, and reports pages
  *.css                  Page styles
  *.js                   Frontend behavior and API requests
static/
  qrcodes/               QR-code images
```

## Requirements

- Python 3.9 or later
- MySQL Server
- `pip`

## Setup and run

1. **Create and activate a virtual environment** from the project root:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

2. **Install the Python dependencies:**

   ```powershell
   python -m pip install Flask flask-cors PyMySQL requests qrcode[pil] python-dotenv twilio
   ```

3. **Create the MySQL database.** Start MySQL, then run the included SQL file:

   ```powershell
   Get-Content Backend\create_db.sql | mysql -u root -p
   ```

   The application connects to MySQL on `localhost` using database `digipass`, user `root`, and an empty password by default. If your local MySQL credentials differ, update `DB_CONFIG` near the top of `Backend/app.py`. On startup, the app creates its tables.

4. **Start the Flask backend** from the project root:

   ```powershell
   python Backend\app.py
   ```

   The API is expected at `http://127.0.0.1:5000`.

5. **Open the frontend** by opening `Frontend\homepage.html` in a browser. Frontend API requests are configured for the local backend at `http://127.0.0.1:5000`.

## Optional email and SMS configuration

The app loads optional settings from a `.env` file in the working directory. Configure the relevant values to enable the integrations:

```dotenv
# Email using Brevo
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=GUNI DigiPass

# Or email using SMTP
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_USE_TLS=true
SMTP_USE_SSL=false
SMTP_FROM_EMAIL=
SMTP_FROM_NAME=GUNI DigiPass

# SMS using Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

Without Twilio credentials, OTPs are printed to the backend console for local development. Keep real credentials out of source control; `.env` is ignored by Git.

## Admin access

The application seeds a default admin account when the database is initialized:

- **Username:** `admin`
- **Password:** `admin123`

This is a development default defined in `Backend/app.py`. Change it before using the application beyond local testing.

## Notes

- The backend currently runs with Flask debug mode enabled and is intended for local development, not production deployment.
- The frontend uses a fixed local API URL. Change the API URLs in the frontend JavaScript if the backend is hosted elsewhere.
