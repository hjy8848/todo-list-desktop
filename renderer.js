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
  calendarCursor: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  selectedTaskId: null,
  noiseRunning: false,
  noiseContext: null,
  noiseSource: null,
  noiseGain: null,
  undoSnapshot: null,
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
  calendarView: document.querySelector('#calendarView'),
  reviewView: document.querySelector('#reviewView'),
  detailDrawer: document.querySelector('#detailDrawer'),
  detailTaskTitle: document.querySelector('#detailTaskTitle'),
  detailDue: document.querySelector('#detailDue'),
  detailDueTime: document.querySelector('#detailDueTime'),
  detailCategory: document.querySelector('#detailCategory'),
  detailPriority: document.querySelector('#detailPriority'),
  detailRepeat: document.querySelector('#detailRepeat'),
  detailReminder: document.querySelector('#detailReminder'),
  detailTag: document.querySelector('#detailTag'),
  detailNotes: document.querySelector('#detailNotes'),
  subtaskList: document.querySelector('#subtaskList'),
  dataModal: document.querySelector('#dataModal'),
  dataText: document.querySelector('#dataText'),
  importMessage: document.querySelector('#importMessage'),
  timerDisplay: document.querySelector('#timerDisplay'),
  timerStart: document.querySelector('#timerStart'),
  timerIcon: document.querySelector('#timerIcon'),
  timerText: document.querySelector('#timerText'),
  toast: document.querySelector('#toast'),
  toastMessage: document.querySelector('#toastMessage'),
  toastAction: document.querySelector('#toastAction')
};

