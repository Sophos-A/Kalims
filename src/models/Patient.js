const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Patient = sequelize.define('Patient', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  age: DataTypes.INTEGER,
  visit_type: DataTypes.STRING,
  is_wheelchair: DataTypes.BOOLEAN,
  priority: DataTypes.INTEGER,
  check_in_time: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'waiting'
  }
});

module.exports = Patient;
