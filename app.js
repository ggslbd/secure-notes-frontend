const API = ((window.APP_CONFIG && window.APP_CONFIG.API_URL) || '').replace(/\/$/, '');
const $ = (s) => document.querySelector(s);
let token = sessionStorage.getItem('t');
let me = null;

function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) k.startsWith('on') ? e.addEventListener(k.slice(2), v) : (e[k] = v);
  for (const c of kids.flat()) e.append(c);
  return e;
}
const err = (e) => { $('#msg').textContent = e ? (e.message || e) : ''; };

async function api(path, method = 'GET', body) {
  const r = await fetch(API + '/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = r.status === 204 ? null : await r.json().catch(() => null);
  if (!r.ok) {
    if (r.status === 401 && token) logout();
    throw new Error(d?.error || r.statusText);
  }
  return d;
}

// Generic paginated list renderer
function paged(box, url, render, size = 5) {
  let page = 1;
  async function load() {
    try {
      const d = await api(`${url}${url.includes('?') ? '&' : '?'}page=${page}&limit=${size}`);
      box.replaceChildren(
        ...d.data.map((x) => render(x, load)),
        h('div', {},
          h('button', { disabled: page <= 1, onclick: () => { page--; load(); } }, 'Prev'),
          ` ${d.page}/${d.pages || 1} (${d.total}) `,
          h('button', { disabled: page >= d.pages, onclick: () => { page++; load(); } }, 'Next'))
      );
      err('');
    } catch (e) { err(e); }
  }
  load();
  return load;
}
const act = (fn) => async () => { try { await fn(); err(''); } catch (e) { err(e); } };
const list = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);

function logout() { token = null; me = null; sessionStorage.removeItem('t'); show(); }
function setSession(d) { token = d.token; sessionStorage.setItem('t', token); init(); }

$('#btn-login').onclick = act(async () =>
  setSession(await api('/auth/login', 'POST', { email: $('#a-email').value, password: $('#a-pass').value })));
$('#btn-register').onclick = act(async () =>
  setSession(await api('/auth/register', 'POST', {
    name: $('#a-name').value, email: $('#a-email').value, password: $('#a-pass').value, interests: list($('#a-int').value),
  })));
$('#btn-logout').onclick = logout;

let reloadNotes, reloadUsers, reloadAll, reloadGroups;

$('#btn-int').onclick = act(async () => {
  me = await api('/users/me', 'PATCH', { interests: list($('#p-int').value) });
  if (me.role === 'admin') reloadGroups?.();
});
$('#btn-note').onclick = act(async () => {
  await api('/notes', 'POST', { title: $('#n-title').value, content: $('#n-content').value });
  $('#n-title').value = ''; $('#n-content').value = '';
  reloadNotes(); reloadAll?.();
});
$('#btn-post').onclick = act(async () => {
  await api('/posts', 'POST', { title: $('#po-title').value, body: $('#po-body').value });
  $('#po-uid').value = me._id; $('#btn-posts').onclick();
});
$('#btn-posts').onclick = act(async () => {
  paged($('#posts'), `/posts/user/${encodeURIComponent($('#po-uid').value.trim())}`,
    (p, reload) => h('div', { className: 'item' }, h('b', {}, p.title), ' ', p.body || '',
      p.author === me._id ? h('button', { onclick: act(async () => { await api('/posts/' + p._id, 'DELETE'); reload(); }) }, 'x') : ''));
});
$('#btn-user').onclick = act(async () => {
  await api('/users', 'POST', { name: $('#u-name').value, email: $('#u-email').value, password: $('#u-pass').value, role: $('#u-role').value });
  reloadUsers(); reloadGroups();
});

function noteRow(n, reload, own) {
  const t = h('input', { value: n.title }), c = h('textarea', { value: n.content });
  const row = h('div', { className: 'item' });
  if (own) {
    row.append(t, c,
      h('button', { onclick: act(async () => { await api('/notes/' + n._id, 'PATCH', { title: t.value, content: c.value }); reload(); }) }, 'Save'),
      h('button', { onclick: act(async () => { await api('/notes/' + n._id, 'DELETE'); reload(); }) }, 'Delete'));
  } else {
    row.append(h('b', {}, n.title), ` by ${n.owner?.name || ''} <${n.owner?.email || ''}>`, h('div', {}, n.content));
  }
  return row;
}

async function init() {
  try { me = await api('/users/me'); } catch (e) { return show(); }
  $('#who').textContent = `${me.name} (${me.role}) id=${me._id}`;
  $('#p-int').value = (me.interests || []).join(', ');
  $('#po-uid').value = me._id;
  show();
  reloadNotes = paged($('#notes'), '/notes', (n, r) => noteRow(n, r, true));
  $('#btn-posts').onclick();
  if (me.role === 'admin') {
    reloadUsers = paged($('#users'), '/users', (u, r) => h('div', { className: 'item' },
      `${u.name} <${u.email}> [${u.role}] id=${u._id} `,
      h('button', { onclick: act(async () => { await api('/users/' + u._id, 'PATCH', { role: u.role === 'admin' ? 'user' : 'admin' }); r(); }) }, 'Toggle role'),
      h('button', { onclick: act(async () => { await api('/users/' + u._id, 'DELETE'); r(); reloadAll(); reloadGroups(); }) }, 'Delete')));
    reloadAll = paged($('#allnotes'), '/notes?scope=all', (n, r) => noteRow(n, r, false));
    reloadGroups = paged($('#groups'), '/users/by-interests', (g) => h('div', { className: 'item' },
      h('b', {}, `${g._id} (${g.count}): `), g.users.map((u) => u.name).join(', ')));
  }
}

function show() {
  $('#auth').classList.toggle('hidden', !!me);
  $('#app').classList.toggle('hidden', !me);
  $('#admin').classList.toggle('hidden', !(me && me.role === 'admin'));
}
if (token) init(); else show();
