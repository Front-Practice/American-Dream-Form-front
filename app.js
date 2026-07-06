/* ============================================================================
 * American Dream — lead form config + logic
 * EDIT THIS BLOCK to swap placeholder data for real courses/branches.
 * ==========================================================================*/

// Bot API base. Change to your deployed host in production.
const API_BASE = 'http://localhost:3000';

// Instagram of the edu center.
const INSTAGRAM_URL = 'https://www.instagram.com/americandream.osh/';

// Courses offered. `key` is what gets sent to the bot as `course`.
const COURSES = [
  { key: 'English (General)', title: 'Английский (General)', desc: 'Общий разговорный английский для всех уровней.' },
  { key: 'IELTS',            title: 'IELTS',                 desc: 'Подготовка к международному экзамену IELTS.' },
  { key: 'Kids English',     title: 'Английский для детей',  desc: 'Игровой формат для детей 5–10 лет.' },
  { key: 'Math',             title: 'Математика',            desc: 'Школьная и олимпиадная математика.' },
  { key: 'Russian',          title: 'Русский язык',          desc: 'Грамотность и разговорная речь.' },
  { key: 'Coding',           title: 'Программирование',      desc: 'NodeJS, Python — для подростков.' },
];

// Branches. `id` MUST match the branch id in the bot DB (seed: BR1=1, BR2=2).
// `courses` = which course keys are available at that branch.
const BRANCHES = [
  {
    id: 1,
    name: 'Amrican Dream OSH ',
    address: 'ул. Атабаева 24, Ош',
    courses: ['English (General)', 'IELTS', 'Kids English', 'Math', 'OPT'],
  },
  {
    id: 2,
    name: 'Араванская',
    address: 'ул. Моминова 21, Ош',
    courses: ['English (General)', 'Russian'],
  },
    {
    id: 3,
    name: 'Кара-Суу',
    address: 'ул. Ала-Тоо 87',
    courses: ['English (General)', 'Coding', 'English for Kids', 'Корейский', 'Китайский'],
  },
    {
    id: 4,
    name: 'Араван',
    address: 'ул. Ленина 18',
    courses: ['English (General)', 'Russian', 'Coding', 'Math'],
  },
];

// Where the client heard about us (sent as `source`).
const SOURCES = ['WhatsApp', 'Instagram', 'Таргет (реклама)', 'Родственники / знакомые', 'Другое'];

/* ============================================================================
 * Rendering
 * ==========================================================================*/

function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

function renderCourses() {
  const grid = document.getElementById('courses-grid');
  COURSES.forEach((c) => {
    const card = el('div', 'course-card');
    card.appendChild(el('h3', null, c.title));
    card.appendChild(el('p', null, c.desc));
    grid.appendChild(card);
  });
}

function renderBranches() {
  const wrap = document.getElementById('branches-list');
  BRANCHES.forEach((b) => {
    const card = el('div', 'branch-card');
    card.appendChild(el('h3', null, `📍 ${b.name}`));
    card.appendChild(el('p', 'branch-addr', b.address));
    const titles = b.courses
      .map((k) => (COURSES.find((c) => c.key === k) || {}).title || k)
      .map((t) => `<span class="chip">${t}</span>`)
      .join('');
    card.appendChild(el('div', 'chips', titles));
    wrap.appendChild(card);
  });
}

function renderFormOptions() {
  // Course select
  const sel = document.getElementById('course');
  COURSES.forEach((c) => {
    const o = document.createElement('option');
    o.value = c.key;
    o.textContent = c.title;
    sel.appendChild(o);
  });

  // Source radios
  const srcWrap = document.getElementById('source-options');
  SOURCES.forEach((s, i) => {
    const label = el('label', 'radio-row');
    label.innerHTML =
      `<input type="radio" name="source" value="${s}"${i === 0 ? '' : ''}> <span>${s}</span>`;
    srcWrap.appendChild(label);
  });

  // Branch checkboxes
  const brWrap = document.getElementById('branch-options');
  BRANCHES.forEach((b) => {
    const label = el('label', 'check-row');
    label.innerHTML =
      `<input type="checkbox" name="branch" value="${b.id}"> <span>${b.name} — ${b.address}</span>`;
    brWrap.appendChild(label);
  });
}

/* ============================================================================
 * Submit
 * ==========================================================================*/

function showError(msg) {
  const box = document.getElementById('form-error');
  box.textContent = msg;
  box.style.display = msg ? 'block' : 'none';
}

async function onSubmit(e) {
  e.preventDefault();
  showError('');

  const clientName = document.getElementById('clientName').value.trim();
  const childName = document.getElementById('childName').value.trim();
  const childAge = document.getElementById('childAge').value.trim();
  const course = document.getElementById('course').value;
  const phone = document.getElementById('phone').value.trim();
  const source = (document.querySelector('input[name="source"]:checked') || {}).value;
  const branchIds = Array.from(document.querySelectorAll('input[name="branch"]:checked'))
    .map((c) => Number(c.value));

  // Validation
  if (!clientName) return showError('Укажите имя родителя.');
  if (!childName) return showError('Укажите имя ребёнка.');
  const age = Number(childAge);
  if (!age || age < 1 || age > 18) return showError('Возраст ребёнка: от 1 до 18.');
  if (!course) return showError('Выберите курс.');
  if (!phone) return showError('Укажите номер телефона.');
  if (!source) return showError('Укажите, откуда вы о нас узнали.');
  if (!branchIds.length) return showError('Выберите хотя бы один филиал.');

  // Bot DTO strips unknown fields (whitelist), so fold age into childName.
  const payload = {
    clientName,
    childName: `${childName} (${age} лет)`,
    phone,
    course,
    source,
    branchIds,
  };

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Отправка…';

  try {
    const res = await fetch(`${API_BASE}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let msg = `Ошибка сервера (${res.status}).`;
      try {
        const data = await res.json();
        if (data && data.message) msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
      } catch (_) { /* ignore */ }
      throw new Error(msg);
    }
    // Success
    document.getElementById('form-card').style.display = 'none';
    document.getElementById('success-card').style.display = 'block';
    window.scrollTo({ top: document.getElementById('form-anchor').offsetTop, behavior: 'smooth' });
  } catch (err) {
    showError(err.message || 'Не удалось отправить. Попробуйте позже.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Отправить';
  }
}

/* ============================================================================
 * Init
 * ==========================================================================*/

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('ig-link').href = INSTAGRAM_URL;
  document.getElementById('ig-link-form').href = INSTAGRAM_URL;
  renderCourses();
  renderBranches();
  renderFormOptions();
  document.getElementById('lead-form').addEventListener('submit', onSubmit);
});
