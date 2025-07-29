// src/services/triageService.js
const { spawn } = require('child_process');
const Visit = require('../models/Visit');

class TriageService {
  static async processTriage(symptoms, patientId) {
    return new Promise((resolve, reject) => {
      // Spawn Python process for AI triage
      const pythonProcess = spawn('python', [
        '../ai_triage/process_triage.py',
        symptoms
      ]);

      let result = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      pythonProcess.on('close', async (code) => {
        if (code !== 0) {
          return reject(new Error(`Python process exited with code ${code}: ${error}`));
        }

        try {
          const triageResult = JSON.parse(result);
          const visit = await Visit.create({
            patientId,
            symptoms,
            triageLevel: triageResult.level,
            isPriority: triageResult.isPriority
          });

          resolve(visit);
        } catch (err) {
          reject(err);
        }
      });
    });
  }
}

module.exports = TriageService;