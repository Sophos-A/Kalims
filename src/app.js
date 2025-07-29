// src/app.js
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./config/database');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const socketio = require('./websockets/socket');

// Import routes
const patientRoutes = require('./routes/patientRoutes');
const triageRoutes = require('./routes/triageRoutes');
const queueRoutes = require('./routes/queueRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
sequelize.sync()
  .then(() => console.log('Database connected'))
  .catch(err => console.error('Database connection error:', err));

// Routes
app.use('/api/patients', patientRoutes);
app.use('/api/triage', triageRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/auth', authRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// WebSocket setup
const server = require('http').createServer(app);
socketio.init(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});