import { THREAD_PANEL_DEFAULT_LIMIT, THREAD_PANEL_ROUTES } from '/shared/types/bridge-contracts.mjs';

const state = {
  request: {
    pid: '',
    q: '',
    active: 'all',
    channelType: 'all',
    role: 'all',
    limit: THREAD_PANEL_DEFAULT_LIMIT,
  },
  activeThreadKey: '',
  activeSessionId: '',
  timer: null,
};

const els = {
  statusPill: document.getElementById('status-pill'),
  refreshButton: document.getElementById('refresh-button'),
  searchInput: document.getElementById('search-input'),
  channelFilter: document.getElementById('channel-filter'),
  activeFilter: document.getElementById('active-filter'),
  roleFilter: document.getElementById('role-filter'),
  autoRefresh: document.getElementById('auto-refresh'),
  threadCount: document.getElementById('thread-count'),
  threadList: document.getElementById('thread-list'),
  detailTitle: document.getElementById('detail-title'),
  detailSubtitle: document.getElementById('detail-subtitle'),
  detailMeta: document.getElementById('detail-meta'),
  messageList: document.getElementById('message-list'),
};

function escapeHtml(text) {
  return String(text || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function debounce(fn, delay = 300) {
  let timer = 0;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}

function buildQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== '') search.set(key, String(value));
  });
  return search.toString();
}

