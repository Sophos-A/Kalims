# Installation Guide

## AI-Assisted OPD Scheduling and Patient Flow Management System

This guide will help you set up and run the AI-Assisted OPD Scheduling and Patient Flow Management System for neurosurgical outpatient clinics.

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- Python 3.8+ (for the FastAPI service)
- npm (usually comes with Node.js)
- pip (Python package manager)

## Database Setup

1. Create a PostgreSQL database for the application
2. Note your database credentials (database name, username, password, host, port)

## Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the backend directory with the following variables:
   ```
   # Database Configuration
   DB_NAME=your_database_name
   DB_USER=your_database_user
   DB_PASSWORD=your_database_password
   DB_HOST=your_database_host
   DB_PORT=5432
   DATABASE_URL=postgres://your_database_user:your_database_password@your_database_host:5432/your_database_name
   
   # AI Service Configuration
   AI_ENDPOINT=http://localhost:8000
   FASTAPI_API_KEY=your_api_key
   AI_SERVICE_TIMEOUT=30000
   AI_TRIAGE_THRESHOLD=0.7
   
   # Authentication
   JWT_SECRET=your_jwt_secret
   ```

4. Initialize the database schema:
   ```
   node scripts/update-schema.js
   ```

5. Test the database connection:
   ```
   node scripts/test-connection.js
   ```

6. Start the backend server:
   ```
   npm start
   ```
   The server should start on http://localhost:3000

## FastAPI Service Setup

1. Navigate to the FastAPI service directory:
   ```
   cd fastapi-service
   ```

2. Create a virtual environment (optional but recommended):
   ```
   python -m venv venv
   ```

3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - macOS/Linux: `source venv/bin/activate`

4. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

5. Create a `.env` file in the fastapi-service directory with the following variables:
   ```
   # API Configuration
   API_KEY=your_api_key
   
   # DeepSeek AI Configuration
   DEEPSEEK_API_KEY=your_deepseek_api_key
   DEEPSEEK_MODEL=deepseek-chat
   DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
   ```

6. Start the FastAPI service:
   ```
   uvicorn main:app --reload --port 8000
   ```
   The service should start on http://localhost:8000

## Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the frontend directory with the following variables:
   ```
   REACT_APP_API_URL=http://localhost:3000/api
   ```

4. Start the frontend development server:
   ```
   npm start
   ```
   The frontend should start on http://localhost:3001

## Verifying the Installation

1. Open your browser and navigate to http://localhost:3001
2. Log in with the default credentials:
   - Username: admin@example.com
   - Password: password123
3. You should see the dashboard with the patient queue and management options

## Troubleshooting

### Database Connection Issues

- Verify your PostgreSQL service is running
- Check your database credentials in the `.env` file
- Run the test connection script: `node backend/scripts/test-connection.js`

### FastAPI Service Issues

- Ensure Python and required packages are installed correctly
- Verify the API key matches between the backend and FastAPI service
- Check the logs for any error messages

### Frontend Connection Issues

- Verify the backend server is running
- Check the REACT_APP_API_URL in the frontend `.env` file
- Look for CORS errors in the browser console

## Next Steps

After successful installation:

1. Create user accounts for staff and doctors
2. Configure patient categories and vulnerability factors as needed
3. Set up display screens in the clinic
4. Train staff on using the system

## Support

If you encounter any issues during installation or usage, please contact the system administrator or refer to the documentation.