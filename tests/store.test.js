const test = require('node:test');
const assert = require('node:assert/strict');
const store = require('../public/js/store.js');

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value))
  };
}

test('creates editable notes with stable fields and unique ids', () => {
  const a = store.createNote({ title: 'One', category: 'Work' });
  const b = store.createNote({ title: 'Two' });
  assert.notEqual(a.id, b.id);
  assert.equal(a.title, 'One');
  assert.equal(a.category, 'Work');
  assert.equal(a.starred, false);
});

test('roundtrips notes through browser storage', () => {
  const storage = memoryStorage();
  const source = [store.createNote({ title: 'Hello', text: 'world' })];
  store.save(storage, source);
  assert.deepEqual(store.load(storage), source);
});

test('invalid and corrupt storage does not crash the application', () => {
  const storage = memoryStorage();
  storage.setItem(store.KEY, '{broken');
  assert.deepEqual(store.load(storage), []);
  storage.setItem(store.KEY, JSON.stringify([null, { title: 'A', category: 'unsafe' }]));
  assert.equal(store.load(storage)[0].category, 'Personal');
});

test('filters by search, category, stars, archive, and trash', () => {
  const notes = [
    store.createNote({ title: 'Travel plans', text: 'mountains', category: 'Personal', starred: true }),
    store.createNote({ title: 'Project', text: 'roadmap', category: 'Work' }),
    store.createNote({ title: 'Hidden', archived: true }),
    store.createNote({ title: 'Gone', trashed: true })
  ];
  assert.equal(store.visible(notes, { view: 'all' }).length, 2);
  assert.equal(store.visible(notes, { view: 'starred' }).length, 1);
  assert.equal(store.visible(notes, { view: 'archived' }).length, 1);
  assert.equal(store.visible(notes, { view: 'trash' }).length, 1);
  assert.equal(store.visible(notes, { view: 'all', query: 'mountains' })[0].title, 'Travel plans');
  assert.equal(store.visible(notes, { view: 'all', category: 'Work' })[0].title, 'Project');
});

test('merge import retains existing notes and assigns fresh IDs', () => {
  const existing = [store.createNote({ title: 'Original' })];
  const incoming = JSON.stringify({ notes: [existing[0], { title: 'Imported', text: 'hello' }] });
  const merged = store.importNotes(incoming, existing);
  assert.equal(merged.length, 3);
  assert.notEqual(merged[1].id, merged[0].id);
  assert.equal(merged[2].title, 'Imported');
});

test('rejects malformed imports and excessive note counts', () => {
  assert.throws(() => store.importNotes('{bad', []), /valid JSON/);
  assert.throws(() => store.importNotes('{"notes":{}}', []), /notes collection/);
  assert.throws(() => store.importNotes('[null]', []), /invalid note/);
  const notes = Array.from({ length: 1000 }, () => store.createNote());
  assert.throws(() => store.importNotes('[{"title":"extra"}]', notes), /1,000/);
});

test('normalization caps text and rejects unrecognized categories', () => {
  const note = store.normalize({ title: 't'.repeat(250), text: 'a'.repeat(100200), category: '<script>' });
  assert.equal(note.title.length, 200);
  assert.equal(note.text.length, 100000);
  assert.equal(note.category, 'Personal');
});