function dayKey(offset = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function dateToKey(date) {
  const safe = new Date(date);
  safe.setHours(12, 0, 0, 0);
  return safe.toISOString().slice(0, 10);
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
  let visible = getVisibleTasks().sort((a, b) => {
    const dateOrder = state.sortAscending ? a.due.localeCompare(b.due) : b.due.localeCompare(a.due);
    return dateOrder || priorityValue(a.priority) - priorityValue(b.priority) || state.tasks.indexOf(a) - state.tasks.indexOf(b);
  });
  if (state.selectedView === 'recent') {
    const cutoff = Date.now() - 14 * 86400000;
    visible = visible.filter((task) => !task.createdAt || new Date(task.createdAt).getTime() >= cutoff).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }
  const groups = groupTasks(visible);
  els.taskGroups.innerHTML = groups.map(renderGroup).join('');
  const specialView = state.selectedView === 'calendar' || state.selectedView === 'review';
  els.taskGroups.classList.toggle('hidden', specialView);
  els.calendarView.classList.toggle('hidden', state.selectedView !== 'calendar');
  els.reviewView.classList.toggle('hidden', state.selectedView !== 'review');
  els.emptyState.classList.toggle('hidden', specialView || visible.length > 0);
  els.inboxCount.textContent = state.tasks.filter((task) => !task.done).length || '';
  els.todayCompleted.textContent = state.tasks.filter((task) => task.due === dayKey(0) && task.done).length;
  const titles = { day: 'Day Todo', recent: '最近待办', calendar: '日程概览', inbox: '待办箱', review: '数据复盘' };
  els.pageTitle.textContent = state.selectedCategory === '全部' && !specialView ? '全部待办' : state.selectedCategory === '工作' && state.selectedView === 'day' ? 'Day Todo' : titles[state.selectedView];
  els.dateEyebrow.textContent = state.selectedView === 'day' ? new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase() : 'TODO LIST';
  if (state.selectedView === 'calendar') renderCalendar();
  if (state.selectedView === 'review') renderReview();
}

function renderGroup(group) {
  const names = { overdue: '过往任务', today: `今天 ${weekdayName(new Date())}`, tomorrow: `明天 ${weekdayName(new Date(Date.now() + 86400000))}`, upcoming: '后续日程' };
  return `<section class="task-group"><div class="group-header ${group.key === 'today' ? 'today' : ''}"><span class="group-chevron">⌄</span><span>${names[group.key]}</span><strong>${group.tasks.length}</strong></div><div class="task-list">${group.tasks.map(renderTask).join('')}</div></section>`;
}

function renderCalendar() {
  const cursor = state.calendarCursor;
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPreviousMonth = new Date(year, month, 0).getDate();
  const visibleTasks = state.tasks.filter((task) => state.selectedCategory === '全部' || task.category === state.selectedCategory);
  const cells = [];
  for (let index = 0; index < 42; index += 1) {
    const dayNumber = index - firstDay + 1;
    const muted = dayNumber < 1 || dayNumber > daysInMonth;
    const actualDay = dayNumber < 1 ? daysInPreviousMonth + dayNumber : dayNumber > daysInMonth ? dayNumber - daysInMonth : dayNumber;
    const cellDate = new Date(year, month + (dayNumber < 1 ? -1 : dayNumber > daysInMonth ? 1 : 0), actualDay);
    const key = dateToKey(cellDate);
    const tasks = visibleTasks.filter((task) => task.due === key).slice(0, 4);
    cells.push(`<div class="calendar-cell ${muted ? 'muted' : ''} ${key === dayKey(0) ? 'today' : ''}"><div class="calendar-day">${actualDay}</div>${tasks.map((task) => `<button class="calendar-task" data-calendar-task="${task.id}" title="${escapeHtml(task.title)}">${priorityValue(task.priority) < 4 ? `P${priorityValue(task.priority)} · ` : ''}${escapeHtml(task.title)}</button>`).join('')}</div>`);
  }
  els.calendarView.innerHTML = `<div class="calendar-toolbar"><h2>${year}年${month + 1}月</h2><div class="calendar-nav"><button data-calendar-nav="today">今天</button><button data-calendar-nav="prev">‹</button><button data-calendar-nav="next">›</button></div></div><div class="calendar-grid">${['日', '一', '二', '三', '四', '五', '六'].map((day) => `<div class="calendar-weekday">${day}</div>`).join('')}${cells.join('')}</div>`;
}

function renderReview() {
  const total = state.tasks.length;
  const done = state.tasks.filter((task) => task.done).length;
  const open = total - done;
  const today = state.tasks.filter((task) => task.due === dayKey(0)).length;
  const rate = total ? Math.round((done / total) * 100) : 0;
  const categoryStats = state.categories.map((category) => ({ category, count: state.tasks.filter((task) => task.category === category).length })).filter((item) => item.count);
  const priorityStats = [1, 2, 3, 4].map((priority) => ({ priority, count: state.tasks.filter((task) => priorityValue(task.priority) === priority && !task.done).length })).filter((item) => item.count);
  els.reviewView.innerHTML = `<div class="review-summary"><div class="stat-card"><div class="stat-label">全部任务</div><div class="stat-value">${total}</div></div><div class="stat-card"><div class="stat-label">未完成</div><div class="stat-value">${open}</div></div><div class="stat-card"><div class="stat-label">今日任务</div><div class="stat-value">${today}</div></div><div class="stat-card"><div class="stat-label">完成率</div><div class="stat-value">${rate}%</div></div></div><div class="review-card"><h3>整体完成进度</h3><div class="progress-track"><div class="progress-fill" style="width:${rate}%"></div></div><p class="muted-copy">已完成 ${done} / ${total} 个任务</p></div><div class="review-card"><h3>分类分布</h3><div class="review-list">${categoryStats.length ? categoryStats.map((item) => `<div class="review-item"><span>${escapeHtml(item.category)}</span><strong>${item.count}</strong></div>`).join('') : '<div class="muted-copy">还没有任务</div>'}</div></div><div class="review-card"><h3>未完成优先级</h3><div class="review-list">${priorityStats.length ? priorityStats.map((item) => `<div class="review-item"><span>P${item.priority}</span><strong>${item.count}</strong></div>`).join('') : '<div class="muted-copy">所有任务都完成了</div>'}</div></div>`;
}

function checkReminders() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const now = Date.now();
  let changed = false;
  state.tasks.forEach((task) => {
    if (!task.reminderAt || task.done || new Date(task.reminderAt).getTime() > now || task.remindedAt === task.reminderAt) return;
    new Notification(`Todo提醒：${task.title}`, { body: `${dateLong(task.due)}${task.dueTime ? ` · ${task.dueTime}` : ''}` });
    task.remindedAt = task.reminderAt;
    changed = true;
  });
  if (changed) save();
}

