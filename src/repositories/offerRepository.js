const db = require('../db/connection');

module.exports = {
  findByApplication: (appId) => db.prepare('SELECT * FROM offers WHERE application_id = ?').get(appId),
  create: (appId, packageLpa, key) =>
    db.prepare('INSERT INTO offers (application_id, package_lpa, offer_letter_key) VALUES (?,?,?)')
      .run(appId, packageLpa, key).lastInsertRowid,
  setAccepted: (appId, flag) =>
    db.prepare('UPDATE offers SET is_accepted = ? WHERE application_id = ?').run(flag ? 1 : 0, appId),
  stats: () =>
    db.prepare(
      `SELECT c.name AS company, COUNT(*) AS offers_made, SUM(o.is_accepted) AS accepted
       FROM offers o JOIN applications a ON a.application_id = o.application_id
       JOIN job_listings j ON j.job_id = a.job_id JOIN companies c ON c.company_id = j.company_id
       GROUP BY c.company_id ORDER BY c.name`
    ).all(),
};
