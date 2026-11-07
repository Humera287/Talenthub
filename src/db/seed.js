const bcrypt = require('bcryptjs');
const db = require('./connection');
const userRepo = require('../repositories/userRepository');
const studentRepo = require('../repositories/studentRepository');
const companyRepo = require('../repositories/companyRepository');
const jobRepo = require('../repositories/jobRepository');

function seedIfEmpty() {
  if (db.prepare('SELECT COUNT(*) AS n FROM users').get().n > 0) return false;
  const hash = (p) => bcrypt.hashSync(p, 10);

  db.transaction(() => {
    userRepo.create({ email: 'coordinator@talenthub.edu', passwordHash: hash('Coord@123'), role: 'COORDINATOR' });

    const abc = companyRepo.create('ABC Technologies');
    const xyz = companyRepo.create('XYZ Systems');
    userRepo.create({ email: 'hr@abc.com', passwordHash: hash('Company@123'), role: 'COMPANY', companyId: abc });
    userRepo.create({ email: 'hr@xyz.com', passwordHash: hash('Company@123'), role: 'COMPANY', companyId: xyz });

    const mk = (usn, name, email, branch, cgpa, active, cleared) => {
      const sid = studentRepo.create({ usn, full_name: name, email, branch, cgpa, active_backlogs: active, cleared_backlogs: cleared });
      userRepo.create({ email, passwordHash: hash('Student@123'), role: 'STUDENT', studentId: sid });
      studentRepo.addConsent(sid, 'placement_data_processing', true, new Date().toISOString());
    };
    mk('01FE22BCS001', 'Rahul Kumar', 'rahul@student.edu', 'CSE', 8.2, 1, 0);
    mk('01FE22BIS002', 'Priya Nair', 'priya@student.edu', 'ISE', 7.5, 0, 2);
    mk('01FE22BEC003', 'Arjun Rao', 'arjun@student.edu', 'ECE', 6.5, 3, 1);

    // ABC: CSE/ISE only, min 7.0, at most 2 backlogs (the scenario in the brief)
    jobRepo.create({ company_id: abc, role: 'Software Developer', season: '2026-27', min_cgpa: 7.0, max_backlogs: 2, drive_date: '2026-11-20', branches: ['CSE', 'ISE'] });
    // XYZ: pool drive (no branch rows = all branches), min 7.5, no backlogs
    jobRepo.create({ company_id: xyz, role: 'Systems Engineer', season: '2026-27', min_cgpa: 7.5, max_backlogs: 0, drive_date: '2026-11-25', branches: [] });
  })();
  return true;
}

module.exports = { seedIfEmpty };
