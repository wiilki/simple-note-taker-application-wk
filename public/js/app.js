(function () {
  'use strict';

  var store = window.StillnoteStore;
  if (!store) return;
  var storage = null;
  try {
    storage = window.localStorage;
    storage.getItem(store.KEY);
  } catch (error) {
    storage = null;
  }

  var notes = store.load(storage);
  var state = { view: 'all', category: null, query: '', sort: 'recent', selected: null, theme: 'light' };
  var lastTrashedId = null;
  var toastTimer = null;
  var $ = function (selector) { return document.querySelector(selector); };
  var list = $('#note-list');
  var titleInput = $('#note-title');
  var bodyInput = $('#note-body');
  var categoryInput = $('#note-category');

  function icon(name) {
    return '<svg aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
  }

  function safePersist() {
    try {
      store.save(storage, notes);
      $('#save-status').textContent = 'All changes saved';
      return true;
    } catch (error) {
      $('#save-status').textContent = 'Not saved — storage unavailable';
      notify('Could not save locally. Export your notes to keep a backup.');
      return false;
    }
  }

  function notify(message, undo) {
    var toast = $('#toast');
    clearTimeout(toastTimer);
    toast.replaceChildren();
    var span = document.createElement('span');
    span.textContent = message;
    toast.appendChild(span);
    if (undo) {
      var button = document.createElement('button');
      button.textContent = 'Undo';
      button.type = 'button';
      button.dataset.action = 'undo-trash';
      toast.appendChild(button);
    }
    toast.classList.add('visible');
    toastTimer = setTimeout(function () { toast.classList.remove('visible'); }, 4200);
  }

  function makeWelcomeNotes() {
    var now = Date.now();
    return [
      store.createNote({
        title: 'Welcome to your quieter corner',
        text: 'This is a sample note to help you find your way.\n\nCapture a thought, a plan, a small reminder — whatever is on your mind. Everything saves automatically as you type.\n\nA few things to try:\n• Create a new note using the button on the left.\n• Star or pin something important.\n• Organize notes into collections.\n• Search for any word, anytime.\n\nMake this space your own.',
        category: 'Personal',
        pinned: true,
        createdAt: new Date(now - 3600000).toISOString(),
        updatedAt: new Date(now - 3600000).toISOString()
      }),
      store.createNote({
        title: 'Ideas worth exploring',
        text: 'A running list for sparks of inspiration.\n\n01  Start a new creative project\n02  Read something outside my usual interests\n03  Make more time for slow mornings\n\nThe best ideas are often the ones we write down before they disappear.',
        category: 'Ideas',
        starred: true,
        createdAt: new Date(now - 86400000).toISOString(),
        updatedAt: new Date(now - 86400000).toISOString()
      }),
      store.createNote({
        title: 'This week, in focus',
        text: 'A small plan is still a plan.\n\n• Focus on the important things\n• Keep the to-do list realistic\n• Leave some room for curiosity\n\nProgress over perfection.',
        category: 'Work',
        createdAt: new Date(now - 172800000).toISOString(),
        updatedAt: new Date(now - 172800000).toISOString()
      })
    ];
  }

  if (storage && storage.getItem(store.KEY) === null) {
    notes = makeWelcomeNotes();
    safePersist();
  }
  try { state.theme = storage && storage.getItem('stillnote.theme') === 'dark' ? 'dark' : 'light'; } catch (error) {}
  applyTheme();
  state.selected = notes.length ? notes[0].id : null;

  function getActive() {
    return notes.find(function (note) { return note.id === state.selected; }) || null;
  }

  function inView() {
    var items = store.visible(notes, state);
    if (state.sort === 'alpha') items.sort(function (a, b) { return (a.title || 'Untitled').localeCompare(b.title || 'Untitled'); });
    if (state.sort === 'oldest') items.sort(function (a, b) { return Date.parse(a.updatedAt) - Date.parse(b.updatedAt); });
    return items;
  }

  function noteTitle(note) { return note.title.trim() || 'Untitled note'; }

  function shortDate(value) {
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Recently';
    var today = new Date();
    if (date.toDateString() === today.toDateString()) return 'Today';
    var yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function renderNavigation() {
    var active = notes.filter(function (note) { return !note.trashed && !note.archived; });
    var counts = {
      all: active.length,
      starred: active.filter(function (note) { return note.starred; }).length,
      archived: notes.filter(function (note) { return note.archived && !note.trashed; }).length,
      trash: notes.filter(function (note) { return note.trashed; }).length
    };
    store.CATEGORIES.forEach(function (category) {
      counts[category] = active.filter(function (note) { return note.category === category; }).length;
    });
    document.querySelectorAll('[data-count]').forEach(function (element) {
      element.textContent = counts[element.dataset.count] || '0';
    });
    document.querySelectorAll('.nav-link').forEach(function (button) {
      var selected = button.dataset.view ? state.view === button.dataset.view && !state.category : state.category === button.dataset.category;
      button.classList.toggle('active', selected);
      if (selected) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    var labels = { all: 'All notes', starred: 'Starred notes', archived: 'Archive', trash: 'Trash' };
    var subtitles = {
      all: 'Every thought has a place here.',
      starred: 'The thoughts you want close by.',
      archived: 'Tucked away, never forgotten.',
      trash: 'Deleted notes live here until you remove them.'
    };
    $('#view-title').textContent = state.category || labels[state.view];
    $('#view-subtitle').textContent = state.category ? 'A space for your ' + state.category.toLowerCase() + ' notes.' : subtitles[state.view];
  }

  function renderList() {
    var items = inView();
    $('#results-count').textContent = items.length + ' ' + (items.length === 1 ? 'note' : 'notes');
    list.replaceChildren();
    if (!items.length) {
      var empty = document.createElement('div');
      empty.className = 'list-empty';
      empty.innerHTML = '<span class="list-empty-icon">' + icon('note') + '</span><h3>No notes here yet</h3><p>' + (state.query ? 'Try a different search term.' : 'A new thought is just a click away.') + '</p>';
      if (!state.query && state.view !== 'trash') {
        var newButton = document.createElement('button');
        newButton.type = 'button';
        newButton.className = 'list-empty-button';
        newButton.dataset.action = 'new';
        newButton.textContent = '+ Create a note';
        empty.appendChild(newButton);
      }
      list.appendChild(empty);
      return;
    }
    items.forEach(function (note) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'note-card' + (note.id === state.selected ? ' selected' : '');
      card.dataset.action = 'select';
      card.dataset.id = note.id;
      card.setAttribute('aria-label', 'Open note: ' + noteTitle(note));
      if (note.id === state.selected) card.setAttribute('aria-current', 'true');

      var top = document.createElement('div');
      top.className = 'note-card-top';
      var badge = document.createElement('span');
      badge.className = 'card-category ' + note.category.toLowerCase();
      badge.textContent = note.category;
      var actions = document.createElement('span');
      actions.className = 'card-indicators';
      actions.innerHTML = (note.pinned ? icon('pin') : '') + (note.starred ? icon('star') : '');
      top.append(badge, actions);
      var heading = document.createElement('h3');
      heading.textContent = noteTitle(note);
      var preview = document.createElement('p');
      preview.textContent = note.text.replace(/\s+/g, ' ').trim() || 'A blank page, full of possibility.';
      var footer = document.createElement('div');
      footer.className = 'note-card-footer';
      var when = document.createElement('span');
      when.innerHTML = icon('clock');
      when.appendChild(document.createTextNode(' ' + shortDate(note.updatedAt)));
      var count = document.createElement('span');
      var words = note.text.trim() ? note.text.trim().split(/\s+/).length : 0;
      count.textContent = words + ' words';
      footer.append(when, count);
      card.append(top, heading, preview, footer);
      list.appendChild(card);
    });
  }

  function renderEditor() {
    var note = getActive();
    $('#editor-empty').hidden = !!note;
    $('#editor-content').hidden = !note;
    if (!note) return;
    var trashed = note.trashed;
    $('#breadcrumb').textContent = noteTitle(note);
    titleInput.value = note.title;
    bodyInput.value = note.text;
    categoryInput.value = note.category;
    titleInput.readOnly = trashed;
    bodyInput.readOnly = trashed;
    categoryInput.disabled = trashed;
    $('#date-label').textContent = 'Edited ' + shortDate(note.updatedAt);
    $('#save-status').textContent = trashed ? 'In trash — restore to edit' : 'All changes saved';
    ['pin', 'star', 'archive', 'trash'].forEach(function (name) {
      var button = $('#' + name + '-btn');
      button.hidden = trashed;
      button.disabled = trashed;
    });
    $('#restore-btn').hidden = !trashed;
    $('#permanent-btn').hidden = !trashed;
    $('#pin-btn').classList.toggle('is-active', note.pinned);
    $('#star-btn').classList.toggle('is-active', note.starred);
    $('#archive-btn').classList.toggle('is-active', note.archived);
    $('#pin-btn').setAttribute('aria-pressed', String(note.pinned));
    $('#star-btn').setAttribute('aria-pressed', String(note.starred));
    $('#archive-btn').setAttribute('aria-pressed', String(note.archived));
    $('#archive-btn').setAttribute('title', note.archived ? 'Unarchive note' : 'Archive note');
    $('#pin-btn').setAttribute('title', note.pinned ? 'Unpin note' : 'Pin note');
    $('#star-btn').setAttribute('title', note.starred ? 'Unstar note' : 'Star note');
    $('#editor-panel').classList.toggle('is-trash', trashed);
    updateWordCount();
  }

  function renderAll() { renderNavigation(); renderList(); renderEditor(); }

  function updateWordCount() {
    var trimmed = bodyInput.value.trim();
    $('#word-count').textContent = (trimmed ? trimmed.split(/\s+/).length : 0) + ' words · ' + bodyInput.value.length + ' characters';
  }

  function writeCurrent() {
    var note = getActive();
    if (!note || note.trashed) return;
    note.title = titleInput.value.slice(0, 200);
    note.text = bodyInput.value.slice(0, 100000);
    note.updatedAt = new Date().toISOString();
    safePersist();
    $('#breadcrumb').textContent = noteTitle(note);
    $('#date-label').textContent = 'Edited Today';
    updateWordCount();
    renderList();
  }

  function select(id) {
    state.selected = id;
    renderList();
    renderEditor();
    document.body.classList.add('mobile-editing');
  }

  function setView(view, category) {
    state.view = category ? 'all' : view;
    state.category = category || null;
    state.query = '';
    $('#search').value = '';
    var items = inView();
    state.selected = items.length ? items[0].id : null;
    renderAll();
    document.body.classList.remove('nav-open', 'mobile-editing');
  }

  function addNote() {
    if (notes.length >= 1000) { notify('Your workspace is full. Export and clear some notes first.'); return; }
    var note = store.createNote();
    notes.unshift(note);
    state.view = 'all';
    state.category = null;
    state.query = '';
    $('#search').value = '';
    state.selected = note.id;
    safePersist();
    renderAll();
    document.body.classList.remove('nav-open');
    document.body.classList.add('mobile-editing');
    titleInput.focus();
  }

  function chooseNext() {
    var items = inView();
    state.selected = items.length ? items[0].id : null;
    renderAll();
    if (!state.selected) document.body.classList.remove('mobile-editing');
  }

  function changeFlag(flag) {
    var note = getActive();
    if (!note || note.trashed) return;
    note[flag] = !note[flag];
    note.updatedAt = new Date().toISOString();
    safePersist();
    if (flag === 'archived') {
      notify(note.archived ? 'Note moved to Archive.' : 'Note returned to your library.');
      chooseNext();
    } else { renderAll(); }
  }

  function moveToTrash() {
    var note = getActive();
    if (!note || note.trashed) return;
    note.trashed = true;
    lastTrashedId = note.id;
    note.updatedAt = new Date().toISOString();
    safePersist();
    chooseNext();
    notify('Note moved to Trash.', true);
  }

  function undoTrash() {
    var note = notes.find(function (item) { return item.id === lastTrashedId; });
    if (!note) return;
    note.trashed = false;
    note.archived = false;
    note.updatedAt = new Date().toISOString();
    lastTrashedId = null;
    safePersist();
    setView('all', null);
    select(note.id);
    notify('Note restored.');
  }

  function restore() {
    var note = getActive();
    if (!note || !note.trashed) return;
    note.trashed = false;
    note.archived = false;
    note.updatedAt = new Date().toISOString();
    safePersist();
    chooseNext();
    notify('Note restored to your library.');
  }

  function removeForever() {
    var note = getActive();
    if (!note || !note.trashed) return;
    if (!window.confirm('Permanently delete "' + noteTitle(note) + '"? This cannot be undone.')) return;
    notes = notes.filter(function (item) { return item.id !== note.id; });
    safePersist();
    chooseNext();
    notify('Note permanently deleted.');
  }

  function exportNotes() {
    var payload = JSON.stringify({ app: 'Stillnote', version: 1, exportedAt: new Date().toISOString(), notes: notes }, null, 2);
    var blob = new Blob([payload], { type: 'application/json' });
    var href = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = href;
    link.download = 'stillnote-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(href); }, 1500);
    notify('Your notes were exported as JSON.');
  }

  async function importFile(file) {
    if (!file) return;
    if (file.size > 2000000) { notify('Choose a JSON file smaller than 2 MB.'); return; }
    try {
      var raw = await file.text();
      var merged = store.importNotes(raw, notes);
      var imported = merged.length - notes.length;
      if (imported === 0) { notify('The file has no notes to import.'); return; }
      if (!window.confirm('Import ' + imported + ' notes? Existing notes will be kept.')) return;
      notes = merged;
      safePersist();
      setView('all', null);
      state.selected = merged[merged.length - 1].id;
      renderAll();
      notify(imported + (imported === 1 ? ' note imported.' : ' notes imported.'));
    } catch (error) {
      notify(error.message || 'Could not import that file.');
    }
  }

  function applyTheme() {
    document.body.dataset.theme = state.theme;
    $('#theme-label').textContent = state.theme === 'dark' ? 'Light mode' : 'Dark mode';
    document.querySelector('.theme-icon use').setAttribute('href', state.theme === 'dark' ? '#i-sun' : '#i-moon');
  }

  function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    try { if (storage) storage.setItem('stillnote.theme', state.theme); } catch (error) {}
  }

  document.body.addEventListener('click', function (event) {
    var button = event.target.closest('[data-action], [data-view], [data-category]');
    if (!button) return;
    if (button.dataset.view) { setView(button.dataset.view, null); return; }
    if (button.dataset.category) { setView('all', button.dataset.category); return; }
    switch (button.dataset.action) {
      case 'new': addNote(); break;
      case 'select': select(button.dataset.id); break;
      case 'pin': changeFlag('pinned'); break;
      case 'star': changeFlag('starred'); break;
      case 'archive': changeFlag('archived'); break;
      case 'trash': moveToTrash(); break;
      case 'undo-trash': undoTrash(); break;
      case 'restore': restore(); break;
      case 'permanent': removeForever(); break;
      case 'export': exportNotes(); break;
      case 'import': $('#import-file').click(); break;
      case 'theme': toggleTheme(); break;
      case 'open-menu': document.body.classList.add('nav-open'); break;
      case 'close-menu': document.body.classList.remove('nav-open'); break;
      case 'back': document.body.classList.remove('mobile-editing'); break;
    }
  });

  $('#mobile-shade').addEventListener('click', function () { document.body.classList.remove('nav-open'); });
  titleInput.addEventListener('input', writeCurrent);
  bodyInput.addEventListener('input', writeCurrent);
  categoryInput.addEventListener('change', function () {
    var note = getActive();
    if (!note || note.trashed) return;
    note.category = categoryInput.value;
    note.updatedAt = new Date().toISOString();
    safePersist();
    renderAll();
  });
  $('#search').addEventListener('input', function (event) {
    state.query = event.target.value;
    renderList();
  });
  $('#sort').addEventListener('change', function (event) {
    state.sort = event.target.value;
    renderList();
  });
  $('#import-file').addEventListener('change', function (event) {
    importFile(event.target.files[0]);
    event.target.value = '';
  });
  document.addEventListener('keydown', function (event) {
    var modifier = event.metaKey || event.ctrlKey;
    if (modifier && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      document.body.classList.remove('mobile-editing');
      $('#search').focus();
    }
    if (modifier && event.key.toLowerCase() === 'n') { event.preventDefault(); addNote(); }
    if (modifier && event.key.toLowerCase() === 's') { event.preventDefault(); safePersist(); notify('All changes saved.'); }
    if (event.key === 'Escape') document.body.classList.remove('nav-open', 'mobile-editing');
  });
  window.addEventListener('storage', function (event) {
    if (event.key === store.KEY) {
      notes = store.load(storage);
      if (!notes.some(function (note) { return note.id === state.selected; })) state.selected = inView()[0] ? inView()[0].id : null;
      renderAll();
      notify('Your notes were updated in another tab.');
    }
  });

  renderAll();
  if (!storage) notify('Browser storage is unavailable. Export your notes before leaving this page.');
})();
