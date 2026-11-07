const router = require('express').Router();
const studentRepo = require('../repositories/studentRepository');
const appRepo = require('../repositories/applicationRepository');
const interviewRepo = require('../repositories/interviewRepository');
const offerRepo = require('../repositories/offerRepository');
const jobRepo = require('../repositories/jobRepository');
const eligibility = require('../services/eligibilityService');
const appService = require('../services/applicationService');
const offerService = require('../services/offerService');
const authService = require('../services/authService');
const { authenticate, requireRole } = require('../middleware/auth');
const { AppError } = require('../services/errors');

router.use(authenticate);

// ---- Student ----
router.get('/me', requireRole('STUDENT'), (req, res) => {
  const { student_id, usn, full_name, email, branch, cgpa, active_backlogs, cleared_backlogs, has_accepted_offer } =
    studentRepo.findById(req.user.studentId);
  res.json({ student_id, usn, full_name, email, branch, cgpa, active_backlogs, cleared_backlogs, has_accepted_offer: !!has_accepted_offer });
});

// Open jobs with a live eligibility preview (pure check, nothing is stored here).
router.get('/jobs', requireRole('STUDENT'), (req, res) => {
  const student = studentRepo.findById(req.user.studentId);
  const mine = new Set(appRepo.listByStudent(student.student_id).map((a) => a.job_id));
  res.json(
    jobRepo.listOpen().map((j) => ({
      ...j,
      alreadyApplied: mine.has(j.job_id),
      eligibility: eligibility.checkEligibility(student, j, j.allowed_branches),
    }))
  );
});

router.post('/applications', requireRole('STUDENT'), (req, res) => {
  res.status(201).json(appService.apply(req.user, Number(req.body.jobId)));
});

router.get('/applications/mine', requireRole('STUDENT'), (req, res) => {
  const apps = appRepo.listByStudent(req.user.studentId).map((a) => {
    const offer = offerRepo.findByApplication(a.application_id);
    return {
      ...a,
      interviews: interviewRepo.listByApplication(a.application_id),
      offer: offer && { package_lpa: offer.package_lpa, is_accepted: !!offer.is_accepted },
    };
  });
  res.json(apps);
});

router.post('/applications/:id/accept', requireRole('STUDENT'), (req, res) => {
  res.json(appService.acceptOffer(req.user, Number(req.params.id)));
});

router.post('/applications/:id/decline', requireRole('STUDENT'), (req, res) => {
  res.json(appService.declineOffer(req.user, Number(req.params.id)));
});

// Offer letter download: student (owner), company (owner) or coordinator.
router.get('/applications/:id/offer-letter', (req, res) => {
  res.download(offerService.getLetterPath(req.user, Number(req.params.id)), 'offer-letter.pdf');
});

// ---- Coordinator: manage student academic data ----
router.get('/students', requireRole('COORDINATOR'), (req, res) => {
  res.json(studentRepo.list().map((s) => ({ ...s, has_accepted_offer: !!s.has_accepted_offer })));
});

router.put('/students/:id', requireRole('COORDINATOR'), (req, res) => {
  const s = studentRepo.findById(Number(req.params.id));
  if (!s) throw new AppError(404, 'Student not found');
  const body = {
    cgpa: req.body.cgpa ?? s.cgpa,
    active_backlogs: req.body.active_backlogs ?? s.active_backlogs,
    cleared_backlogs: req.body.cleared_backlogs ?? s.cleared_backlogs,
    branch: req.body.branch ?? s.branch,
  };
  authService.validateAcademic(body);
  studentRepo.updateAcademic(s.student_id, {
    cgpa: Number(body.cgpa), active_backlogs: Number(body.active_backlogs),
    cleared_backlogs: Number(body.cleared_backlogs), branch: body.branch,
  });
  res.json(studentRepo.findById(s.student_id));
});

module.exports = router;
