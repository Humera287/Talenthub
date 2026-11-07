const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const config = require('../config');
const db = require('../db/connection');
const offerRepo = require('../repositories/offerRepository');
const interviewRepo = require('../repositories/interviewRepository');
const appService = require('./applicationService');
const appRepo = require('../repositories/applicationRepository');
const { AppError } = require('./errors');

fs.mkdirSync(config.STORAGE_DIR, { recursive: true });

// The RDBMS owns the key; the file store owns the bytes (Lab 4, A1 data map).
const filePath = (key) => path.join(config.STORAGE_DIR, `${key}.pdf`);

function writeLetter(key, app, packageLpa) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 60 });
    const stream = fs.createWriteStream(filePath(key));
    doc.pipe(stream);
    doc.fontSize(20).text('OFFER LETTER', { align: 'center' }).moveDown();
    doc.fontSize(12)
      .text(`Date: ${new Date().toDateString()}`).moveDown()
      .text(`To: ${app.full_name} (${app.usn})`).moveDown()
      .text(`We at ${app.company_name} are pleased to offer you the position of ${app.role} (season ${app.season}).`)
      .moveDown()
      .text(`Annual package: ${Number(packageLpa).toFixed(2)} LPA`).moveDown()
      .text('Please accept this offer through TalentHub.').moveDown(2)
      .text(`Regards,\n${app.company_name}`);
    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

async function issue(user, applicationId, { package_lpa }) {
  const app = appService.getOwnedByCompany(applicationId, user);
  if (app.status !== 'INTERVIEW_SCHEDULED') throw new AppError(409, 'Offers can only be issued after interviews');
  const pkg = Number(package_lpa);
  if (!(pkg > 0)) throw new AppError(400, 'package_lpa must be greater than 0');
  if (offerRepo.findByApplication(applicationId)) throw new AppError(409, 'An offer already exists for this application'); // FR-8.6

  const rounds = interviewRepo.listByApplication(applicationId);
  if (rounds.length === 0 || rounds.some((r) => r.passed !== 1)) {
    // Flagged assumption: an offer needs at least one round and every recorded round passed.
    throw new AppError(409, 'All interview rounds must be recorded as passed before an offer');
  }

  const key = crypto.randomBytes(24).toString('hex'); // unpredictable key (FR-8.3)
  await writeLetter(key, app, pkg);
  try {
    appService.changeStatus(app, 'OFFERED', user.userId, () => offerRepo.create(applicationId, pkg, key));
  } catch (e) {
    fs.rmSync(filePath(key), { force: true }); // do not leave orphan files behind
    throw e;
  }
  return offerRepo.findByApplication(applicationId);
}

function getLetterPath(user, applicationId) {
  const app = appRepo.findById(applicationId);
  if (!app) throw new AppError(404, 'Application not found');
  const allowed =
    (user.role === 'STUDENT' && app.student_id === user.studentId) ||
    (user.role === 'COMPANY' && app.company_id === user.companyId) ||
    user.role === 'COORDINATOR';
  if (!allowed) throw new AppError(403, 'Not allowed to view this offer letter');
  const offer = offerRepo.findByApplication(applicationId);
  if (!offer) throw new AppError(404, 'No offer for this application');
  return filePath(offer.offer_letter_key);
}

module.exports = { issue, getLetterPath };
