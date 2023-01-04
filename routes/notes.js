const notes = require('express').Router();
const { readFromFile, readAndAppend } = require('../helpers/fsUtils');
const uuid = require('../helpers/uuid');

// GET Route for retrieving all the notes
notes.get('/', (req, res) => {
  console.info(`${req.method} request received for notes`);
  readFromFile('./db/db.json').then((data) => res.json(JSON.parse(data)));
});

// POST Route for a new UX/UI Note
notes.post('/', (req, res) => {
  console.info(`${req.method} request received to add a Note`);
  console.log(req.body);

  const { title, text } = req.body;

  if (req.body) {
    const newNote = {
        title,
        text,
        id: uuid(),
    };

    readAndAppend(newNote, './db/db.json');
    res.json(`Note added successfully 🚀`);
  } else {
    res.error('Error in adding Note');
  }
});

// GET Route for a single note
notes.get('/api/notes/:id', (req, res) => {
  if (req.params.id) {
    console.info(`${req.method} request received to get a single a `);
    const id = req.params.id;
    for (let i = 0; i < s.length; i++) {
      const current = s[i];
      if (current.id === id) {
        res.json(current);
        return;
      }
    }
    res.status(404).send(' not found');
  } else {
    res.status(400).send('ID not provided');
  }
});

module.exports = notes;
