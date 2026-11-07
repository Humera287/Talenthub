const db = require('../db/connection');

const JOINED = `
  SELECT a.*, j.role, j.season, j.company_id, c.name AS company_name,
         s.full_name, s.usn, s.branch, s.cgpa, s.active_backlogs
  FROM applications a
  JOIN job_listings j ON j.job_id = a.job_id
  JOIN companies c ON c.company_id = j.company_id
  JOIN students s ON s.student_id = a.student_id`;

module.exports = {
  findById: (id) => db.prepare(`${JOINED} WHERE a.application_id = ?`).get(id),
  findByStudentAndJob: (sid, jid) =>
    db.prepare('SELECT * FROM applications WHERE student_id = ? AND job_id = ?').get(sid, jid),
  // FR-5.3: one application per company per season
  findByStudentCompanySeason: (sid, companyId, season) =>
    db.prepare(`${JOINED} WHERE a.student_id = ? AND j.company_id = ? AND j.season = ?`).get(sid, companyId, season),
  listByStudent: (sid) => db.prepare(`${JOINED} WHERE a.student_id = ? ORDER BY a.application_id DESC`).all(sid),
  listByJob: (jid) => db.prepare(`${JOINED} WHERE a.job_id = ? ORDER BY a.application_id`).all(jid),
  insert: (sid, jid, now) =>
    db.prepare(`INSERT INTO applications (student_id, job_id, status, applied_at, updated_at) VALUES (?,?, 'APPLIED', ?, ?)`)
      .run(sid, jid, now, now).lastInsertRowid,
  updateStatus: (id, status, now) =>
    db.prepare('UPDATE applications SET status = ?, updated_at = ? WHERE application_id = ?').run(status, now, id),
  addHistory: (appId, from, to, userId, now) =>
    db.prepare(
      'INSERT INTO application_status_history (application_id, from_status, to_status, changed_by, changed_at) VALUES (?,?,?,?,?)'
    ).run(appId, from, to, userId, now),
  history: (appId) =>
    db.prepare('SELECT * FROM application_status_history WHERE application_id = ? ORDER BY history_id').all(appId),
  recentHistory: (limit = 50) =>
    db.prepare(
      `SELECT h.*, u.email AS changed_by_email FROM application_status_history h
       JOIN users u ON u.user_id = h.changed_by ORDER BY h.history_id DESC LIMIT ?`
    ).all(limit),
  countByStatus: () => db.prepare('SELECT status, COUNT(*) AS n FROM applications GROUP BY status').all(),
};
