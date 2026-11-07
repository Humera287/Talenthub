const config = require('./config');
const { seedIfEmpty } = require('./db/seed');
const app = require('./app');

if (seedIfEmpty()) console.log('Seeded demo data (see README for logins).');
app.listen(config.PORT, () => console.log(`TalentHub running at http://localhost:${config.PORT}`));
