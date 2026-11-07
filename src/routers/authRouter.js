const router = require('express').Router();
const authService = require('../services/authService');
const { authenticate, requireRole } = require('../middleware/auth');

router.post('/register', (req, res) => {
  const id = authService.registerStudent(req.body);
  res.status(201).json({ studentId: id, message: 'Registered. You can log in now.' });
});

router.post('/login', (req, res) => {
  res.json(authService.login(req.body.email, req.body.password));
});

// Right to erasure: anonymise the logged-in student's own record.
router.delete('/me', authenticate, requireRole('STUDENT'), (req, res) => {
  authService.eraseStudent(req.user.studentId);
  res.json({ message: 'Your personal data has been anonymised.' });
});

module.exports = router;
