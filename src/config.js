const path = require('path');

module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'dev-only-change-me-in-production',
  JWT_EXPIRES_IN: '2h',
  DB_FILE: process.env.DB_FILE || path.join(__dirname, '..', 'talenthub.db'),
  STORAGE_DIR: process.env.STORAGE_DIR || path.join(__dirname, '..', 'storage'),
  BRANCHES: ['CSE', 'ISE', 'ECE', 'EEE', 'ME'], // fixed enum of five values (Lab 4, A3)
  // ADR-002: six application statuses
  STATUSES: ['APPLIED', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'OFFERED', 'ACCEPTED', 'REJECTED'],
  // Allowed status moves. Only applicationService is allowed to apply them (FR-5.6).
  TRANSITIONS: {
    APPLIED: ['SHORTLISTED', 'REJECTED'],
    SHORTLISTED: ['INTERVIEW_SCHEDULED', 'REJECTED'],
    INTERVIEW_SCHEDULED: ['OFFERED', 'REJECTED'],
    OFFERED: ['ACCEPTED', 'REJECTED'],
    ACCEPTED: [],
    REJECTED: [],
  },
};
