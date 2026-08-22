/* ==========================================================================
   Biblioteca Gnosis Lumisial Alden
   App 100% estática (GitHub Pages). Persistencia en localStorage.
   Modelo de datos:
     book = {
       id, title, author, category, stock, location, notes,
       loans: [ { id, name, contact, dateBorrowed(ISO), days, returned(bool), dateReturned } ]
     }
   Un préstamo "activo" es aquel con returned === false.
   Disponibles = stock - (préstamos activos)
   ========================================================================== */

const STORE_KEY = 'biblioteca_gnosis_alden_v1';
const THEME_KEY = 'biblioteca_gnosis_theme';
const AUTH_KEY = 'biblioteca_gnosis_auth';

/* Login estático (NO es seguridad real: cualquiera puede ver esto en el código).
   Sirve solo para evitar ediciones accidentales de usuarios comunes. */
const ADMIN_USER = 'adminalden';
const ADMIN_PASS = 'admin123';

function isAdmin() { return localStorage.getItem(AUTH_KEY) === '1'; }

/* -------------------- Estado -------------------- */
let books = load();

/* -------------------- Utilidades -------------------- */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('Error al leer datos:', e);
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(books));
  } catch (e) {
    toast('No se pudo guardar (almacenamiento lleno).');
  }
}

function activeLoans(book) {
  return (book.loans || []).filter(l => !l.returned);
}

function available(book) {
  return Math.max(0, (book.stock || 0) - activeLoans(book).length);
}

function isOverdue(loan) {
  return !loan.returned && loan.days && daysBetween(loan.dateBorrowed) > loan.days;
}

function overdueLoans(book) {
  return activeLoans(book).filter(isOverdue);
}

/** Lista de préstamos vencidos de toda la biblioteca, con su libro. */
function allOverdue() {
  const out = [];
  books.forEach(b => overdueLoans(b).forEach(l => out.push({ book: b, loan: l })));
  return out;
}

function daysBetween(iso, toDate = new Date()) {
  const a = new Date(iso);
  const b = new Date(toDate);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / 86400000);
}

function fmtDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

/* -------------------- Toast -------------------- */
let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 2600);
}

/* -------------------- Render -------------------- */
function render() {
  renderStats();
  renderOverdueAlert();
  renderCategoryFilter();
  renderGrid();
}

function renderOverdueAlert() {
  const el = $('#overdueAlert');
  const n = allOverdue().length;
  if (n === 0) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = `<span class="ico">⚠️</span>
    <span>Hay <strong>${n}</strong> préstamo${n === 1 ? '' : 's'} vencido${n === 1 ? '' : 's'}.</span>
    <span class="go">Ver →</span>`;
}

function renderStats() {
  const totalTitulos = books.length;
  const totalEjemplares = books.reduce((s, b) => s + (b.stock || 0), 0);
  const prestados = books.reduce((s, b) => s + activeLoans(b).length, 0);
  const disponibles = totalEjemplares - prestados;
  const stats = [
    { num: totalTitulos, label: 'Títulos' },
    { num: totalEjemplares, label: 'Ejemplares' },
    { num: disponibles, label: 'Disponibles' },
    { num: prestados, label: 'Prestados' },
  ];
  $('#stats').innerHTML = stats.map(s =>
    `<div class="stat"><div class="num">${s.num}</div><div class="label">${s.label}</div></div>`
  ).join('');
}

