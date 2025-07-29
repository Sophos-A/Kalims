// src/models/QueuePosition.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const QueuePosition = sequelize.define('QueuePosition', {
  position: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  estimatedWaitTime: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  lastUpdated: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

module.exports = QueuePosition;