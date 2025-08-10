/**
 * Frontend application entry point
 * This file serves as the main entry point for the frontend application
 * It integrates with the backend API and serves the frontend files
 */

const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'entry.html'));
});

app.get('/entry', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'entry.html'));
});

app.get('/patient-register', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'patient_register.html'));
});

app.get('/patient-login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'patientsignin.html'));
});

app.get('/staff', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'staff.html'));
});

// Fallback route - send to landing page
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'entry.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Frontend server running at http://localhost:${PORT}/`);
  console.log(`Open http://localhost:${PORT}/patient-register to test registration`);
});