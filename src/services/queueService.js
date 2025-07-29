// src/services/queueService.js
const { Op } = require('sequelize');
const Visit = require('../models/Visit');
const QueuePosition = require('../models/QueuePosition');
const { emitQueueUpdate } = require('../websockets/socket');

class QueueService {
  static async addToQueue(visitId) {
    // Get current queue length
    const queueLength = await QueuePosition.count();
    const position = queueLength + 1;
    
    // Calculate estimated wait time (5 minutes per position)
    const estimatedWaitTime = position * 5;
    
    const queuePosition = await QueuePosition.create({
      visitId,
      position,
      estimatedWaitTime
    });
    
    // Emit real-time update
    const queueData = await this.getQueueStatus();
    emitQueueUpdate('neurosurgery', queueData);
    
    return queuePosition;
  }

  static async getQueueStatus() {
    return await QueuePosition.findAll({
      include: [{
        model: Visit,
        include: ['Patient']
      }],
      order: [['position', 'ASC']]
    });
  }

  static async prioritizePatient(visitId) {
    // Update visit priority
    await Visit.update(
      { isPriority: true },
      { where: { id: visitId } }
    );
    
    // Recalculate queue positions
    await this.recalculateQueue();
    
    return this.getQueueStatus();
  }

  static async recalculateQueue() {
    // This would implement your prioritization logic
    // For example: move priority cases to the front
  }
}

module.exports = QueueService;