const db = require('../db/connection');

module.exports = {
  findByEmail: (email) => db.prepare('SELECT * FROM users WHERE email = ?').get(email),
  findById: (id) => db.prepare('SELECT * FROM users WHERE user_id = ?').get(id),
  create: ({ email, passwordHash, role, studentId = null, companyId = null }) =>
    db.prepare(
      'INSERT INTO users (email, password_hash, role, student_id, company_id) VALUES (?,?,?,?,?)'
    ).run(email, passwordHash, role, studentId, companyId).lastInsertRowid,
  findByStudentId: (studentId) => db.prepare('SELECT * FROM users WHERE student_id = ?').get(studentId),
  anonymise: (userId, fakeEmail, fakeHash) =>
    db.prepare('UPDATE users SET email = ?, password_hash = ? WHERE user_id = ?').run(fakeEmail, fakeHash, userId),
};
