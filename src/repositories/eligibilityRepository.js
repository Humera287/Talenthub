const db = require('../db/connection');

module.exports = {
  insert: (studentId, jobId, eligible, reason, codes, at) =>
    db.prepare(
      'INSERT INTO eligibility_decisions (student_id, job_id, eligible, reason, failed_codes, decided_at) VALUES (?,?,?,?,?,?)'
    ).run(studentId, jobId, eligible ? 1 : 0, reason, codes.join(','), at).lastInsertRowid,
};
