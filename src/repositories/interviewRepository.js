const db = require('../db/connection');

module.exports = {
  findById: (id) => db.prepare('SELECT * FROM interview_slots WHERE slot_id = ?').get(id),
  listByApplication: (appId) =>
    db.prepare('SELECT * FROM interview_slots WHERE application_id = ? ORDER BY round_number').all(appId),
  findRound: (appId, round) =>
    db.prepare('SELECT * FROM interview_slots WHERE application_id = ? AND round_number = ?').get(appId, round),
  create: (appId, round, scheduledAt, venue) =>
    db.prepare('INSERT INTO interview_slots (application_id, round_number, scheduled_at, venue) VALUES (?,?,?,?)')
      .run(appId, round, scheduledAt, venue).lastInsertRowid,
  setResult: (id, passed, notes) =>
    db.prepare('UPDATE interview_slots SET passed = ?, notes = ? WHERE slot_id = ?').run(passed ? 1 : 0, notes || null, id),
};
