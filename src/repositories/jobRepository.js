const db = require('../db/connection');

const withBranches = (job) =>
  job && {
    ...job,
    allowed_branches: db.prepare('SELECT branch FROM job_allowed_branches WHERE job_id = ?')
      .all(job.job_id).map((r) => r.branch),
  };

const BASE = `SELECT j.*, c.name AS company_name FROM job_listings j JOIN companies c ON c.company_id = j.company_id`;

module.exports = {
  findById: (id) => withBranches(db.prepare(`${BASE} WHERE j.job_id = ?`).get(id)),
  listOpen: () => db.prepare(`${BASE} WHERE j.is_open = 1 ORDER BY j.job_id`).all().map(withBranches),
  listByCompany: (companyId) =>
    db.prepare(`${BASE} WHERE j.company_id = ? ORDER BY j.job_id`).all(companyId).map(withBranches),
  create: ({ company_id, role, season, min_cgpa, max_backlogs, drive_date, branches }) => {
    const tx = db.transaction(() => {
      const id = db.prepare(
        `INSERT INTO job_listings (company_id, role, season, min_cgpa, max_backlogs, drive_date)
         VALUES (?,?,?,?,?,?)`
      ).run(company_id, role, season, min_cgpa, max_backlogs, drive_date || null).lastInsertRowid;
      const ins = db.prepare('INSERT INTO job_allowed_branches (job_id, branch) VALUES (?,?)');
      for (const b of branches) ins.run(id, b);
      return id;
    });
    return tx();
  },
  setOpen: (id, open) => db.prepare('UPDATE job_listings SET is_open = ? WHERE job_id = ?').run(open ? 1 : 0, id),
};
