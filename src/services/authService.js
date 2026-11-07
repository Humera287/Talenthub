const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db/connection');
const config = require('../config');
const userRepo = require('../repositories/userRepository');
const studentRepo = require('../repositories/studentRepository');
const { AppError } = require('./errors');

const now = () => new Date().toISOString();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(user) {
  return jwt.sign(
    { userId: user.user_id, role: user.role, studentId: user.student_id, companyId: user.company_id },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );
}

function validatePassword(pw) {
  if (typeof pw !== 'string' || pw.length < 8) throw new AppError(400, 'Password must be at least 8 characters');
}

function validateAcademic({ cgpa, active_backlogs, cleared_backlogs, branch }) {
  const c = Number(cgpa);
  if (!(c >= 0 && c <= 10)) throw new AppError(400, 'cgpa must be between 0 and 10');
  if (!Number.isInteger(Number(active_backlogs)) || Number(active_backlogs) < 0) throw new AppError(400, 'active_backlogs must be 0 or more');
  if (!Number.isInteger(Number(cleared_backlogs ?? 0)) || Number(cleared_backlogs ?? 0) < 0) throw new AppError(400, 'cleared_backlogs must be 0 or more');
  if (!config.BRANCHES.includes(branch)) throw new AppError(400, `branch must be one of ${config.BRANCHES.join(', ')}`);
}

function registerStudent(body) {
  const { usn, full_name, email, password, consent } = body;
  if (!usn || !full_name || !email) throw new AppError(400, 'usn, full_name and email are required');
  if (!EMAIL_RE.test(email)) throw new AppError(400, 'Invalid email');
  validatePassword(password);
  validateAcademic(body);
  if (consent !== true) throw new AppError(400, 'Consent to data processing is required (FR-10.1)');
  if (userRepo.findByEmail(email) || studentRepo.findByEmail(email)) throw new AppError(409, 'Email already registered');
  if (studentRepo.findByUsn(usn)) throw new AppError(409, 'USN already registered');

  const hash = bcrypt.hashSync(password, 10); // salted hash (NFR-3.7)
  return db.transaction(() => {
    const studentId = studentRepo.create({
      usn: usn.trim(), full_name: full_name.trim(), email: email.trim().toLowerCase(),
      branch: body.branch, cgpa: Number(body.cgpa),
      active_backlogs: Number(body.active_backlogs), cleared_backlogs: Number(body.cleared_backlogs ?? 0),
    });
    userRepo.create({ email: email.trim().toLowerCase(), passwordHash: hash, role: 'STUDENT', studentId });
    studentRepo.addConsent(studentId, 'placement_data_processing', true, now());
    return studentId;
  })();
}

function login(email, password) {
  const user = email && userRepo.findByEmail(String(email).toLowerCase());
  // Same message for unknown email and wrong password, so accounts cannot be probed.
  if (!user || !bcrypt.compareSync(String(password || ''), user.password_hash)) {
    throw new AppError(401, 'Invalid email or password');
  }
  return { token: signToken(user), role: user.role };
}

// Erasure request: anonymise in place so foreign keys and the audit trail stay valid (FR-10.2, NFR-4.4).
function eraseStudent(studentId) {
  db.transaction(() => {
    const user = userRepo.findByStudentId(studentId);
    studentRepo.anonymise(studentId);
    if (user) userRepo.anonymise(user.user_id, `anon-${studentId}@erased.invalid`, bcrypt.hashSync(crypto.randomBytes(24).toString('hex'), 10));
    studentRepo.addConsent(studentId, 'placement_data_processing', false, now());
  })();
}

module.exports = { registerStudent, login, eraseStudent, validateAcademic };
