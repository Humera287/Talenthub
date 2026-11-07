const router = require('express').Router();
const config = require('../config');
const jobRepo = require('../repositories/jobRepository');
const appRepo = require('../repositories/applicationRepository');
const interviewRepo = require('../repositories/interviewRepository');
const offerRepo = require('../repositories/offerRepository');
const appService = require('../services/applicationService');
const interviewService = require('../services/interviewService');
const offerService = require('../services/offerService');
const { authenticate, requireRole } = require('../middleware/auth');
const { AppError } = require('../services/errors');

router.use(authenticate, requireRole('COMPANY'));

router.get('/jobs', (req, res) => res.json(jobRepo.listByCompany(req.user.companyId)));

router.post('/jobs', (req, res) => {
  const { role, season, min_cgpa, max_backlogs, drive_date, branches = [] } = req.body;
  if (!role || !season) throw new AppError(400, 'role and season are required');
  const min = Number(min_cgpa), maxB = Number(max_backlogs);
  if (!(min >= 0 && min <= 10)) throw new AppError(400, 'min_cgpa must be between 0 and 10');
  if (!Number.isInteger(maxB) || maxB < 0) throw new AppError(400, 'max_backlogs must be 0 or more');
  if (!Array.isArray(branches) || branches.some((b) => !config.BRANCHES.includes(b))) {
    throw new AppError(400, `branches must be a list from ${config.BRANCHES.join(', ')}`);
  }
  const id = jobRepo.create({
    company_id: req.user.companyId, role: role.trim(), season: season.trim(),
    min_cgpa: min, max_backlogs: maxB, drive_date, branches,
  });
  res.status(201).json(jobRepo.findById(id));
});

router.post('/jobs/:id/close', (req, res) => {
  const job = jobRepo.findById(Number(req.params.id));
  if (!job || job.company_id !== req.user.companyId) throw new AppError(404, 'Job not found');
  jobRepo.setOpen(job.job_id, false);
  res.json({ message: 'Job closed' });
});

// Applicants: company sees only the approved student fields (no email, no cleared backlogs).
router.get('/jobs/:id/applications', (req, res) => {
  const job = jobRepo.findById(Number(req.params.id));
  if (!job || job.company_id !== req.user.companyId) throw new AppError(404, 'Job not found');
  res.json(
    appRepo.listByJob(job.job_id).map((a) => ({
      application_id: a.application_id, status: a.status, applied_at: a.applied_at,
      full_name: a.full_name, usn: a.usn, branch: a.branch, cgpa: a.cgpa, active_backlogs: a.active_backlogs,
      interviews: interviewRepo.listByApplication(a.application_id),
      offer: (() => { const o = offerRepo.findByApplication(a.application_id); return o && { package_lpa: o.package_lpa, is_accepted: !!o.is_accepted }; })(),
    }))
  );
});

router.post('/applications/:id/shortlist', (req, res) => res.json(appService.shortlist(req.user, Number(req.params.id))));
router.post('/applications/:id/reject', (req, res) => res.json(appService.reject(req.user, Number(req.params.id))));
router.post('/applications/:id/interviews', (req, res) =>
  res.status(201).json(interviewService.schedule(req.user, Number(req.params.id), req.body)));
router.post('/interviews/:slotId/result', (req, res) =>
  res.json(interviewService.recordResult(req.user, Number(req.params.slotId), req.body)));
router.post('/applications/:id/offer', async (req, res) =>
  res.status(201).json(await offerService.issue(req.user, Number(req.params.id), req.body)));

module.exports = router;
