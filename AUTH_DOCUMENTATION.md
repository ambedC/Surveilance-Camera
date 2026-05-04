# Authentication System Documentation

## Overview
This is a complete authentication system for the Surveillance Camera project with:
- **Phone number + password login**
- **User registration** with password and confirmation
- **Data persisted in a local SQLite database** (`backend/database/app.db`)
- **Passwords hashed with sha256_crypt** (avoids requiring bcrypt library)
- **Admin approval system** for new registrations

## Architecture

### Backend
- **Framework:** FastAPI
- **Routes:** `/api/auth/`
- **Database:** In-memory (can be replaced with SQL/NoSQL)

### Frontend
- **Framework:** React with React Router
- **UI:** Tailwind CSS
- **Pages:**
  - Login page
  - Registration page
  - Admin dashboard
  - Registration pending page

## File Structure

### Backend Files
```
backend/
├── routes/
│   └── auth.py                 # Authentication routes
├── database/
│   ├── models.py               # User models and database functions
│   └── db.py                   # (existing) Alert database
├── main.py                     # Updated with auth router
└── requirements.txt            # Updated with auth dependencies
```

### Frontend Files
```
frontend/src/
├── pages/
│   ├── Login.jsx              # Phone login page
│   ├── Register.jsx           # Registration page (phone & password)
│   ├── RegistrationPending.jsx # Pending approval page
│   └── AdminDashboard.jsx      # Admin panel
├── components/
│   └── Sidebar.jsx            # Updated with logout
├── App.jsx                    # Updated with routing
└── index.css                  # Global styles
```

## Setup Instructions

### 1. Backend Setup

#### Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

#### Run Backend Server
```bash
# From project root with proper Python path setup
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at: `http://localhost:8000`
API documentation at: `http://localhost:8000/docs`

### 2. Frontend Setup

#### Install Dependencies
```bash
cd frontend
npm install
```

#### Run Development Server
```bash
npm run dev
```

The frontend will be available at: `http://localhost:5173` (or similar)

## API Endpoints

*All user data (name, email, phone, hashed password, status) is stored in `backend/database/app.db`. The login endpoint verifies credentials against this database during each request.*

### Public Endpoints

#### Register User
```
POST /api/auth/register
Body: {
  "name": "John Doe",
  "email": "john@example.com",
  "phone_number": "+919876543210",
  "password": "secret",
  "confirm_password": "secret"
}
```

#### Login
```
POST /api/auth/login
Body: {
  "phone_number": "+919876543210",
  "password": "secret"
}
```


### Admin Endpoints

#### Get Pending Users
```
GET /api/auth/admin/pending-users
Response: {
  "pending_users": [{...user objects...}],
  "total": 5
}
```

#### Get All Users
```
GET /api/auth/admin/all-users
Response: {
  "users": [{...user objects...}],
  "total": 10
}
```

_The response can be filtered client‑side to show approved and rejected users separately (the status property is `"approved"` or `"rejected"`)._
#### Approve User
```
POST /api/auth/admin/approve-user
Body: {
  "phone_number": "+1234567890"
}
Response: {
  "message": "User approved successfully",
  "user": {...user object with status: "approved"...}
}
```

#### Reject User
```
POST /api/auth/admin/reject-user
Body: {
  "phone_number": "+1234567890"
}
Response: {
  "message": "User rejected successfully",
  "user": {...user object with status: "rejected"...}
}
```

## Authentication Flow

### User Login Flow
1. User enters phone number and password on the Login page
2. System validates credentials against stored user records
3. If credentials match and account status is "approved", user is authenticated and redirected to dashboard
4. If account is still pending or rejected, show appropriate message

### User Registration Flow
1. User fills out the registration form with name, email, phone, password, and confirm password
2. System creates a new user record with status set to "pending"
3. Registration page notifies user that admin approval is required
4. User cannot log in until an admin approves their account

### Admin Approval Flow
1. Admin visits `/admin/dashboard`
2. Views three tabs: **Pending**, **Approved**, and **Rejected**. New registrations automatically appear in the Pending table.
3. Can approve or reject users; approved entries move to the Approved tab, rejected entries move to Rejected.
4. Each table shows user name and phone number (plus email and registration time).
5. Approved users can then log in using phone and password; rejected users cannot.
6. Admin can also refresh the list or view full user details in the status columns.

## Testing

### Test the API Directly
```bash
# Run the provided test script
cd backend
python test_auth.py
```

### Manual Testing
1. Start backend: `python -m uvicorn backend.main:app --reload`
2. Start frontend: `npm run dev`
3. Open browser to frontend URL
4. Test registration → admin approval → login
5. Access admin dashboard at `/admin/dashboard`

> When approving or rejecting a user in the dashboard, the entry is immediately removed from the pending tab and added to the all users list with the updated status. No page refresh is required, though a manual refresh button is available.

## OTP Configuration

### Current Settings
- **OTP Length:** 6 digits
- **Validity:** 10 minutes (600 seconds)
- **Max Attempts:** 3 incorrect attempts
- **Delivery:** Console output (for testing)

### To Enable SMS OTP (Production)
Edit `backend/routes/auth.py` and uncomment Twilio integration:

```python
from twilio.rest import Client

TWILIO_ACCOUNT_SID = "your_account_sid"
TWILIO_AUTH_TOKEN = "your_auth_token"
TWILIO_PHONE_NUMBER = "your_twilio_number"

def send_otp_via_sms(phone_number: str, otp: str):
    client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    client.messages.create(
        body=f"Your OTP is {otp}",
        from_=TWILIO_PHONE_NUMBER,
        to=phone_number
    )
```

## Database Migration

Currently using in-memory storage. To migrate to a real database:

1. Install database driver:
   ```bash
   pip install sqlalchemy psycopg2-binary
   # or
   pip install sqlalchemy pymongo
   ```

2. Update `backend/database/models.py` to use SQLAlchemy ORM or MongoDB

3. Create database models and migrations

4. Update routes to use ORM queries

## Security Improvements for Production

1. **Add Authentication Bearer Tokens**
   - Generate JWT tokens after OTP verification
   - Use tokens for protected routes

2. **Rate Limiting**
   - Limit OTP requests per phone number
   - Prevent brute force attempts

3. **HTTPS Only**
   - Use SSL/TLS certificates
   - Secure cookie settings

4. **Input Validation**
   - Validate and sanitize all inputs
   - Use email validation libraries

5. **Session Management**
   - Implement session timeout
   - Add refresh token mechanism

6. **Audit Logging**
   - Log all authentication events
   - Monitor suspicious activities

## Troubleshooting

### OTP Not Showing
- Check console where backend is running
- In test mode, OTP is printed for verification

### Login Fails
- User must be registered
- User must be approved by admin
- Phone number must be correct

### CORS Errors
- Ensure backend CORS middleware is enabled
- Check frontend URL in API calls

### Routes Not Found
- Verify Flask router is imported in `main.py`
- Check route paths in `auth.py`

## Environment Variables (Optional)

Create `.env` file in backend root:
```
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=your_number
OTP_VALIDITY_SECONDS=600
MAX_OTP_ATTEMPTS=3
```

## Support

For issues or questions:
1. Check API documentation at `/docs`
2. Review test output in console
3. Check browser console for frontend errors
4. Review backend logs for server errors

## License

This authentication system is part of the Surveillance Camera project.
