(function (root) {
  'use strict';

  var KEY = 'stillnote.notes.v1';
  var CATEGORIES = ['Personal', 'Work', 'Ideas', 'Other'];

  function makeId() {
    if (root.crypto && typeof root.crypto.randomUUID === 'function') return root.crypto.randomUUID();
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
  }

  function safeDate(value, fallback) {
    var date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : fallback;
  }

  function normalize(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    var now = new Date().toISOString();
    var created = safeDate(value.createdAt, now);
    return {
      id: typeof value.id === 'string' && value.id.length < 150 && value.id.length > 0 ? value.id : makeId(),
      title: typeof value.title === 'string' ? value.title.slice(0, 200) : '',
      text: typeof value.text === 'string' ? value.text.slice(0, 100000) : '',
      category: CATEGORIES.includes(value.category) ? value.category : 'Personal',
      pinned: value.pinned === true,
      starred: value.starred === true,
      archived: value.archived === true,
      trashed: value.trashed === true,
      createdAt: created,
      updatedAt: safeDate(value.updatedAt, created)
    };
  }

  function load(storage) {
    if (!storage) return [];
    try {
      var raw = storage.getItem(KEY);
      if (!raw) return [];
      var value = JSON.parse(raw);
      if (!Array.isArray(value)) return [];
      return value.map(normalize).filter(Boolean).slice(0, 1000);
    } catch (error) {
      return [];
    }
  }

  function save(storage, notes) {
    if (!storage) throw new Error('Storage is not available.');
    storage.setItem(KEY, JSON.stringify(notes));
  }

  function createNote(properties) {
    return normalize(Object.assign({
      id: makeId(),
      title: '',
      text: '',
      category: 'Personal',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, properties || {}));
  }

  function visible(notes, options) {
    var view = options.view || 'all';
    var query = (options.query || '').trim().toLocaleLowerCase();
    var category = options.category || null;
    var filtered = notes.filter(function (note) {
      if (view === 'trash') return note.trashed;
      if (note.trashed) return false;
      if (view === 'archived') return note.archived;
      if (note.archived) return false;
      if (view === 'starred' && !note.starred) return false;
      if (category && note.category !== category) return false;
      return true;
    }).filter(function (note) {
      return !query || (note.title + ' ' + note.text + ' ' + note.category).toLocaleLowerCase().includes(query);
    });
    return filtered.sort(function (a, b) {
      if (view !== 'trash' && a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    });
  }

  function importNotes(json, existing) {
    if (typeof json !== 'string' || json.length > 2000000) throw new Error('Choose a JSON file smaller than 2 MB.');
    var payload;
    try { payload = JSON.parse(json); } catch (error) { throw new Error('This file is not valid JSON.'); }
    var incoming = Array.isArray(payload) ? payload : payload && payload.notes;
    if (!Array.isArray(incoming)) throw new Error('This file does not contain a notes collection.');
    if (incoming.length > 1000 || existing.length + incoming.length > 1000) throw new Error('The workspace supports up to 1,000 notes.');
    var result = incoming.map(function (item) {
      if (!item || typeof item !== 'object' || (typeof item.title !== 'string' && typeof item.text !== 'string')) {
        throw new Error('The import contains an invalid note.');
      }
      var note = normalize(item);
      note.id = makeId();
      return note;
    });
    return existing.concat(result);
  }

  var api = { KEY: KEY, CATEGORIES: CATEGORIES, makeId: makeId, normalize: normalize, load: load, save: save, createNote: createNote, visible: visible, importNotes: importNotes };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StillnoteStore = api;
})(typeof window !== 'undefined' ? window : globalThis);
