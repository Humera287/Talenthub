const studentRepo = require('../repositories/studentRepository');
const appRepo = require('../repositories/applicationRepository');
const offerRepo = require('../repositories/offerRepository');
const config = require('../config');

function placementStats() {
  const students = studentRepo.list();
  const placed = students.filter((s) => s.has_accepted_offer).length;
  const byStatus = Object.fromEntries(config.STATUSES.map((s) => [s, 0]));
  for (const r of appRepo.countByStatus()) byStatus[r.status] = r.n;
  return {
    totalStudents: students.length,
    placedStudents: placed,
    placementPercentage: students.length ? Math.round((placed / students.length) * 1000) / 10 : 0,
    applicationsByStatus: byStatus,
    offersByCompany: offerRepo.stats(),
  };
}

module.exports = { placementStats };
