const jobRepo = require('../repositories/jobRepository');
const studentRepo = require('../repositories/studentRepository');
const eligibilityRepo = require('../repositories/eligibilityRepository');
const { AppError } = require('./errors');

const REASONS = {
  R1: 'CGPA is below the minimum required for this job',
  R2: 'Active backlogs exceed the maximum allowed for this job',
  R3: 'Student has already accepted an offer',
  R4: 'Student branch is not allowed for this job',
};

// CGPA is compared as integer hundredths so 7.50 vs 7.50 is exactly equal (never float comparison).
const toHundredths = (x) => Math.round(Number(x) * 100);

/**
 * Pure rule evaluation (Lab 4, Part B, approach B: evaluate all rules, collect every failure).
 * R1 cgpa >= min_cgpa (equal passes)   R2 active_backlogs <= max_backlogs (cleared ignored)
 * R3 no accepted offer                 R4 no branch rows = all branches, else branch must be listed
 */
function checkEligibility(student, job, allowedBranches) {
  if (!student || !job) throw new AppError(400, 'invalid input');
  const failed = [];
  if (toHundredths(student.cgpa) < toHundredths(job.min_cgpa)) failed.push('R1');
  if (student.active_backlogs > job.max_backlogs) failed.push('R2');
  if (student.has_accepted_offer) failed.push('R3');
  if (allowedBranches && allowedBranches.length > 0 && !allowedBranches.includes(student.branch)) failed.push('R4');

  if (failed.length === 0) return { eligible: true, codes: [], reason: 'all conditions met' };
  return { eligible: false, codes: failed, reason: failed.map((c) => REASONS[c]).join('; ') };
}

// Service wrapper: loads data, evaluates, and stores one ELIGIBILITY_DECISION row.
function evaluateAndStore(studentId, jobId, now = new Date().toISOString()) {
  const student = studentRepo.findById(studentId);
  const job = jobRepo.findById(jobId);
  if (!student) throw new AppError(404, 'Student not found');
  if (!job) throw new AppError(404, 'Job not found');
  const result = checkEligibility(student, job, job.allowed_branches);
  eligibilityRepo.insert(studentId, jobId, result.eligible, result.reason, result.codes, now);
  return result;
}

module.exports = { checkEligibility, evaluateAndStore, REASONS };