function allCategories() {
  return [...new Set(books.map(b => (b.category || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'es'));
}

function renderCategoryFilter() {
  const sel = $('#filterCategory');
  const current = sel.value;
  const cats = allCategories();
  sel.innerHTML = '<option value="">Todas las categorías</option>' +
    cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  if (cats.includes(current)) sel.value = current;

  // datalist en el formulario
  $('#catList').innerHTML = cats.map(c => `<option value="${escapeHtml(c)}"></option>`).join('');
}

function filteredBooks() {
  const q = $('#search').value.trim().toLowerCase();
  const cat = $('#filterCategory').value;
  const avail = $('#filterAvail').value;
  const sort = $('#sortBy').value;

  let list = books.filter(b => {
    if (cat && (b.category || '') !== cat) return false;
    if (q) {
      const hay = `${b.title} ${b.author} ${b.category} ${b.notes || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    const av = available(b);
    const act = activeLoans(b).length;
    if (avail === 'available' && av <= 0) return false;
    if (avail === 'borrowed' && act === 0) return false;
    if (avail === 'overdue' && overdueLoans(b).length === 0) return false;
    if (avail === 'none' && av > 0) return false;
    return true;
  });

  list.sort((a, b) => {
    if (sort === 'available') return available(b) - available(a);
    const key = sort === 'author' ? 'author' : sort === 'category' ? 'category' : 'title';
    return (a[key] || '').localeCompare(b[key] || '', 'es', { sensitivity: 'base' });
  });
  return list;
}

function renderGrid() {
  const grid = $('#grid');
  const list = filteredBooks();
  const emptyEl = $('#empty');

  if (books.length === 0) {
    grid.innerHTML = '';
    emptyEl.hidden = false;
    emptyEl.innerHTML = `<h2>La biblioteca está vacía</h2>
      <p>Comenzá agregando el primer libro con el botón <strong>“+ Agregar libro”</strong>.</p>`;
    return;
  }
  if (list.length === 0) {
    grid.innerHTML = '';
    emptyEl.hidden = false;
    emptyEl.innerHTML = `<h2>Sin resultados</h2><p>Probá con otra búsqueda o filtro.</p>`;
    return;
  }
  emptyEl.hidden = true;
  grid.innerHTML = list.map(cardHTML).join('');
}

function cardHTML(b) {
  const av = available(b);
  const active = activeLoans(b);
  const badge = av > 0
    ? `<span class="badge ok">${av} disponible${av === 1 ? '' : 's'}</span>`
    : `<span class="badge no">Sin ejemplares</span>`;

  const loansMini = active.length
    ? `<div class="loans-mini">${active.map(l => {
        const d = daysBetween(l.dateBorrowed);
        const over = l.days && d > l.days;
        return `<div class="loan-mini">
          <span class="who">${escapeHtml(l.name)}</span>
          <span class="days ${over ? 'overdue' : ''}">${d} día${d === 1 ? '' : 's'}${over ? ' · vencido' : ''}</span>
        </div>`;
      }).join('')}</div>`
    : '';

  return `<article class="card" data-id="${b.id}">
    <div class="card-top">
      <div>
        <h3>${escapeHtml(b.title)}</h3>
        ${b.author ? `<div class="author">${escapeHtml(b.author)}</div>` : ''}
      </div>
      ${badge}
    </div>
    <div class="meta">
      ${b.category ? `<span class="chip">${escapeHtml(b.category)}</span>` : ''}
      ${b.location ? `<span class="chip">📍 ${escapeHtml(b.location)}</span>` : ''}
    </div>
    <div class="stock-line">Ejemplares: <strong>${av}</strong> / ${b.stock || 0} · Prestados: <strong>${active.length}</strong></div>
    ${b.notes ? `<p class="notes">${escapeHtml(b.notes)}</p>` : ''}
    ${loansMini}
    <div class="card-actions">
      ${isAdmin() ? `<button class="btn primary small" data-action="loan" ${av <= 0 ? 'disabled' : ''}>Prestar</button>` : ''}
      <button class="btn ghost small" data-action="loans">Préstamos${active.length ? ` (${active.length})` : ''}</button>
      <span class="spacer"></span>
      ${isAdmin() ? `<button class="btn ghost small" data-action="edit" title="Editar">✏️</button>
      <button class="btn ghost small" data-action="delete" title="Eliminar">🗑️</button>` : ''}
    </div>
  </article>`;
}

/* -------------------- Modales genéricos -------------------- */
function closeAllModals() {
  $$('.modal-backdrop').forEach(m => (m.hidden = true));
}
function openModal(id) {
  // nunca apilar modales: cerrar cualquiera abierto antes de abrir el nuevo
  closeAllModals();
  $(id).hidden = false;
}
function closeModal(el) { if (el) el.hidden = true; }

// Cualquier acción de cierre (X, Cancelar, clic afuera) cierra TODOS los carteles.
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-close]') || e.target.classList.contains('modal-backdrop')) {
    closeAllModals();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAllModals();
});

/* -------------------- ABM: Alta / Edición -------------------- */
$('#btnAdd').addEventListener('click', () => openBookForm());

function openBookForm(book = null) {
  if (!isAdmin()) return;
  $('#bookForm').reset();
  $('#bookId').value = book ? book.id : '';
  $('#bookModalTitle').textContent = book ? 'Editar libro' : 'Agregar libro';
  $('#stockHint').textContent = '';
  if (book) {
    $('#fTitle').value = book.title || '';
    $('#fAuthor').value = book.author || '';
    $('#fCategory').value = book.category || '';
    $('#fStock').value = book.stock || 1;
    $('#fLocation').value = book.location || '';
    $('#fNotes').value = book.notes || '';
    const act = activeLoans(book).length;
    if (act > 0) $('#stockHint').textContent = `Hay ${act} préstamo(s) activo(s): el stock no puede ser menor que ${act}.`;
  }
  openModal('#bookModal');
  setTimeout(() => $('#fTitle').focus(), 50);
}

$('#bookForm').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!isAdmin()) return;
  const id = $('#bookId').value;
  const title = $('#fTitle').value.trim();
  if (!title) return;
  let stock = parseInt($('#fStock').value, 10) || 1;

  const data = {
    title,
    author: $('#fAuthor').value.trim(),
    category: $('#fCategory').value.trim(),
    location: $('#fLocation').value.trim(),
    notes: $('#fNotes').value.trim(),
    stock,
  };

  if (id) {
    const book = books.find(b => b.id === id);
    if (!book) return;
    const act = activeLoans(book).length;
    if (stock < act) {
      $('#stockHint').textContent = `No podés dejar el stock por debajo de los ${act} préstamo(s) activo(s).`;
      return;
    }
    Object.assign(book, data);
    toast('Libro actualizado.');
  } else {
    books.push({ id: uid(), loans: [], ...data });
    toast('Libro agregado.');
  }
  save();
  render();
  closeModal($('#bookModal'));
});

/* -------------------- Préstamo -------------------- */
function openLoanForm(book) {
  if (!isAdmin()) return;
  $('#loanForm').reset();
  $('#loanBookId').value = book.id;
  $('#loanBookName').textContent = book.title;
  $('#lDate').value = todayISO();
  openModal('#loanModal');
  setTimeout(() => $('#lName').focus(), 50);
}

$('#loanForm').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!isAdmin()) return;
  const book = books.find(b => b.id === $('#loanBookId').value);
  if (!book) return;
  if (available(book) <= 0) { toast('No hay ejemplares disponibles.'); return; }
  const name = $('#lName').value.trim();
  if (!name) return;
  book.loans = book.loans || [];
  book.loans.push({
    id: uid(),
    name,
    contact: $('#lContact').value.trim(),
    dateBorrowed: $('#lDate').value || todayISO(),
    days: parseInt($('#lDays').value, 10) || null,
    returned: false,
    dateReturned: null,
  });
  save();
  render();
  closeModal($('#loanModal'));
  toast(`Préstamo registrado a ${name}.`);
});

/* -------------------- Lista de préstamos / devolución -------------------- */
let loansListBookId = null;

function openLoansList(book) {
  loansListBookId = book.id;
  $('#loansListTitle').textContent = `Préstamos · ${book.title}`;
  renderLoansList();
  openModal('#loansListModal');
}

function renderLoansList() {
  const book = books.find(b => b.id === loansListBookId);
  if (!book) return;
  const body = $('#loansListBody');
  const loans = book.loans || [];
  const active = loans.filter(l => !l.returned);
  const history = loans.filter(l => l.returned)
    .sort((a, b) => new Date(b.dateReturned) - new Date(a.dateReturned));

  let html = '';

  html += `<p class="loans-section-title">Activos (${active.length})</p>`;
  if (active.length === 0) {
    html += `<p class="no-loans">No hay préstamos activos.</p>`;
  } else {
    html += active.map(l => {
      const d = daysBetween(l.dateBorrowed);
      const over = l.days && d > l.days;
      return `<div class="loan-row" style="margin-bottom:.5rem">
        <div class="info">
          <b>${escapeHtml(l.name)}</b>
          <small>Desde ${fmtDate(l.dateBorrowed)} · <span class="${over ? 'overdue' : ''}">${d} día${d === 1 ? '' : 's'}${l.days ? ` de ${l.days}` : ''}${over ? ' · vencido' : ''}</span>${l.contact ? ` · ${escapeHtml(l.contact)}` : ''}</small>
        </div>
        ${isAdmin() ? `<button class="btn primary small" data-return="${l.id}">Devolver</button>` : ''}
      </div>`;
    }).join('');
  }

  if (history.length) {
    html += `<p class="loans-section-title">Historial (${history.length})</p>`;
    html += history.map(l => {
      const dur = l.dateReturned ? daysBetween(l.dateBorrowed, l.dateReturned) : '?';
      return `<div class="loan-row" style="margin-bottom:.5rem;opacity:.85">
        <div class="info">
          <b>${escapeHtml(l.name)}</b>
          <small>${fmtDate(l.dateBorrowed)} → ${fmtDate(l.dateReturned)} · ${dur} día${dur === 1 ? '' : 's'}</small>
        </div>
        ${isAdmin() ? `<button class="btn ghost small" data-delete-loan="${l.id}" title="Borrar del historial">🗑️</button>` : ''}
      </div>`;
    }).join('');
  }

  body.innerHTML = html;
}

$('#loansListBody').addEventListener('click', (e) => {
  if (!isAdmin()) return;
  const book = books.find(b => b.id === loansListBookId);
  if (!book) return;
  const retId = e.target.getAttribute('data-return');
  const delId = e.target.getAttribute('data-delete-loan');
  if (retId) {
    const loan = book.loans.find(l => l.id === retId);
    if (loan) {
      loan.returned = true;
      loan.dateReturned = todayISO();
      save();
      render();
      renderLoansList();
      toast(`Devolución registrada (${loan.name}).`);
    }
  }
  if (delId) {
    book.loans = book.loans.filter(l => l.id !== delId);
    save();
    render();
    renderLoansList();
    toast('Registro eliminado del historial.');
  }
});

/* -------------------- Acciones en las tarjetas -------------------- */
$('#grid').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const card = e.target.closest('.card');
  const book = books.find(b => b.id === card.dataset.id);
  if (!book) return;
  const action = btn.dataset.action;
  if (action === 'loan') openLoanForm(book);
  else if (action === 'loans') openLoansList(book);
  else if (action === 'edit') openBookForm(book);
  else if (action === 'delete') confirmDelete(book);
});

/* -------------------- Confirmación de borrado -------------------- */
let deleteTargetId = null;
function confirmDelete(book) {
  if (!isAdmin()) return;
  deleteTargetId = book.id;
  const act = activeLoans(book).length;
  $('#confirmText').innerHTML = `¿Eliminar <strong>“${escapeHtml(book.title)}”</strong>?` +
    (act > 0 ? `<br><span style="color:var(--red)">Tiene ${act} préstamo(s) activo(s).</span>` : '') +
    `<br>Esta acción no se puede deshacer.`;
  openModal('#confirmModal');
}
$('#confirmOk').addEventListener('click', () => {
  if (deleteTargetId) {
    const b = books.find(x => x.id === deleteTargetId);
    books = books.filter(x => x.id !== deleteTargetId);
    save();
    render();
    toast(`“${b ? b.title : 'Libro'}” eliminado.`);
  }
  deleteTargetId = null;
  closeModal($('#confirmModal'));
});

/* -------------------- Filtros / búsqueda -------------------- */
['#search', '#filterCategory', '#filterAvail', '#sortBy'].forEach(sel => {
  $(sel).addEventListener('input', renderGrid);
});

/* -------------------- Aviso de vencidos -------------------- */
$('#overdueAlert').addEventListener('click', () => {
  $('#filterAvail').value = 'overdue';
  renderGrid();
  $('#grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

/* -------------------- Imprimir préstamos activos -------------------- */
$('#btnPrint').addEventListener('click', () => {
  const rows = [];
  books.forEach(b => activeLoans(b).forEach(l => rows.push({ book: b, loan: l })));
  // ordenar: vencidos primero, luego por más días
  rows.sort((a, b) => {
    const oa = isOverdue(a.loan) ? 1 : 0;
    const ob = isOverdue(b.loan) ? 1 : 0;
    if (oa !== ob) return ob - oa;
    return daysBetween(b.loan.dateBorrowed) - daysBetween(a.loan.dateBorrowed);
  });

  const now = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  let html = `<h1>Biblioteca Gnosis Lumisial Alden</h1>
    <p class="print-sub">Préstamos activos · Emitido el ${now} · Total: ${rows.length}</p>`;

  if (rows.length === 0) {
    html += `<p class="none">No hay préstamos activos.</p>`;
  } else {
    html += `<table><thead><tr>
        <th>Libro</th><th>Autor</th><th>Prestado a</th><th>Contacto</th>
        <th>Desde</th><th>Días</th><th>Solicitados</th><th>Estado</th>
      </tr></thead><tbody>`;
    html += rows.map(({ book, loan }) => {
      const d = daysBetween(loan.dateBorrowed);
      const over = isOverdue(loan);
      return `<tr class="${over ? 'overdue' : ''}">
        <td>${escapeHtml(book.title)}</td>
        <td>${escapeHtml(book.author || '—')}</td>
        <td>${escapeHtml(loan.name)}</td>
        <td>${escapeHtml(loan.contact || '—')}</td>
        <td>${fmtDate(loan.dateBorrowed)}</td>
        <td>${d}</td>
        <td>${loan.days || '—'}</td>
        <td>${over ? 'VENCIDO' : 'En término'}</td>
      </tr>`;
    }).join('');
    html += `</tbody></table>`;
  }

  $('#printArea').innerHTML = html;
  window.print();
});

/* -------------------- Exportar / Importar -------------------- */
$('#btnExport').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(books, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `biblioteca-gnosis-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast('Respaldo descargado.');
});

$('#btnImportTrigger').addEventListener('click', () => $('#importFile').click());
$('#importFile').addEventListener('change', (e) => {
  if (!isAdmin()) { e.target.value = ''; return; }
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error('Formato inválido');
      // Normalización mínima
      const cleaned = data.map(b => ({
        id: b.id || uid(),
        title: String(b.title || 'Sin título'),
        author: String(b.author || ''),
        category: String(b.category || ''),
        location: String(b.location || ''),
        notes: String(b.notes || ''),
        stock: parseInt(b.stock, 10) || 1,
        loans: Array.isArray(b.loans) ? b.loans : [],
      }));
      const replace = books.length === 0 ||
        confirm('¿Reemplazar los datos actuales por el archivo importado?\n\nAceptar = Reemplazar\nCancelar = Combinar (agregar los importados)');
      if (replace) {
        books = cleaned;
      } else {
        const existing = new Set(books.map(b => b.id));
        cleaned.forEach(b => { if (existing.has(b.id)) b.id = uid(); books.push(b); });
      }
      save();
      render();
      toast(`Importados ${cleaned.length} libro(s).`);
    } catch (err) {
      toast('Archivo inválido. No se pudo importar.');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
});

/* -------------------- Tema claro/oscuro -------------------- */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  $('#btnTheme').textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem(THEME_KEY, theme);
}
$('#btnTheme').addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  applyTheme(cur === 'dark' ? 'light' : 'dark');
});
(function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));
})();

