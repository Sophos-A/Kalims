
# 🩺 OPD Scheduling System – Backend (Node.js + PostgreSQL)

This backend project is part of the OPD (Outpatient Department) flow management system for a neurosurgical clinic. It manages patient check-ins, queue positioning, and visit tracking using:

- **Node.js** (Express framework)
- **PostgreSQL** database
- **Sequelize ORM** for database modeling
- **Role-based access control**

---

## ⚙️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username-or-org>/<repo-name>.git
cd <repo-name>
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory by copying the template:

```bash
cp .env.example .env
```

Then update your `.env` file with your local PostgreSQL credentials:

```env
DB_NAME=opd_scheduling
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
NODE_ENV=development
```

> ⚠️ Do **NOT** push your `.env` file to GitHub. Only push `.env.example`.

### 4. Start PostgreSQL

Ensure your local PostgreSQL server is running, and the database `opd_scheduling` exists.

### 5. Run the Server

To start the app:

```bash
npm start
```

Or use development mode with auto-restart:

```bash
npm run dev
```

---

## 📁 Project Structure

```
src/
│
├── config/
│   └── db.js                # Sequelize DB connection config
│
├── models/
│   └── Patient.js           # Patient model (Sequelize)
│
├── routes/
│   └── patientRoutes.js     # Patient API endpoints
│
├── controllers/
│   └── patientController.js # Patient logic (check-in, fetch, etc.)
│
├── middleware/
│   └── auth.js              # Auth middleware (authenticate, authorize)
│
├── app.js                   # Main server entry
└── .env.example             # Sample environment file
```

---

## 🧪 API Endpoints

| Method | Endpoint                        | Description                         | Access        |
|--------|----------------------------------|-------------------------------------|---------------|
| `POST` | `/api/patients/check-in`        | Add new patient to the queue        | `staff`, `admin` |
| `GET`  | `/api/patients/:visitId/position` | Get patient queue position (WIP)   | authenticated |
| `GET`  | `/api/patients`                 | Fetch all patients                  | `admin` only  |

---

## 🛠 To Do

- [ ] Implement queue positioning logic
- [ ] Add daily summary tracking
- [ ] Create appointment scheduling feature
- [ ] Build admin dashboard UI

---

## 🤝 Contributors

- **Backend (Database)** – You 😉  
- **Backend (API/Routes)** – [Teammate Name]  
- **Frontend / UI** – [Teammate Name]  
- **Project Coordinator** – [Teammate Name]  
- **AI Integration** – [Teammate Name]

> Replace names and roles accordingly.

---

## 🛡️ License

MIT – Feel free to modify and build on top of it!
