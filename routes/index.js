const express = require('express');

// Import our modular routers for /notes
const notes = require('./notes');

const app = express();

app.use('/notes', notes);

module.exports = app;