/* -------------------- Login del administrador -------------------- */
function applyAuthUI() {
  const admin = isAdmin();
  document.body.classList.toggle('is-admin', admin);
  const btn = $('#btnAuth');
  btn.textContent = admin ? '🔓 Salir' : '🔒 Ingresar';
  btn.title = admin ? 'Cerrar sesión de administrador' : 'Ingresar como administrador';
}

$('#btnAuth').addEventListener('click', () => {
  if (isAdmin()) {
    // Cerrar sesión
    localStorage.removeItem(AUTH_KEY);
    applyAuthUI();
    render();
    toast('Sesión cerrada.');
  } else {
    // Abrir login
    $('#authForm').reset();
    $('#authError').hidden = true;
    openModal('#authModal');
    setTimeout(() => $('#authUser').focus(), 50);
  }
});

$('#authForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const user = $('#authUser').value.trim();
  const pass = $('#authPass').value;
  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    localStorage.setItem(AUTH_KEY, '1');
    applyAuthUI();
    render();
    closeModal($('#authModal'));
    toast('¡Bienvenido! Ya podés gestionar la biblioteca.');
  } else {
    $('#authError').hidden = false;
    $('#authPass').value = '';
    $('#authPass').focus();
  }
});

/* -------------------- Catálogo base (se combina por versión) --------------------
   Agrega al dispositivo los libros del catálogo que falten (por id), SIN borrar
   préstamos ni ediciones. Subí CATALOG_VERSION cuando cambie el catálogo base. */
