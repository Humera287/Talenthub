const db = require('../db/connection');
const interviewRepo = require('../repositories/interviewRepository');
const appRepo = require('../repositories/applicationRepository');
const appService = require('./applicationService');
const { AppError } = require('./errors');

function schedule(user, applicationId, { round_number, scheduled_at, venue }) {
  const app = appService.getOwnedByCompany(applicationId, user);
  if (!['SHORTLISTED', 'INTERVIEW_SCHEDULED'].includes(app.status)) {
    throw new AppError(409, 'Interviews can only be scheduled for shortlisted candidates');
  }
  const round = Number(round_number);
  if (!Number.isInteger(round) || round < 1) throw new AppError(400, 'round_number must be 1 or more');
  if (!scheduled_at || Number.isNaN(Date.parse(scheduled_at))) throw new AppError(400, 'scheduled_at must be a valid date-time');
  if (!venue || !venue.trim()) throw new AppError(400, 'venue is required');
  if (interviewRepo.findRound(applicationId, round)) throw new AppError(409, `Round ${round} already exists`);

  return db.transaction(() => {
    const slotId = interviewRepo.create(applicationId, round, scheduled_at, venue.trim());
    if (app.status === 'SHORTLISTED') appService.changeStatus(app, 'INTERVIEW_SCHEDULED', user.userId);
    return interviewRepo.findById(slotId);
  })();
}

function recordResult(user, slotId, { passed, notes }) {
  const slot = interviewRepo.findById(slotId);
  if (!slot) throw new AppError(404, 'Interview round not found');
  appService.getOwnedByCompany(slot.application_id, user);
  if (typeof passed !== 'boolean') throw new AppError(400, 'passed must be true or false');
  interviewRepo.setResult(slotId, passed, notes);
  return interviewRepo.findById(slotId);
}

module.exports = { schedule, recordResult };
