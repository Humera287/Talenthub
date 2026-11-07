const db = require('../db/connection');
const config = require('../config');
const appRepo = require('../repositories/applicationRepository');
const jobRepo = require('../repositories/jobRepository');
const studentRepo = require('../repositories/studentRepository');
const offerRepo = require('../repositories/offerRepository');
const eligibility = require('./eligibilityService');
const { AppError } = require('./errors');

const now = () => new Date().toISOString();

function getOwnedByStudent(applicationId, user) {
  const app = appRepo.findById(applicationId);
  if (!app) throw new AppError(404, 'Application not found');
  if (app.student_id !== user.studentId) throw new AppError(403, 'Not your application');
  return app;
}

function getOwnedByCompany(applicationId, user) {
  const app = appRepo.findById(applicationId);
  if (!app) throw new AppError(404, 'Application not found');
  if (app.company_id !== user.companyId) throw new AppError(403, 'This application is not for your company');
  return app;
}

/**
 * FR-5.6: status changes happen ONLY here. Every change writes a history row in the same transaction.
 * Pass `extra` to run more writes inside that same transaction.
 */
function changeStatus(app, toStatus, userId, extra) {
  const allowed = config.TRANSITIONS[app.status] || [];
  if (!allowed.includes(toStatus)) {
    throw new AppError(409, `Cannot move application from ${app.status} to ${toStatus}`);
  }
  db.transaction(() => {
    const t = now();
    appRepo.updateStatus(app.application_id, toStatus, t);
    appRepo.addHistory(app.application_id, app.status, toStatus, userId, t);
    if (extra) extra();
  })();
  return appRepo.findById(app.application_id);
}

function apply(user, jobId) {
  const job = jobRepo.findById(jobId);
  if (!job) throw new AppError(404, 'Job not found');
  if (!job.is_open) throw new AppError(409, 'This job is closed');

  if (appRepo.findByStudentAndJob(user.studentId, jobId)) {
    throw new AppError(409, 'You have already applied to this job'); // NFR-8.3
  }
  // FR-5.3: one application per company per season (checked here, not as a DB key)
  if (appRepo.findByStudentCompanySeason(user.studentId, job.company_id, job.season)) {
    throw new AppError(409, `You already have an application to ${job.company_name} for season ${job.season}`);
  }

  const result = eligibility.evaluateAndStore(user.studentId, jobId);
  if (!result.eligible) {
    throw new AppError(422, 'Not eligible for this job', { codes: result.codes, reason: result.reason });
  }

  return db.transaction(() => {
    const t = now();
    const id = appRepo.insert(user.studentId, jobId, t);
    appRepo.addHistory(id, null, 'APPLIED', user.userId, t);
    return appRepo.findById(id);
  })();
}

const shortlist = (user, id) => changeStatus(getOwnedByCompany(id, user), 'SHORTLISTED', user.userId);
const reject = (user, id) => changeStatus(getOwnedByCompany(id, user), 'REJECTED', user.userId);

// Student declines an offer
function declineOffer(user, id) {
  const app = getOwnedByStudent(id, user);
  if (app.status !== 'OFFERED') throw new AppError(409, 'There is no pending offer to decline');
  return changeStatus(app, 'REJECTED', user.userId);
}

// Student accepts an offer: status, offers.is_accepted and students.has_accepted_offer change together.
function acceptOffer(user, id) {
  const app = getOwnedByStudent(id, user);
  if (app.status !== 'OFFERED') throw new AppError(409, 'There is no pending offer to accept');
  const student = studentRepo.findById(app.student_id);
  if (student.has_accepted_offer) throw new AppError(409, 'You have already accepted another offer');
  return changeStatus(app, 'ACCEPTED', user.userId, () => {
    offerRepo.setAccepted(app.application_id, true);
    studentRepo.setAcceptedOffer(app.student_id, true);
  });
}

module.exports = {
  apply, shortlist, reject, acceptOffer, declineOffer, changeStatus,
  getOwnedByCompany, getOwnedByStudent,
};