async function api(path) {
  const response = await fetch(path, { headers: { Accept: 'application/json' } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || '璇锋眰澶辫触');
  return data;
}

function syncUrl() {
  const query = buildQuery({
    pid: state.request.pid,
    q: state.request.q,
    active: state.request.active,
    channelType: state.request.channelType,
    role: state.request.role,
    threadKey: state.activeThreadKey,
    sessionId: state.activeSessionId,
  });
  const next = `${window.location.pathname}${query ? `?${query}` : ''}`;
  window.history.replaceState(null, '', next);
}

function readInitialState() {
  const params = new URLSearchParams(window.location.search);
  state.request.pid = params.get('pid') || '';
  state.request.q = params.get('q') || '';
  state.request.active = params.get('active') || 'all';
  state.request.channelType = params.get('channelType') || 'all';
  state.request.role = params.get('role') || 'all';
  state.activeThreadKey = params.get('threadKey') || '';
  state.activeSessionId = params.get('sessionId') || '';

  els.searchInput.value = state.request.q;
  els.channelFilter.value = state.request.channelType;
  els.activeFilter.value = state.request.active;
  els.roleFilter.value = state.request.role;
}

function renderStatus(status) {
  const running = !!status?.running;
  els.statusPill.textContent = running ? '妗ユ帴杩愯涓? : '妗ユ帴鏈繍琛?;
  els.statusPill.className = `status-pill ${running ? 'is-running' : 'is-stopped'}`;
}

function renderThreads(threads) {
  els.threadCount.textContent = `${threads.length} 涓嚎绋媊;
  if (!threads.length) {
    els.threadList.innerHTML = '<div class="empty-state">褰撳墠娌℃湁鍙睍绀虹殑妗ユ帴绾跨▼銆?/div>';
    return;
  }

  els.threadList.innerHTML = threads.map((thread) => `
    <button class="thread-item ${thread.threadKey === state.activeThreadKey ? 'is-active' : ''}" data-thread-key="${escapeHtml(thread.threadKey)}" data-session-id="${escapeHtml(thread.sessionId)}">
      <div class="thread-item-header">
        <div class="thread-item-title">${escapeHtml(thread.title)}</div>
        <span class="badge ${thread.active ? 'is-active' : 'is-inactive'}">${thread.active ? '娲昏穬' : '鍋滅敤'}</span>
      </div>
      <div class="thread-item-subtitle">${escapeHtml(thread.subtitle || '鏈缃伐浣滅洰褰?)}</div>
      <div class="thread-item-summary">${escapeHtml(thread.summary)}</div>
      <div class="thread-item-footer">
        <span>${escapeHtml(thread.freshness)}</span>
        <span>${thread.messageCount} 鏉℃秷鎭?/span>
      </div>
    </button>
  `).join('');

  [...els.threadList.querySelectorAll('.thread-item')].forEach((button) => {
    button.addEventListener('click', () => {
      state.activeThreadKey = button.dataset.threadKey || '';
      state.activeSessionId = button.dataset.sessionId || '';
      syncUrl();
      loadThread();
      renderThreads(threads);
    });
  });
}

function renderThreadDetail(detail) {
  if (!detail) {
    els.detailTitle.textContent = '閫夋嫨涓€涓嚎绋?;
    els.detailSubtitle.textContent = '杩欓噷浼氬睍绀鸿绾跨▼鍏宠仈鐨?IM 娑堟伅涓庣姸鎬併€?;
    els.detailMeta.innerHTML = '';
    els.messageList.innerHTML = '<div class="empty-state">璇峰厛浠庡乏渚ч€夋嫨涓€涓嚎绋嬨€?/div>';
    return;
  }

  els.detailTitle.textContent = detail.title;
  els.detailSubtitle.textContent = detail.subtitle || '褰撳墠绾跨▼灏氭湭璁板綍宸ヤ綔鐩綍';
  const meta = [
    `浼氳瘽 ${detail.sessionId || '鏈煡'}`,
    `${detail.filteredCount} / ${detail.totalCount} 鏉,
    detail.role && detail.role !== 'all' ? `瑙掕壊 ${detail.role}` : '',
  ].filter(Boolean);
  els.detailMeta.innerHTML = meta.map((item) => `<div class="meta-chip">${escapeHtml(item)}</div>`).join('');

  if (!detail.messages.length) {
    els.messageList.innerHTML = '<div class="empty-state">褰撳墠杩囨护鏉′欢涓嬫病鏈夋秷鎭€?/div>';
    return;
  }

  els.messageList.innerHTML = detail.messages.map((message) => `
    <article class="message-item is-${escapeHtml(message.role)}">
      <div class="message-meta">
        <strong>${escapeHtml(message.role)}</strong>
        <span>${escapeHtml(message.createdAt || '')}</span>
      </div>
      <div class="message-body">${escapeHtml(message.content)}</div>
    </article>
  `).join('');
}

async function loadBootstrap() {
  const query = buildQuery({
    pid: state.request.pid,
    q: state.request.q,
    active: state.request.active,
    channelType: state.request.channelType,
    role: state.request.role,
    limit: state.request.limit,
    threadKey: state.activeThreadKey,
    sessionId: state.activeSessionId,
  });
  const data = await api(`${THREAD_PANEL_ROUTES.bootstrap}?${query}`);
  renderStatus(data.status);
  renderThreads(data.threads || []);

  if (!state.activeThreadKey && data.threads?.length) {
    state.activeThreadKey = data.threads[0].threadKey;
    state.activeSessionId = data.threads[0].sessionId || '';
    syncUrl();
  }

  if (data.activeThread) {
    renderThreadDetail(data.activeThread);
  } else if (state.activeThreadKey || state.activeSessionId) {
    await loadThread();
  } else {
    renderThreadDetail(null);
  }
}

async function loadThread() {
  if (!state.activeThreadKey && !state.activeSessionId) {
    renderThreadDetail(null);
    return;
  }
  const query = buildQuery({
    threadKey: state.activeThreadKey,
    sessionId: state.activeSessionId,
    role: state.request.role,
    q: state.request.q,
    limit: state.request.limit,
  });
  const detail = await api(`${THREAD_PANEL_ROUTES.thread}?${query}`);
  renderThreadDetail(detail);
}

function scheduleRefresh() {
  window.clearInterval(state.timer);
  if (!els.autoRefresh.checked) return;
  state.timer = window.setInterval(() => {
    loadBootstrap().catch(renderError);
  }, 10000);
}

function renderError(error) {
  els.statusPill.textContent = error.message || '鍔犺浇澶辫触';
  els.statusPill.className = 'status-pill is-stopped';
}

const debouncedReload = debounce(() => {
  state.request.q = els.searchInput.value.trim();
  state.request.channelType = els.channelFilter.value;
  state.request.active = els.activeFilter.value;
  state.request.role = els.roleFilter.value;
  syncUrl();
  loadBootstrap().catch(renderError);
}, 260);

function bindEvents() {
  els.refreshButton.addEventListener('click', () => loadBootstrap().catch(renderError));
  els.searchInput.addEventListener('input', debouncedReload);
  els.channelFilter.addEventListener('change', debouncedReload);
  els.activeFilter.addEventListener('change', debouncedReload);
  els.roleFilter.addEventListener('change', debouncedReload);
  els.autoRefresh.addEventListener('change', scheduleRefresh);
}

async function init() {
  readInitialState();
  bindEvents();
  scheduleRefresh();
  await loadBootstrap();
}

init().catch(renderError);