function renderTask(task) {
  const overdue = task.due < dayKey(0) && !task.done;
  const priority = priorityValue(task.priority);
  const repeat = normalizeRepeat(task.repeat);
  const timeLabel = task.dueTime ? ` · ${task.dueTime}` : '';
  return `<article class="task-row ${task.done ? 'done' : ''} ${overdue ? 'overdue' : ''}" data-id="${task.id}" draggable="true">
    <button class="checkbox" data-action="toggle" aria-label="${task.done ? '取消完成' : '完成任务'}"></button>
    <button class="priority-flag priority-${priority}" data-action="priority" title="优先级 P${priority}">⚑</button>
    <div class="task-body"><div class="task-title" data-action="detail" title="点击查看详情，双击修改">${escapeHtml(task.title)}</div><div class="task-meta"><span class="task-tag">#${escapeHtml(task.tag || task.category)}</span>${repeat ? `<span class="repeat-icon" title="${repeatLabel(repeat)}">↻ ${repeatLabel(repeat)}</span>` : ''}</div></div>
    <span class="task-date">${dateLong(task.due)}${timeLabel}</span><button class="delete-task" data-action="delete" title="删除任务">×</button>
  </article>`;
}

function repeatLabel(repeat) {
  return ({ daily: '每天', weekdays: '工作日', weekly: '每周', monthly: '每月', yearly: '每年' })[repeat] || '';
}

function findTask(id = state.selectedTaskId) {
  return state.tasks.find((task) => task.id === id);
}

function renderSubtasks(task) {
  els.subtaskList.innerHTML = (task.subtasks || []).map((subtask) => `<div class="subtask-row" data-subtask-id="${subtask.id}"><input type="checkbox" data-subtask-action="toggle" ${subtask.done ? 'checked' : ''}><input type="text" data-subtask-action="rename" value="${escapeHtml(subtask.title)}"><button class="subtask-remove" data-subtask-action="delete" title="删除子任务">×</button></div>`).join('') || '<div class="muted-copy">还没有子任务</div>';
}

function openDetail(id) {
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return;
  state.selectedTaskId = id;
  els.detailTaskTitle.value = task.title;
  els.detailDue.value = task.due || dayKey(0);
  els.detailDueTime.value = task.dueTime || '';
  els.detailCategory.innerHTML = state.categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');
  if (!state.categories.includes(task.category)) { state.categories.push(task.category); els.detailCategory.innerHTML += `<option value="${escapeHtml(task.category)}">${escapeHtml(task.category)}</option>`; }
  els.detailCategory.value = task.category;
  els.detailPriority.value = String(priorityValue(task.priority));
  els.detailRepeat.value = normalizeRepeat(task.repeat);
  els.detailReminder.value = task.reminderAt || '';
  els.detailTag.value = task.tag || '';
  els.detailNotes.value = task.notes || '';
  renderSubtasks(task);
  els.detailDrawer.classList.remove('hidden');
}

function closeDetail() {
  els.detailDrawer.classList.add('hidden');
  state.selectedTaskId = null;
}

