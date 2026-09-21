const COLORS = {
  未分类: '#13a8aa',
  工作: '#13a8aa',
  生活: '#ff8625',
  健身: '#4c4c4c',
  语言: '#e1e22d',
  音乐: '#ee719a'
};

const defaultTasks = [
  { id: crypto.randomUUID(), title: '论文分享会', category: '工作', tag: '会议', due: dayKey(0), dueTime: '', repeat: 'weekly', priority: 1, done: false },
  { id: crypto.randomUUID(), title: '论文阅读', category: '工作', tag: '输入', due: dayKey(1), dueTime: '', repeat: 'weekly', priority: 2, done: false },
  { id: crypto.randomUUID(), title: '论文阅读', category: '工作', tag: '输入', due: dayKey(4), dueTime: '', repeat: 'weekly', priority: 3, done: false },
  { id: crypto.randomUUID(), title: '组会', category: '工作', tag: '会议', due: dayKey(6), dueTime: '', repeat: 'weekly', priority: 1, done: false },
  { id: crypto.randomUUID(), title: '论文分享会', category: '工作', tag: '会议', due: dayKey(7), dueTime: '', repeat: 'weekly', priority: 2, done: false }
];

const state = {
  tasks: load('todo.tasks', defaultTasks),
  categories: load('todo.categories', ['未分类', '工作', '生活', '健身', '语言', '音乐']),
  selectedCategory: '工作',
  selectedView: 'day',
  search: '',
  filter: 'all',
  sortAscending: true,
  timerSeconds: 40 * 60,
  timerRunning: false,
  timerHandle: null
};

const els = {
  quickAdd: document.querySelector('#quickAdd'),
  sidebarSearch: document.querySelector('#sidebarSearch'),
  taskGroups: document.querySelector('#taskGroups'),
  emptyState: document.querySelector('#emptyState'),
  categoryList: document.querySelector('#categoryList'),
  tagList: document.querySelector('#tagList'),
  pageTitle: document.querySelector('#pageTitle'),
  dateEyebrow: document.querySelector('#dateEyebrow'),
  inboxCount: document.querySelector('#inboxCount'),
  todayCompleted: document.querySelector('#todayCompleted'),
  filterPanel: document.querySelector('#filterPanel'),
  dataModal: document.querySelector('#dataModal'),
  dataText: document.querySelector('#dataText'),
  importMessage: document.querySelector('#importMessage'),
  timerDisplay: document.querySelector('#timerDisplay'),
  timerStart: document.querySelector('#timerStart'),
  timerIcon: document.querySelector('#timerIcon'),
  timerText: document.querySelector('#timerText'),
  toast: document.querySelector('#toast')
};

