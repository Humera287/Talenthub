const db = require('../db/connection');

module.exports = {
  findById: (id) => db.prepare('SELECT * FROM students WHERE student_id = ?').get(id),
  findByUsn: (usn) => db.prepare('SELECT * FROM students WHERE usn = ?').get(usn),
  findByEmail: (email) => db.prepare('SELECT * FROM students WHERE email = ?').get(email),
  list: () => db.prepare('SELECT * FROM students ORDER BY student_id').all(),
  create: (s) =>
    db.prepare(
      `INSERT INTO students (usn, full_name, email, branch, cgpa, active_backlogs, cleared_backlogs)
       VALUES (@usn, @full_name, @email, @branch, @cgpa, @active_backlogs, @cleared_backlogs)`
    ).run(s).lastInsertRowid,
  updateAcademic: (id, { cgpa, active_backlogs, cleared_backlogs, branch }) =>
    db.prepare(
      `UPDATE students SET cgpa = ?, active_backlogs = ?, cleared_backlogs = ?, branch = ? WHERE student_id = ?`
    ).run(cgpa, active_backlogs, cleared_backlogs, branch, id),
  setAcceptedOffer: (id, flag) =>
    db.prepare('UPDATE students SET has_accepted_offer = ? WHERE student_id = ?').run(flag ? 1 : 0, id),
  anonymise: (id) =>
    db.prepare(
      `UPDATE students SET usn = ?, full_name = 'Anonymised Student', email = ? WHERE student_id = ?`
    ).run(`ANON-${id}`, `anon-${id}@erased.invalid`, id),
  addConsent: (studentId, purpose, granted, at) =>
    db.prepare('INSERT INTO consent_records (student_id, purpose, granted, recorded_at) VALUES (?,?,?,?)')
      .run(studentId, purpose, granted ? 1 : 0, at),
};
