const path = require('path');
const express = require('express');
require('express-async-errors');
const { AppError } = require('./services/errors');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', require('./routers/authRouter'));
app.use('/api/company', require('./routers/companyRouter'));
app.use('/api/coordinator', require('./routers/coordinatorRouter'));
app.use('/api', require('./routers/studentRouter'));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Central error handler: business errors keep their status, everything else is a 500.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof AppError) return res.status(err.status).json({ error: err.message, details: err.details });
  if (err instanceof SyntaxError && err.status === 400) return res.status(400).json({ error: 'Invalid JSON body' });
  if (err && String(err.code || '').startsWith('SQLITE_CONSTRAINT')) return res.status(409).json({ error: 'Data rule violated: ' + err.message });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

module.exports = app;
