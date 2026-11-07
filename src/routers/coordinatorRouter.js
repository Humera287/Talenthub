const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db/connection');
const companyRepo = require('../repositories/companyRepository');
const userRepo = require('../repositories/userRepository');
const appRepo = require('../repositories/applicationRepository');
const report = require('../services/reportService');
const { authenticate, requireRole } = require('../middleware/auth');
const { AppError } = require('../services/errors');

router.use(authenticate, requireRole('COORDINATOR'));

router.get('/stats', (req, res) => res.json(report.placementStats()));
router.get('/audit', (req, res) => res.json(appRepo.recentHistory(100)));
router.get('/companies', (req, res) => res.json(companyRepo.list()));

// Create a company together with its representative login.
router.post('/companies', (req, res) => {
  const { name, rep_email, rep_password } = req.body;
  if (!name || !rep_email || !rep_password) throw new AppError(400, 'name, rep_email and rep_password are required');
  if (rep_password.length < 8) throw new AppError(400, 'Password must be at least 8 characters');
  if (companyRepo.findByName(name.trim())) throw new AppError(409, 'Company name already registered'); // FR-3.1
  if (userRepo.findByEmail(rep_email.toLowerCase())) throw new AppError(409, 'Email already in use');
  const id = db.transaction(() => {
    const companyId = companyRepo.create(name.trim());
    userRepo.create({ email: rep_email.toLowerCase(), passwordHash: bcrypt.hashSync(rep_password, 10), role: 'COMPANY', companyId });
    return companyId;
  })();
  res.status(201).json(companyRepo.findById(id));
});

module.exports = router;
