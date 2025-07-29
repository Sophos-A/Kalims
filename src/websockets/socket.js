// src/websockets/socket.js
const socketio = require('socket.io');

let io;

const init = (server) => {
  io = socketio(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('New client connected');
    
    socket.on('joinQueueRoom', (queueId) => {
      socket.join(queueId);
    });
    
    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });

  return io;
};

const emitQueueUpdate = (queueId, data) => {
  if (io) {
    io.to(queueId).emit('queueUpdate', data);
  }
};

module.exports = {
  init,
  emitQueueUpdate
};