function saveDetail() {
  const task = findTask();
  if (!task) return;
  task.title = els.detailTaskTitle.value.trim() || task.title;
  task.due = els.detailDue.value || dayKey(0);
  task.dueTime = els.detailDueTime.value || '';
  task.category = els.detailCategory.value || '未分类';
  task.priority = priorityValue(els.detailPriority.value);
  task.repeat = normalizeRepeat(els.detailRepeat.value);
  task.reminderAt = els.detailReminder.value || '';
  task.tag = els.detailTag.value.trim() || task.category;
  task.notes = els.detailNotes.value.trim();
  if (task.reminderAt && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  save(); render(); closeDetail(); showToast('任务详情已保存');
}

function addSubtask() {
  const task = findTask();
  if (!task) return;
  if (!Array.isArray(task.subtasks)) task.subtasks = [];
  task.subtasks.push({ id: crypto.randomUUID(), title: '新子任务', done: false });
  save(); renderSubtasks(task);
  const input = els.subtaskList.querySelector('input[type="text"]:last-of-type');
  if (input) { input.focus(); input.select(); }
}

function handleSubtaskAction(event) {
  const row = event.target.closest('[data-subtask-id]');
  const action = event.target.closest('[data-subtask-action]')?.dataset.subtaskAction;
  const task = findTask();
  if (!row || !action || !task) return;
  const subtask = (task.subtasks || []).find((item) => item.id === row.dataset.subtaskId);
  if (!subtask) return;
  if (action === 'toggle') subtask.done = event.target.checked;
  if (action === 'rename') subtask.title = event.target.value;
  if (action === 'delete') task.subtasks = task.subtasks.filter((item) => item.id !== subtask.id);
  save(); renderSubtasks(task);
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
  state.tasks.unshift({ id: crypto.randomUUID(), title: cleanTitle, category: state.selectedCategory === '全部' ? '未分类' : state.selectedCategory, tag, due, dueTime, repeat, priority, done: false, createdAt: new Date().toISOString(), subtasks: [] });
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
  if (button.dataset.action === 'detail' && event.detail === 1) openDetail(task.id);
  if (button.dataset.action === 'detail' && event.detail === 2) {
    const next = window.prompt('修改任务名称', task.title);
    if (next?.trim()) { task.title = next.trim(); save(); render(); }
  }
}

function showToast(message, actionLabel = '', actionHandler = null) {
  els.toastMessage.textContent = message;
  els.toastAction.textContent = actionLabel;
  els.toastAction.classList.toggle('hidden', !actionLabel);
  els.toastAction.onclick = actionHandler;
  els.toast.classList.add('show');
  clearTimeout(showToast.timer); showToast.timer = setTimeout(() => els.toast.classList.remove('show'), actionLabel ? 5000 : 1600);
}

function buildExportPayload() {
  return {
    format: 'todo-list',
    version: 1,
    exportedAt: new Date().toISOString(),
    categories: state.categories,
    tasks: state.tasks.map(({ title, category, tag, due, dueTime, repeat, priority, done, notes, reminderAt, createdAt, subtasks }) => ({ title, category, tag, due, dueTime: dueTime || '', repeat: normalizeRepeat(repeat), priority: priorityValue(priority), done, notes: notes || '', reminderAt: reminderAt || '', createdAt: createdAt || '', subtasks: (subtasks || []).map(({ title: subtaskTitle, done: subtaskDone }) => ({ title: subtaskTitle, done: Boolean(subtaskDone) })) }))
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
    return { id: crypto.randomUUID(), title: item.title.trim(), category, tag: typeof item.tag === 'string' && item.tag.trim() ? item.tag.trim() : category, due, dueTime: typeof item.dueTime === 'string' && /^\d{2}:\d{2}$/.test(item.dueTime) ? item.dueTime : '', repeat: normalizeRepeat(item.repeat), priority: priorityValue(item.priority), done: Boolean(item.done), notes: typeof item.notes === 'string' ? item.notes : '', reminderAt: typeof item.reminderAt === 'string' ? item.reminderAt : '', createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(), subtasks: Array.isArray(item.subtasks) ? item.subtasks.filter((subtask) => subtask && typeof subtask.title === 'string').map((subtask) => ({ id: crypto.randomUUID(), title: subtask.title.trim(), done: Boolean(subtask.done) })) : [] };
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
    state.undoSnapshot = { tasks: state.tasks, categories: state.categories };
    const mergedCategories = [...new Set([...state.categories, ...imported.categories, ...imported.tasks.map((task) => task.category)])];
    state.categories = mergedCategories.length ? mergedCategories : state.categories;
    state.tasks = imported.tasks;
    state.selectedCategory = '全部';
    save(); render();
    els.importMessage.textContent = `已导入 ${imported.tasks.length} 个任务`;
    els.importMessage.classList.add('success');
    showToast(`已导入 ${imported.tasks.length} 个任务`, '撤销', undoImport);
  } catch (error) {
    els.importMessage.textContent = `导入失败：${error.message || 'JSON 格式不正确'}`;
    els.importMessage.classList.remove('success');
  }
}

function undoImport() {
  if (!state.undoSnapshot) return;
  state.tasks = state.undoSnapshot.tasks;
  state.categories = state.undoSnapshot.categories;
  state.undoSnapshot = null;
  save(); render(); showToast('已撤销导入');
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

function toggleNoise() {
  if (state.noiseRunning) {
    state.noiseSource?.stop();
    state.noiseContext?.close();
    state.noiseRunning = false;
    document.querySelector('#timerReset').textContent = '白噪音';
    document.querySelector('#timerReset').classList.remove('noise-active');
    showToast('白噪音已关闭');
    return;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) { showToast('当前系统不支持白噪音'); return; }
  const context = new AudioContextClass();
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer; source.loop = true; gain.gain.value = 0.035;
  source.connect(gain).connect(context.destination); source.start();
  state.noiseContext = context; state.noiseSource = source; state.noiseGain = gain; state.noiseRunning = true;
  document.querySelector('#timerReset').textContent = '关闭白噪音';
  document.querySelector('#timerReset').classList.add('noise-active');
  showToast('白噪音已开启');
}

function renameOrDeleteCategory(category) {
  if (category === '未分类') { showToast('未分类不能删除'); return; }
  const next = window.prompt('输入新名称；留空则删除该分类', category);
  if (next === null) return;
  const trimmed = next.trim();
  if (!trimmed) {
    state.categories = state.categories.filter((item) => item !== category);
    state.tasks.forEach((task) => { if (task.category === category) task.category = '未分类'; });
    if (state.selectedCategory === category) state.selectedCategory = '未分类';
    save(); render(); showToast('分类已删除，相关任务已移到未分类');
    return;
  }
  if (state.categories.includes(trimmed)) { showToast('该分类已经存在'); return; }
  state.categories = state.categories.map((item) => item === category ? trimmed : item);
  state.tasks.forEach((task) => { if (task.category === category) task.category = trimmed; });
  if (state.selectedCategory === category) state.selectedCategory = trimmed;
  save(); render(); showToast('分类已重命名');
}

function reorderTask(dragId, targetId) {
  if (!dragId || !targetId || dragId === targetId) return;
  const from = state.tasks.findIndex((task) => task.id === dragId);
  const to = state.tasks.findIndex((task) => task.id === targetId);
  if (from < 0 || to < 0) return;
  const [moved] = state.tasks.splice(from, 1);
  state.tasks.splice(to, 0, moved);
  save(); render(); showToast('任务顺序已更新');
}

els.quickAdd.addEventListener('keydown', (event) => { if (event.key === 'Enter') { addTask(els.quickAdd.value); els.quickAdd.value = ''; } });
els.sidebarSearch.addEventListener('input', (event) => { state.search = event.target.value; render(); });
els.taskGroups.addEventListener('click', handleTaskAction);
els.taskGroups.addEventListener('dragstart', (event) => { const row = event.target.closest('.task-row'); if (row) { state.dragTaskId = row.dataset.id; row.classList.add('dragging'); } });
els.taskGroups.addEventListener('dragend', (event) => { event.target.closest('.task-row')?.classList.remove('dragging'); state.dragTaskId = null; });
els.taskGroups.addEventListener('dragover', (event) => { if (event.target.closest('.task-row')) event.preventDefault(); });
els.taskGroups.addEventListener('drop', (event) => { const row = event.target.closest('.task-row'); if (!row) return; event.preventDefault(); reorderTask(state.dragTaskId, row.dataset.id); });
els.calendarView.addEventListener('click', (event) => {
  const taskButton = event.target.closest('[data-calendar-task]');
  if (taskButton) { openDetail(taskButton.dataset.calendarTask); return; }
  const nav = event.target.closest('[data-calendar-nav]');
  if (!nav) return;
  if (nav.dataset.calendarNav === 'today') state.calendarCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  if (nav.dataset.calendarNav === 'prev') state.calendarCursor = new Date(state.calendarCursor.getFullYear(), state.calendarCursor.getMonth() - 1, 1);
  if (nav.dataset.calendarNav === 'next') state.calendarCursor = new Date(state.calendarCursor.getFullYear(), state.calendarCursor.getMonth() + 1, 1);
  renderCalendar();
});
els.subtaskList.addEventListener('change', handleSubtaskAction);
els.subtaskList.addEventListener('click', handleSubtaskAction);
document.querySelector('#closeDetailBtn').addEventListener('click', closeDetail);
document.querySelector('#saveDetailBtn').addEventListener('click', saveDetail);
document.querySelector('#deleteDetailBtn').addEventListener('click', () => { const task = findTask(); if (!task) return; state.tasks = state.tasks.filter((item) => item.id !== task.id); save(); closeDetail(); render(); showToast('任务已删除'); });
document.querySelector('#addSubtaskBtn').addEventListener('click', addSubtask);
els.detailDrawer.addEventListener('click', (event) => { if (event.target === els.detailDrawer) closeDetail(); });
document.querySelector('#dataBtn').addEventListener('click', openDataModal);
document.querySelector('#closeDataBtn').addEventListener('click', closeDataModal);
document.querySelector('#copyExportBtn').addEventListener('click', copyExportJson);
document.querySelector('#downloadExportBtn').addEventListener('click', downloadExportJson);
document.querySelector('#importBtn').addEventListener('click', importJson);
els.dataModal.addEventListener('click', (event) => { if (event.target === els.dataModal) closeDataModal(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !els.dataModal.classList.contains('hidden')) closeDataModal(); if (event.key === 'Escape' && !els.detailDrawer.classList.contains('hidden')) closeDetail(); });
els.categoryList.addEventListener('click', (event) => { const button = event.target.closest('[data-category]'); if (!button) return; state.selectedCategory = button.dataset.category; render(); });
els.categoryList.addEventListener('contextmenu', (event) => { const button = event.target.closest('[data-category]'); if (!button || button.dataset.category === '全部') return; event.preventDefault(); renameOrDeleteCategory(button.dataset.category); });
els.tagList.addEventListener('click', (event) => { const button = event.target.closest('[data-tag]'); if (!button) return; els.sidebarSearch.value = button.dataset.tag; state.search = button.dataset.tag; render(); });
document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active')); button.classList.add('active'); state.selectedView = button.dataset.view; if (['inbox', 'recent', 'calendar', 'review'].includes(state.selectedView)) state.selectedCategory = '全部'; render(); }));
document.querySelector('#filterBtn').addEventListener('click', () => els.filterPanel.classList.toggle('hidden'));
document.querySelector('#sortBtn').addEventListener('click', () => { state.sortAscending = !state.sortAscending; render(); showToast(state.sortAscending ? '已按日期正序排列' : '已按日期倒序排列'); });
document.querySelectorAll('.filter-chip').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('.filter-chip').forEach((item) => item.classList.remove('active')); button.classList.add('active'); state.filter = button.dataset.filter; render(); }));
document.querySelector('#addCategoryBtn').addEventListener('click', () => { const category = window.prompt('新建分类'); if (category?.trim() && !state.categories.includes(category.trim())) { state.categories.push(category.trim()); save(); render(); showToast('分类已创建'); } });
document.querySelector('#timerStart').addEventListener('click', toggleTimer);
document.querySelector('#timerStop').addEventListener('click', () => { state.timerRunning = false; clearInterval(state.timerHandle); state.timerSeconds = 40 * 60; renderTimer(); showToast('计时已重置'); });
document.querySelector('#timerReset').addEventListener('click', toggleNoise);
document.querySelector('#syncBtn').addEventListener('click', () => showToast('当前为本地模式，请使用导入 / 导出同步数据'));
document.querySelector('#profileMoreBtn').addEventListener('click', () => showToast('个人资料与云同步将在连接账号后启用'));
document.querySelector('#topMoreBtn').addEventListener('click', openDataModal);
document.addEventListener('keydown', (event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); els.quickAdd.focus(); } });

render();
renderTimer();
setInterval(checkReminders, 30000);
checkReminders();
