# AI-Assisted OPD Scheduling and Patient Flow Management System

A comprehensive solution for neurosurgical outpatient clinics to manage patient flow, scheduling, and triage using AI assistance.

## Overview

This system addresses critical challenges in neurosurgical outpatient clinics by providing:

- QR code-based patient check-in and registration
- Automatic patient categorization (new, follow-up, post-op, referral)
- Prioritization of vulnerable patients (elderly, wheelchair users, urgent referrals)
- Real-time queue display for staff and patients
- AI-powered triage for severity assessment
- Notifications for doctors and staff about patient status
- Comprehensive reporting and data export capabilities

## System Architecture

### Backend

- **Node.js Express Server**: Core application server handling API requests
- **PostgreSQL Database**: Stores patient, visit, queue, and triage data
- **FastAPI AI Service**: Provides AI-powered triage and severity assessment

### Frontend

- **React**: User interface for staff, doctors, and display screens
- **Material UI**: Component library for consistent design

## Key Features

### Patient Management

- Registration with automatic QR code generation
- Patient categorization (new, follow-up, post-op, referral)
- Vulnerability factor tracking (elderly, wheelchair users, etc.)
- Comprehensive patient history and visit tracking

### Queue Management

- Intelligent queue ordering based on priority scores
- Real-time queue position updates
- Estimated wait time calculations
- Status tracking (waiting, in-progress, completed, no-show)
- Display numbers for patient identification (e.g., A001, B002)

### AI-Powered Triage

- Symptom and vital sign analysis
- Severity score calculation
- Automatic queue prioritization based on medical urgency
- Critical flag identification
- Recommended actions for healthcare providers

### Check-in System

- QR code scanning for quick check-in
- Manual check-in option for staff
- Automatic queue placement upon check-in
- Attendance tracking and logging

### Notification System

- Alerts for doctors about new patient assignments
- Urgent case notifications with high priority
- Queue status updates for staff
- Real-time communication about clinic flow

### Reporting and Analytics

- Daily attendance reports
- Date range analysis
- Patient category breakdown
- Vulnerability statistics
- Wait time analytics
- CSV export for EMR integration
- No-show and repeat visitor tracking

## Database Schema

The system uses the following key tables:

- `patients`: Core patient information and QR codes
- `patient_categories`: Patient classification types
- `vulnerability_factors`: Tracked vulnerability conditions
- `patient_vulnerabilities`: Junction table for patient-vulnerability relationships
- `visits`: Patient visit records with check-in method and doctor assignment
- `queue_positions`: Queue management with priority scores and status
- `triage_records`: AI triage results and recommendations
- `attendance_logs`: Check-in/checkout tracking
- `notifications`: System alerts for doctors and staff
- `doctors`: Healthcare provider information
- `staff`: Administrative staff records

## API Endpoints

### Patient Management
- `GET /api/patients`: List all patients
- `GET /api/patients/:id`: Get patient details
- `POST /api/patients`: Register new patient
- `PUT /api/patients/:id`: Update patient information

### Queue Management
- `GET /api/queue`: Get current queue
- `POST /api/queue`: Add patient to queue
- `PUT /api/queue/:id`: Update queue status
- `GET /api/queue/stats`: Get queue statistics

### Triage
- `POST /api/triage`: Submit patient symptoms for AI triage
- `GET /api/triage/history/:visitId`: Get triage history

### Check-in
- `GET /api/checkin/:qrCode`: Validate QR code
- `POST /api/checkin`: Check in patient with QR code

### Notifications
- `GET /api/notifications`: Get notifications for user
- `PUT /api/notifications/:id/read`: Mark notification as read

### Reports
- `GET /api/reports/daily`: Get daily attendance report
- `GET /api/reports/range`: Get date range report
- `GET /api/reports/export`: Export data in CSV format

## Setup and Installation

### Prerequisites

- Node.js (v14+)
- PostgreSQL (v12+)
- Python (v3.8+) for FastAPI service

### Environment Variables

Create a `.env` file in the backend directory with the following variables:

```
# Database Configuration
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_HOST=your_database_host
DB_PORT=5432

# AI Service Configuration
AI_ENDPOINT=http://localhost:8000
FASTAPI_API_KEY=your_api_key
AI_SERVICE_TIMEOUT=30000
AI_TRIAGE_THRESHOLD=0.7

# Authentication
JWT_SECRET=your_jwt_secret
```

### Installation Steps

1. Clone the repository
2. Install backend dependencies:
   ```
   cd backend
   npm install
   ```
3. Set up the database:
   ```
   node scripts/create-tables.js
   node scripts/create-notifications-table.js
   node scripts/create-staff-tables.js
   ```
4. Start the backend server:
   ```
   npm start
   ```
5. Install and start the FastAPI service:
   ```
   cd fastapi-service
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```
6. Install and start the frontend:
   ```
   cd frontend
   npm install
   npm start
   ```

## Usage

### Staff Interface

1. Register new patients and generate QR codes
2. Scan QR codes for patient check-in
3. View and manage the patient queue
4. Perform AI triage for patients
5. Assign patients to doctors
6. Generate reports and export data

### Doctor Interface

1. View assigned patients
2. Update patient status after consultation
3. View triage results and recommendations
4. Receive notifications about urgent cases

### Display Screen

1. Show current queue status
2. Display patient call information
3. Show estimated wait times

## License

This project is licensed under the MIT License - see the LICENSE file for details.