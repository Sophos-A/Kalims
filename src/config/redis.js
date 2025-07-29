// src/config/redis.js
const redis = require('redis');
const { promisify } = require('util');
require('dotenv').config();

const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD
});

client.on('error', (err) => {
  console.error('Redis error:', err);
});

module.exports = {
  ...client,
  getAsync: promisify(client.get).bind(client),
  setAsync: promisify(client.set).bind(client),
  delAsync: promisify(client.del).bind(client)
};