function ensureCatalog() {
  const CATALOG_VERSION = 3;
  const seededVer = parseInt(localStorage.getItem('biblioteca_gnosis_catalog_ver') || '0', 10);
  if (seededVer >= CATALOG_VERSION) return; // este dispositivo ya tiene esta versión
  const seed = [
    { id: 'l01', title: 'Curso Zodiacal', author: 'Samael Aun Weor', category: 'Astrología', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l02', title: 'Alcione y las Pléyades', author: 'Samael Aun Weor', category: 'Astrología', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l03', title: 'Tratado Esotérico de Astrología Hermética', author: 'Samael Aun Weor', category: 'Astrología', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l04', title: 'Muerte en la Cruz', author: 'V.M. Lakhsmi', category: 'Cristología', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l05', title: 'El Evangelio de Judas', author: 'V.M. Lakhsmi', category: 'Cristología', location: '', notes: '', stock: 2, loans: [] },
    { id: 'l06', title: 'El Cristo Cósmico y la Semana Santa', author: 'Samael Aun Weor', category: 'Cristología', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l07', title: 'El Pistis Sophia Develado', author: 'Samael Aun Weor', category: 'Cristología', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l08', title: 'Mensaje de Navidad 1964-1965', author: 'Samael Aun Weor', category: 'Mensajes de Navidad', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l09', title: 'Mensaje de Navidad 1965-1966', author: 'Samael Aun Weor', category: 'Mensajes de Navidad', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l10', title: 'Los Misterios Mayores', author: 'Samael Aun Weor', category: 'Gnosis', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l11', title: 'El Matrimonio Perfecto', author: 'Samael Aun Weor', category: 'Gnosis', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l12', title: 'Transformación Radical', author: 'Samael Aun Weor', category: 'Gnosis', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l13', title: 'Gnosis en el Siglo XX', author: 'Samael Aun Weor', category: 'Gnosis', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l14', title: 'Mi Regreso al Tíbet', author: 'Samael Aun Weor', category: 'Gnosis', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l15', title: 'Supremo Gran Manifiesto Universal', author: 'Samael Aun Weor', category: 'Gnosis', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l16', title: 'Catecismo Gnóstico', author: 'Samael Aun Weor', category: 'Gnosis', location: '', notes: '', stock: 2, loans: [] },
    { id: 'l17', title: 'Si Hay Infierno, Si Hay Diablo, Si Hay Karma', author: 'Samael Aun Weor', category: 'Gnosis', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l18', title: 'El Libro Amarillo', author: 'Samael Aun Weor', category: 'Gnosis', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l19', title: 'Los Platillos Voladores', author: 'Samael Aun Weor', category: 'Gnosis', location: '', notes: '', stock: 2, loans: [] },
    { id: 'l20', title: 'La Doctrina Secreta de Anáhuac', author: 'Samael Aun Weor', category: 'Antropología', location: '', notes: '', stock: 2, loans: [] },
    { id: 'l21', title: 'Los Planetas Metálicos de la Alquimia', author: 'Samael Aun Weor', category: 'Alquimia', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l22', title: 'Alquimia (1)', author: 'V.M. Lakhsmi', category: 'Alquimia', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l23', title: 'Alquimia (2)', author: 'V.M. Lakhsmi', category: 'Alquimia', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l24', title: 'Tratado Esotérico de Teurgia', author: 'Samael Aun Weor', category: 'Teurgia', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l25', title: 'Tratado de Teurgia', author: 'V.M. Lakhsmi', category: 'Teurgia', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l26', title: 'Las Joyas del Dragón Amarillo', author: 'V.M. Lakhsmi', category: 'Gnosis', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l27', title: 'El Regreso del Mesías', author: 'V.M. Lakhsmi', category: 'Gnosis', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l28', title: 'El Divino Daimón', author: 'V.M. Lakhsmi', category: 'Gnosis', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l29', title: 'Reflexiones de un Investigador', author: 'V.M. Lakhsmi', category: 'Gnosis', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l30', title: 'La Ley del Destino', author: 'V.M. Lakhsmi', category: 'Gnosis', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l31', title: 'Curso de Agricultura de la Nueva Era de Acuario', author: 'V.M. Lakhsmi', category: 'Medicina y Naturaleza', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l32', title: 'Tratado de Medicina Oculta y Magia Práctica', author: 'Samael Aun Weor', category: 'Medicina y Naturaleza', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l33', title: 'Tratado de Medicina Natural', author: 'A.G.E.A.C.', category: 'Medicina y Naturaleza', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l34', title: 'Seminario de Medicina Natural a través de la Gnosis', author: '', category: 'Medicina y Naturaleza', location: '', notes: 'Nota manuscrita: 7 copias', stock: 7, loans: [] },
    { id: 'l35', title: 'Las Facultades Paresensoriales', author: 'Samael Aun Weor', category: 'Medicina y Naturaleza', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l36', title: 'Manual de Procedimientos Litúrgicos', author: 'Iglesia Gnóstica Cristiana Argentina', category: 'Liturgia e Institución', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l37', title: 'Guía del Conferencista Gnóstico', author: 'Arnoldo Castillo Barajas', category: 'Liturgia e Institución', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l38', title: 'El Sacerdote Gnóstico', author: '', category: 'Liturgia e Institución', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l39', title: 'Pensum de Estudios Gnósticos para Primeras Cámaras', author: '', category: 'Liturgia e Institución', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l40', title: 'La Ciencia Gnóstica', author: 'Luis B. Rodríguez y Blanca de Rodríguez', category: 'Gnosis', location: '', notes: 'Enseñanzas del V.M. Samael Aun Weor', stock: 1, loans: [] },
    { id: 'l41', title: 'El Libro de la Virgen del Carmen', author: 'M. Gargha Kuichines', category: 'Gnosis', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l42', title: 'Los Poderes Secretos de los Salmos', author: '', category: 'Gnosis', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l43', title: 'Recopilaciones Bíblicas', author: '', category: 'Gnosis', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l44', title: 'Diálogos Esotéricos', author: 'Eleuterio Martínez', category: 'Gnosis', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l45', title: 'El Ultimátum (Convivencia S.S. 2003)', author: '', category: 'Convivencias', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l46', title: 'Runas — Guía Práctica', author: '', category: 'Otros', location: '', notes: '', stock: 1, loans: [] },
    { id: 'l47', title: 'El Libro Tibetano de los Muertos', author: 'Editorial Estaciones', category: 'Otros', location: '', notes: 'La gran liberación por audición en el Bardo', stock: 1, loans: [] },
    // --- Revistas / boletines (cantidades estimadas, revisar) ---
    { id: 'm01', title: 'El Quinto Ángel (revista)', author: 'I.G.C.A.', category: 'Revistas', location: '', notes: 'Varios números (2007–2013). Cantidad a revisar.', stock: 11, loans: [] },
    { id: 'm02', title: 'Urania Venus (revista)', author: 'Editorial Urania', category: 'Revistas', location: '', notes: 'Del Nº5 (2001) al Nº16 (2012). Cantidad a revisar.', stock: 5, loans: [] },
    { id: 'm03', title: 'La Semilla (revista)', author: '', category: 'Revistas', location: '', notes: 'Donde germina la vida (Argentina). Cantidad a revisar.', stock: 4, loans: [] },
    { id: 'm04', title: 'Gnosis — La Sabiduría del Ser Interno (revista)', author: 'A.G.E.A.C.A.C.', category: 'Revistas', location: '', notes: 'Nº7 (Dic 2011). Cantidad a revisar.', stock: 1, loans: [] },
    { id: 'm05', title: 'Gnosis Arandu (revista)', author: 'ACEACG Paraguay', category: 'Revistas', location: '', notes: 'Edición Nº2. Cantidad a revisar.', stock: 1, loans: [] },
    { id: 'm06', title: 'El Alquimista (revista)', author: '', category: 'Revistas', location: '', notes: 'Nº0 (Septiembre 1999). Cantidad a revisar.', stock: 1, loans: [] },
  ];
  // Combinar por versión: agrega los que falten y actualiza los del catálogo base,
  // conservando los préstamos y sin tocar libros cargados a mano.
  const byId = new Map(books.map(b => [b.id, b]));
  seed.forEach(sb => {
    const ex = byId.get(sb.id);
    if (ex) {
      ex.title = sb.title; ex.author = sb.author; ex.category = sb.category;
      ex.notes = sb.notes; ex.stock = sb.stock;
      if (!Array.isArray(ex.loans)) ex.loans = [];
    } else {
      books.push({ ...sb, loans: [] });
    }
  });
  localStorage.setItem('biblioteca_gnosis_catalog_ver', String(CATALOG_VERSION));
  save();
}

/* -------------------- Init -------------------- */
ensureCatalog();
applyAuthUI();
render();
