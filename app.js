(function () {
  'use strict';

  var LS_KEY = 'job-tracker-v1';

  var STATUSES = [
    { id: 'wishlist', label: 'Wishlist' },
    { id: 'applied', label: 'Applied' },
    { id: 'screening', label: 'Screening' },
    { id: 'interview', label: 'Interview' },
    { id: 'offer', label: 'Offer' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'ghosted', label: 'Ghosted' }
  ];
  var TERMINAL = { offer: true, rejected: true, ghosted: true };

  var state = { applications: [] };
  var filter = { status: 'all', q: '', due: false };
  var editingId = null;

  var $ = function (id) { return document.getElementById(id); };
  var listEl = $('list');
  var statsEl = $('stats');
  var chipsEl = $('chips');
  var formEl = $('appForm');

  function load() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) {
        var d = JSON.parse(raw);
        if (d && Array.isArray(d.applications)) state = d;
      }
    } catch (e) { /* start empty on bad data */ }
  }

  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { /* storage full/blocked */ }
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function fmtDate(s) {
    if (!s) return '';
    var p = String(s).split('-');
    if (p.length !== 3) return s;
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function statusLabel(id) {
    for (var i = 0; i < STATUSES.length; i++) if (STATUSES[i].id === id) return STATUSES[i].label;
    return id;
  }

  function isDue(a) {
    return !!a.followUp && a.followUp <= todayStr() && !TERMINAL[a.status];
  }

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function filtered() {
    var list = state.applications.slice();
    if (filter.due) {
      list = list.filter(isDue);
    } else if (filter.status !== 'all') {
      list = list.filter(function (a) { return a.status === filter.status; });
    }
    var q = filter.q.trim().toLowerCase();
    if (q) {
      list = list.filter(function (a) {
        return [a.company, a.title, a.platform, a.notes].join(' ').toLowerCase().indexOf(q) !== -1;
      });
    }
    list.sort(function (a, b) {
      var d = String(b.dateApplied || '').localeCompare(String(a.dateApplied || ''));
      return d !== 0 ? d : (b.createdAt || 0) - (a.createdAt || 0);
    });
    return list;
  }

  function renderStats() {
    var total = state.applications.length;
    var count = function (id) {
      return state.applications.filter(function (a) { return a.status === id; }).length;
    };
    var due = state.applications.filter(isDue).length;
    statsEl.innerHTML =
      '<div class="stat"><b>' + total + '</b><span>Total</span></div>' +
      '<div class="stat"><b>' + count('applied') + '</b><span>Applied</span></div>' +
      '<div class="stat"><b>' + count('interview') + '</b><span>Interview</span></div>' +
      '<div class="stat"><b>' + due + '</b><span>Follow-up due</span></div>';
  }

  function renderChips() {
    var html = '<button type="button" class="chip" data-status="all" aria-pressed="' + (filter.status === 'all' && !filter.due) + '">All</button>';
    STATUSES.forEach(function (s) {
      var active = !filter.due && filter.status === s.id;
      var n = state.applications.filter(function (a) { return a.status === s.id; }).length;
      html += '<button type="button" class="chip" data-status="' + s.id + '" aria-pressed="' + active + '">' + esc(s.label) + ' (' + n + ')</button>';
    });
    chipsEl.innerHTML = html;
  }

  function cardHtml(a) {
    var due = isDue(a);
    var opts = STATUSES.map(function (s) {
      return '<option value="' + s.id + '"' + (a.status === s.id ? ' selected' : '') + '>' + esc(s.label) + '</option>';
    }).join('');
    var meta = [];
    if (a.platform) meta.push(esc(a.platform));
    if (a.dateApplied) meta.push('Applied ' + esc(fmtDate(a.dateApplied)));
    if (a.followUp) meta.push('Follow up ' + esc(fmtDate(a.followUp)));
    var h = '<article class="card' + (due ? ' due' : '') + '" data-id="' + esc(a.id) + '">';
    h += '<h3>' + esc(a.company) + '</h3>';
    h += '<p class="role">' + esc(a.title) + '</p>';
    if (meta.length) h += '<p class="meta">' + meta.join(' &middot; ') + '</p>';
    if (a.notes) h += '<p class="notes">' + esc(a.notes) + '</p>';
    if (a.url) h += '<p class="link"><a href="' + esc(a.url) + '" target="_blank" rel="noopener">View job posting</a></p>';
    h += '<div class="row">';
    h += '<span class="pill st-' + esc(a.status) + '">' + esc(statusLabel(a.status)) + '</span>';
    if (due) h += '<span class="badge-due">Follow-up due</span>';
    h += '<select class="status-select" data-action="status" aria-label="Change status">' + opts + '</select>';
    h += '<span class="actions">';
    h += '<button type="button" class="btn" data-action="edit">Edit</button>';
    h += '<button type="button" class="btn danger" data-action="delete">Delete</button>';
    h += '</span></div></article>';
    return h;
  }

  function renderList() {
    var list = filtered();
    if (!list.length) {
      listEl.innerHTML = '<div class="empty"><b>No applications match.</b><br>' +
        (state.applications.length === 0
          ? 'Add your first one above — company, role, and where you applied.'
          : 'Try a different search or status filter.') + '</div>';
      return;
    }
    listEl.innerHTML = list.map(cardHtml).join('');
  }

  function render() {
    renderStats();
    renderChips();
    renderList();
  }

  function openForm(app) {
    editingId = app ? app.id : null;
    $('formTitle').textContent = app ? 'Edit application' : 'Add application';
    $('f-company').value = app ? app.company : '';
    $('f-title').value = app ? app.title : '';
    $('f-platform').value = app ? app.platform : '';
    $('f-url').value = app ? app.url : '';
    $('f-date').value = app ? (app.dateApplied || '') : todayStr();
    $('f-status').value = app ? app.status : 'applied';
    $('f-followup').value = app ? (app.followUp || '') : '';
    $('f-notes').value = app ? (app.notes || '') : '';
    formEl.hidden = false;
    $('showFormBtn').hidden = true;
    $('f-company').focus();
  }

  function closeForm() {
    formEl.hidden = true;
    $('showFormBtn').hidden = false;
    editingId = null;
    formEl.reset();
  }

  $('showFormBtn').addEventListener('click', function () { openForm(null); });
  $('cancelFormBtn').addEventListener('click', closeForm);

  formEl.addEventListener('submit', function (e) {
    e.preventDefault();
    var company = $('f-company').value.trim();
    var title = $('f-title').value.trim();
    if (!company || !title) return;
    var now = Date.now();
    if (editingId) {
      var app = null;
      state.applications.forEach(function (a) { if (a.id === editingId) app = a; });
      if (!app) { closeForm(); return; }
      app.company = company;
      app.title = title;
      app.platform = $('f-platform').value.trim();
      app.url = $('f-url').value.trim();
      app.dateApplied = $('f-date').value || todayStr();
      app.status = $('f-status').value;
      app.followUp = $('f-followup').value || '';
      app.notes = $('f-notes').value.trim();
      app.updatedAt = now;
    } else {
      state.applications.push({
        id: newId(),
        company: company,
        title: title,
        platform: $('f-platform').value.trim(),
        url: $('f-url').value.trim(),
        dateApplied: $('f-date').value || todayStr(),
        status: $('f-status').value,
        followUp: $('f-followup').value || '',
        notes: $('f-notes').value.trim(),
        createdAt: now,
        updatedAt: now
      });
    }
    save();
    closeForm();
    render();
  });

  chipsEl.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-status]');
    if (!btn) return;
    filter.status = btn.getAttribute('data-status');
    filter.due = false;
    $('dueOnly').checked = false;
    render();
  });

  $('search').addEventListener('input', function (e) {
    filter.q = e.target.value;
    renderList();
  });

  $('dueOnly').addEventListener('change', function (e) {
    filter.due = e.target.checked;
    render();
  });

  listEl.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var card = e.target.closest('.card');
    if (!card) return;
    var id = card.getAttribute('data-id');
    var action = btn.getAttribute('data-action');
    if (action === 'edit') {
      var app = null;
      state.applications.forEach(function (a) { if (a.id === id) app = a; });
      if (app) openForm(app);
    } else if (action === 'delete') {
      var app2 = null;
      state.applications.forEach(function (a) { if (a.id === id) app2 = a; });
      if (app2 && confirm('Are you sure you want to delete the application for ' + app2.title + ' at ' + app2.company + '?')) {
        state.applications = state.applications.filter(function (a) { return a.id !== id; });
        save();
        render();
      }
    }
  });

  listEl.addEventListener('change', function (e) {
    var sel = e.target.closest('[data-action="status"]');
    if (!sel) return;
    var card = e.target.closest('.card');
    if (!card) return;
    var id = card.getAttribute('data-id');
    state.applications.forEach(function (a) {
      if (a.id === id) { a.status = sel.value; a.updatedAt = Date.now(); }
    });
    save();
    render();
  });

  $('exportBtn').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'job-tracker-backup-' + todayStr() + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
  });

  $('importBtn').addEventListener('click', function () { $('importFile').click(); });

  $('importFile').addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var d = JSON.parse(reader.result);
        if (!d || !Array.isArray(d.applications)) throw new Error('bad file');
        var valid = d.applications.every(function (a) {
          return a && typeof a.company === 'string' && typeof a.title === 'string';
        });
        if (!valid) throw new Error('bad entries');
        if (!confirm('Replace all ' + state.applications.length + ' applications with the ' + d.applications.length + ' in this backup?')) return;
        state = d;
        save();
        render();
      } catch (err) {
        alert('That file is not a valid Job Tracker backup.');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  });

  load();
  render();
})();
