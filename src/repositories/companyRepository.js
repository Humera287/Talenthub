const db = require('../db/connection');

module.exports = {
  findById: (id) => db.prepare('SELECT * FROM companies WHERE company_id = ?').get(id),
  findByName: (name) => db.prepare('SELECT * FROM companies WHERE name = ?').get(name),
  list: () => db.prepare('SELECT * FROM companies ORDER BY name').all(),
  create: (name) => db.prepare('INSERT INTO companies (name) VALUES (?)').run(name).lastInsertRowid,
};