function dayKey(offset = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function load(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch { return fallback; }
}

function save() {
  localStorage.setItem('todo.tasks', JSON.stringify(state.tasks));
  localStorage.setItem('todo.categories', JSON.stringify(state.categories));
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function dateLabel(key) {
  const today = dayKey(0), tomorrow = dayKey(1);
  if (key === today) return '今天';
  if (key === tomorrow) return '明天';
  const date = new Date(`${key}T12:00:00`);
  return `${date.getMonth() + 1}月${date.getDate()}日 ${['日', '一', '二', '三', '四', '五', '六'][date.getDay()]}`;
}

function dateLong(key) {
  const date = new Date(`${key}T12:00:00`);
  return `${date.getMonth() + 1}月${date.getDate()}日 ${['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]}`;
}

function normalizeRepeat(value) {
  if (value === true) return 'weekly';
  return ['daily', 'weekdays', 'weekly', 'monthly', 'yearly'].includes(value) ? value : '';
}

function priorityValue(value) {
  const number = Number(value);
  return number >= 1 && number <= 4 ? number : 4;
}

function weekdayName(date) {
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
}

function nextWeekday(target, nextWeek = false) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  const current = date.getDay();
  let delta = (target - current + 7) % 7;
  if (delta === 0 || nextWeek) delta += 7;
  date.setDate(date.getDate() + delta);
  return date.toISOString().slice(0, 10);
}

function advanceDate(key, repeat) {
  const date = new Date(`${key}T12:00:00`);
  if (repeat === 'daily') date.setDate(date.getDate() + 1);
  if (repeat === 'weekdays') { do { date.setDate(date.getDate() + 1); } while ([0, 6].includes(date.getDay())); }
  if (repeat === 'weekly') date.setDate(date.getDate() + 7);
  if (repeat === 'monthly') date.setMonth(date.getMonth() + 1);
  if (repeat === 'yearly') date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

function getVisibleTasks() {
  const q = state.search.trim().toLowerCase();
  return state.tasks.filter((task) => {
    const matchesSearch = !q || `${task.title} ${task.category} ${task.tag} p${priorityValue(task.priority)} ${task.dueTime || ''}`.toLowerCase().includes(q);
    const matchesCategory = state.selectedCategory === '全部' || task.category === state.selectedCategory;
    const matchesFilter = state.filter === 'all' || (state.filter === 'done' ? task.done : state.filter === 'open' ? !task.done : state.filter.startsWith('p') ? priorityValue(task.priority) === Number(state.filter.slice(1)) : task.category === state.filter);
    return matchesSearch && matchesCategory && matchesFilter;
  });
}

function groupTasks(tasks) {
  const groups = new Map();
  const today = dayKey(0), tomorrow = dayKey(1);
  for (const task of tasks) {
    let key = task.due < today ? 'overdue' : task.due === today ? 'today' : task.due === tomorrow ? 'tomorrow' : 'upcoming';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(task);
  }
  const order = ['overdue', 'today', 'tomorrow', 'upcoming'];
  return order.filter((key) => groups.has(key)).map((key) => ({ key, tasks: groups.get(key) }));
}

function render() {
  renderCategories();
  renderTags();
  const visible = getVisibleTasks().sort((a, b) => {
    const dateOrder = state.sortAscending ? a.due.localeCompare(b.due) : b.due.localeCompare(a.due);
    return dateOrder || priorityValue(a.priority) - priorityValue(b.priority);
  });
  const groups = groupTasks(visible);
  els.taskGroups.innerHTML = groups.map(renderGroup).join('');
  els.emptyState.classList.toggle('hidden', visible.length > 0);
  els.inboxCount.textContent = state.tasks.filter((task) => !task.done).length || '';
  els.todayCompleted.textContent = state.tasks.filter((task) => task.due === dayKey(0) && task.done).length;
  els.pageTitle.textContent = state.selectedCategory === '全部' ? '全部待办' : state.selectedCategory === '工作' && state.selectedView === 'day' ? 'Day Todo' : state.selectedCategory;
  els.dateEyebrow.textContent = state.selectedView === 'day' ? new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase() : 'TODO LIST';
}

function renderGroup(group) {
  const names = { overdue: '过往任务', today: `今天 ${weekdayName(new Date())}`, tomorrow: `明天 ${weekdayName(new Date(Date.now() + 86400000))}`, upcoming: '后续日程' };
  return `<section class="task-group"><div class="group-header ${group.key === 'today' ? 'today' : ''}"><span class="group-chevron">⌄</span><span>${names[group.key]}</span><strong>${group.tasks.length}</strong></div><div class="task-list">${group.tasks.map(renderTask).join('')}</div></section>`;
}

function renderTask(task) {
  const overdue = task.due < dayKey(0) && !task.done;
  const priority = priorityValue(task.priority);
  const repeat = normalizeRepeat(task.repeat);
  const timeLabel = task.dueTime ? ` · ${task.dueTime}` : '';
  return `<article class="task-row ${task.done ? 'done' : ''} ${overdue ? 'overdue' : ''}" data-id="${task.id}">
    <button class="checkbox" data-action="toggle" aria-label="${task.done ? '取消完成' : '完成任务'}"></button>
    <button class="priority-flag priority-${priority}" data-action="priority" title="优先级 P${priority}">⚑</button>
    <div class="task-body"><div class="task-title" data-action="rename" title="双击修改">${escapeHtml(task.title)}</div><div class="task-meta"><span class="task-tag">#${escapeHtml(task.tag || task.category)}</span>${repeat ? `<span class="repeat-icon" title="${repeatLabel(repeat)}">↻ ${repeatLabel(repeat)}</span>` : ''}</div></div>
    <span class="task-date">${dateLong(task.due)}${timeLabel}</span><button class="delete-task" data-action="delete" title="删除任务">×</button>
  </article>`;
}

function repeatLabel(repeat) {
  return ({ daily: '每天', weekdays: '工作日', weekly: '每周', monthly: '每月', yearly: '每年' })[repeat] || '';
}

function renderCategories() {
  const counts = Object.fromEntries(state.categories.map((category) => [category, state.tasks.filter((task) => task.category === category && !task.done).length]));
  els.categoryList.innerHTML = `<button class="category-item ${state.selectedCategory === '全部' ? 'active' : ''}" data-category="全部"><span class="category-dot" style="background:#13a8aa"></span><span>全部</span><span class="category-count">${state.tasks.filter((task) => !task.done).length}</span></button>` + state.categories.map((category) => `<button class="category-item ${state.selectedCategory === category ? 'active' : ''}" data-category="${escapeHtml(category)}"><span class="category-dot" style="background:${COLORS[category] || '#13a8aa'}"></span><span>${escapeHtml(category)}</span><span class="category-count">${counts[category] || ''}</span></button>`).join('');
}

function renderTags() {
  const tags = [...new Set(state.tasks.map((task) => task.tag).filter(Boolean))];
  els.tagList.innerHTML = tags.length ? tags.map((tag) => `<button class="tag-chip" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</button>`).join('') : '<span style="color:#a8b1b2;font-size:11px;padding:0 2px">还没有标签</span>';
}

function addTask(rawTitle) {
  const title = rawTitle.trim();
  if (!title) return;
  let due = dayKey(0);
  let dueTime = '';
  let repeat = '';
  let priority = 4;
  let cleanTitle = title;
  if (/后天/.test(cleanTitle)) { due = dayKey(2); cleanTitle = cleanTitle.replace('后天', '').trim(); }
  else if (/明天/.test(cleanTitle)) { due = dayKey(1); cleanTitle = cleanTitle.replace('明天', '').trim(); }
  else if (/今天/.test(cleanTitle)) { due = dayKey(0); cleanTitle = cleanTitle.replace('今天', '').trim(); }
  const weekdayMatch = cleanTitle.match(/(下周)?周([一二三四五六日天])/);
  if (weekdayMatch) {
    const weekday = { 日: 0, 天: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 }[weekdayMatch[2]];
    due = nextWeekday(weekday, Boolean(weekdayMatch[1]));
    cleanTitle = cleanTitle.replace(weekdayMatch[0], '').trim();
  }
  const explicitDate = cleanTitle.match(/(\d{4})[-年](\d{1,2})[-月](\d{1,2})日?/);
  if (explicitDate) {
    due = `${explicitDate[1]}-${String(explicitDate[2]).padStart(2, '0')}-${String(explicitDate[3]).padStart(2, '0')}`;
    cleanTitle = cleanTitle.replace(explicitDate[0], '').trim();
  }
  const monthDay = cleanTitle.match(/(\d{1,2})月(\d{1,2})日?/);
  if (monthDay && !explicitDate) {
    const year = new Date().getFullYear();
    due = `${year}-${String(monthDay[1]).padStart(2, '0')}-${String(monthDay[2]).padStart(2, '0')}`;
    cleanTitle = cleanTitle.replace(monthDay[0], '').trim();
  }
  const timeMatch = cleanTitle.match(/(?:^|\s)([01]?\d|2[0-3]):([0-5]\d)(?=\s|$)/);
  if (timeMatch) { dueTime = `${String(timeMatch[1]).padStart(2, '0')}:${timeMatch[2]}`; cleanTitle = cleanTitle.replace(timeMatch[0], ' ').trim(); }
  const repeatMatch = cleanTitle.match(/每(天|日|周|星期|月|年)|工作日/);
  if (repeatMatch) {
    repeat = repeatMatch[0] === '工作日' ? 'weekdays' : ({ '天': 'daily', '日': 'daily', '周': 'weekly', '星期': 'weekly', '月': 'monthly', '年': 'yearly' })[repeatMatch[1]];
    cleanTitle = cleanTitle.replace(repeatMatch[0], '').trim();
  }
  const priorityMatch = cleanTitle.match(/(?:^|\s)p([1-4])(?=\s|$)/i);
  if (priorityMatch) { priority = Number(priorityMatch[1]); cleanTitle = cleanTitle.replace(priorityMatch[0], ' ').trim(); }
  const tagMatch = cleanTitle.match(/#([^\s#]+)/);
  const tag = tagMatch ? tagMatch[1] : state.selectedCategory === '工作' ? '待办' : state.selectedCategory;
  cleanTitle = cleanTitle.replace(/#([^\s#]+)/, '').trim();
  state.tasks.unshift({ id: crypto.randomUUID(), title: cleanTitle, category: state.selectedCategory === '全部' ? '未分类' : state.selectedCategory, tag, due, dueTime, repeat, priority, done: false });
  save(); render(); showToast('已添加任务');
}

function handleTaskAction(event) {
  const button = event.target.closest('[data-action]');
  const row = event.target.closest('.task-row');
  if (!button || !row) return;
  const task = state.tasks.find((item) => item.id === row.dataset.id);
  if (!task) return;
  if (button.dataset.action === 'toggle') {
    const repeat = normalizeRepeat(task.repeat);
    if (!task.done && repeat) { task.due = advanceDate(task.due, repeat); showToast(`本次完成，下一次安排在 ${dateLabel(task.due)}`); }
    else { task.done = !task.done; showToast(task.done ? '任务已完成' : '已恢复任务'); }
    save(); render();
  }
  if (button.dataset.action === 'priority') { task.priority = priorityValue(task.priority) === 4 ? 1 : priorityValue(task.priority) + 1; save(); render(); showToast(`已设置为 P${task.priority}`); }
  if (button.dataset.action === 'delete') { state.tasks = state.tasks.filter((item) => item.id !== task.id); save(); render(); showToast('任务已删除'); }
  if (button.dataset.action === 'rename' && event.detail === 2) {
    const next = window.prompt('修改任务名称', task.title);
    if (next?.trim()) { task.title = next.trim(); save(); render(); }
  }
}

function showToast(message) {
  els.toast.textContent = message; els.toast.classList.add('show');
  clearTimeout(showToast.timer); showToast.timer = setTimeout(() => els.toast.classList.remove('show'), 1600);
}

function buildExportPayload() {
  return {
    format: 'todo-list',
    version: 1,
    exportedAt: new Date().toISOString(),
    categories: state.categories,
    tasks: state.tasks.map(({ title, category, tag, due, dueTime, repeat, priority, done }) => ({ title, category, tag, due, dueTime: dueTime || '', repeat: normalizeRepeat(repeat), priority: priorityValue(priority), done }))
  };
}

function exportJson() {
  return JSON.stringify(buildExportPayload(), null, 2);
}

function openDataModal() {
  els.dataText.value = exportJson();
  els.importMessage.textContent = '你可以直接修改这段 JSON 后导入。';
  els.importMessage.classList.remove('success');
  els.dataModal.classList.remove('hidden');
  els.dataText.focus();
}

function closeDataModal() {
  els.dataModal.classList.add('hidden');
}

function parseImportText(raw) {
  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();
  const parsed = JSON.parse(text);
  const sourceTasks = Array.isArray(parsed) ? parsed : parsed?.tasks;
  if (!Array.isArray(sourceTasks)) throw new Error('未找到 tasks 数组');
  if (sourceTasks.length > 1000) throw new Error('一次最多导入 1000 个任务');
  const categories = Array.isArray(parsed?.categories) ? parsed.categories.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()) : [];
  const tasks = sourceTasks.map((item, index) => {
    if (!item || typeof item !== 'object' || typeof item.title !== 'string' || !item.title.trim()) throw new Error(`第 ${index + 1} 个任务缺少 title`);
    const due = typeof item.due === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.due) ? item.due : dayKey(0);
    const category = typeof item.category === 'string' && item.category.trim() ? item.category.trim() : '未分类';
    return { id: crypto.randomUUID(), title: item.title.trim(), category, tag: typeof item.tag === 'string' && item.tag.trim() ? item.tag.trim() : category, due, dueTime: typeof item.dueTime === 'string' && /^\d{2}:\d{2}$/.test(item.dueTime) ? item.dueTime : '', repeat: normalizeRepeat(item.repeat), priority: priorityValue(item.priority), done: Boolean(item.done) };
  });
  return { categories, tasks };
}

async function copyExportJson() {
  const text = exportJson();
  els.dataText.value = text;
  try { await navigator.clipboard.writeText(text); showToast('JSON 已复制到剪贴板'); }
  catch { els.dataText.select(); document.execCommand('copy'); showToast('JSON 已复制到剪贴板'); }
}

function downloadExportJson() {
  const blob = new Blob([exportJson()], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `todo-list-${dayKey(0)}.json`; link.click();
  URL.revokeObjectURL(url); showToast('JSON 文件已准备下载');
}

function importJson() {
  try {
    const imported = parseImportText(els.dataText.value);
    const mergedCategories = [...new Set([...state.categories, ...imported.categories, ...imported.tasks.map((task) => task.category)])];
    state.categories = mergedCategories.length ? mergedCategories : state.categories;
    state.tasks = imported.tasks;
    state.selectedCategory = '全部';
    save(); render();
    els.importMessage.textContent = `已导入 ${imported.tasks.length} 个任务`;
    els.importMessage.classList.add('success');
    showToast(`已导入 ${imported.tasks.length} 个任务`);
  } catch (error) {
    els.importMessage.textContent = `导入失败：${error.message || 'JSON 格式不正确'}`;
    els.importMessage.classList.remove('success');
  }
}

function renderTimer() {
  const minutes = String(Math.floor(state.timerSeconds / 60)).padStart(2, '0');
  const seconds = String(state.timerSeconds % 60).padStart(2, '0');
  els.timerDisplay.textContent = `${minutes}:${seconds}`;
  els.timerIcon.textContent = state.timerRunning ? 'Ⅱ' : '▶';
  els.timerText.textContent = state.timerRunning ? '暂停专注' : '番茄专注';
}

function toggleTimer() {
  state.timerRunning = !state.timerRunning;
  if (state.timerRunning) state.timerHandle = setInterval(() => { state.timerSeconds = Math.max(0, state.timerSeconds - 1); if (!state.timerSeconds) { state.timerRunning = false; clearInterval(state.timerHandle); showToast('专注完成，休息一下吧'); } renderTimer(); }, 1000);
  else clearInterval(state.timerHandle);
  renderTimer();
}

els.quickAdd.addEventListener('keydown', (event) => { if (event.key === 'Enter') { addTask(els.quickAdd.value); els.quickAdd.value = ''; } });
els.sidebarSearch.addEventListener('input', (event) => { state.search = event.target.value; render(); });
els.taskGroups.addEventListener('click', handleTaskAction);
document.querySelector('#dataBtn').addEventListener('click', openDataModal);
document.querySelector('#closeDataBtn').addEventListener('click', closeDataModal);
document.querySelector('#copyExportBtn').addEventListener('click', copyExportJson);
document.querySelector('#downloadExportBtn').addEventListener('click', downloadExportJson);
document.querySelector('#importBtn').addEventListener('click', importJson);
els.dataModal.addEventListener('click', (event) => { if (event.target === els.dataModal) closeDataModal(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !els.dataModal.classList.contains('hidden')) closeDataModal(); });
els.categoryList.addEventListener('click', (event) => { const button = event.target.closest('[data-category]'); if (!button) return; state.selectedCategory = button.dataset.category; render(); });
els.tagList.addEventListener('click', (event) => { const button = event.target.closest('[data-tag]'); if (!button) return; els.sidebarSearch.value = button.dataset.tag; state.search = button.dataset.tag; render(); });
document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active')); button.classList.add('active'); state.selectedView = button.dataset.view; if (state.selectedView === 'inbox') state.selectedCategory = '全部'; render(); }));
document.querySelector('#filterBtn').addEventListener('click', () => els.filterPanel.classList.toggle('hidden'));
document.querySelector('#sortBtn').addEventListener('click', () => { state.sortAscending = !state.sortAscending; render(); showToast(state.sortAscending ? '已按日期正序排列' : '已按日期倒序排列'); });
document.querySelectorAll('.filter-chip').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('.filter-chip').forEach((item) => item.classList.remove('active')); button.classList.add('active'); state.filter = button.dataset.filter; render(); }));
document.querySelector('#addCategoryBtn').addEventListener('click', () => { const category = window.prompt('新建分类'); if (category?.trim() && !state.categories.includes(category.trim())) { state.categories.push(category.trim()); save(); render(); showToast('分类已创建'); } });
document.querySelector('#timerStart').addEventListener('click', toggleTimer);
document.querySelector('#timerStop').addEventListener('click', () => { state.timerRunning = false; clearInterval(state.timerHandle); state.timerSeconds = 40 * 60; renderTimer(); showToast('计时已重置'); });
document.querySelector('#timerReset').addEventListener('click', () => showToast('白噪音功能将在后续版本加入'));
document.addEventListener('keydown', (event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); els.quickAdd.focus(); } });

render();
renderTimer();
