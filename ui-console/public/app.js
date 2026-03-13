const THRESHOLD_KEY = 'cti-ui-thresholds';

const defaultThresholds = {
  doctorMissThreshold: 1,
  staleConversationMinutes: 30,
  notifyLevel: 'error',
};

const severityRank = {
  info: 0,
  warn: 1,
  error: 2,
  critical: 3,
};

const state = {
  config: null,
  status: null,
  logTimer: null,
  logSource: null,
  bindings: [],
  audit: [],
  doctor: null,
  conversations: [],
  activeConversation: null,
  conversationTimer: null,
  notifiedAlerts: new Set(),
  thresholds: loadThresholds(),
};

const els = {
  navItems: [...document.querySelectorAll('.nav-item')],
  panels: [...document.querySelectorAll('.panel')],
  statusPill: document.getElementById('status-pill'),
  heroSummary: document.getElementById('hero-summary'),
  heroMeta: document.getElementById('hero-meta'),
  adapterStatus: document.getElementById('adapter-status'),
  logBox: document.getElementById('log-box'),
  logStreamStatus: document.getElementById('log-stream-status'),
  refreshStatus: document.getElementById('refresh-status'),
  refreshLogs: document.getElementById('refresh-logs'),
  refreshBindings: document.getElementById('refresh-bindings'),
  refreshAudit: document.getElementById('refresh-audit'),
  refreshDoctor: document.getElementById('refresh-doctor'),
  refreshConversations: document.getElementById('refresh-conversations'),
  startBridge: document.getElementById('start-bridge'),
  stopBridge: document.getElementById('stop-bridge'),
  restartBridge: document.getElementById('restart-bridge'),
  repairPid: document.getElementById('repair-pid'),
  runAutoRepair: document.getElementById('run-auto-repair'),
  enableNotifications: document.getElementById('enable-notifications'),
  autoRefreshLogs: document.getElementById('auto-refresh-logs'),
  overviewFeedback: document.getElementById('overview-feedback'),
  bindingsFeedback: document.getElementById('bindings-feedback'),
  thresholdFeedback: document.getElementById('threshold-feedback'),
  saveOverview: document.getElementById('save-overview'),
  saveThresholds: document.getElementById('save-thresholds'),
  bindingsList: document.getElementById('bindings-list'),
  auditList: document.getElementById('audit-list'),
  doctorSummary: document.getElementById('doctor-summary'),
  doctorBox: document.getElementById('doctor-box'),
  alertList: document.getElementById('alert-list'),
  suggestionList: document.getElementById('suggestion-list'),
  conversationPid: document.getElementById('conversation-pid'),
  conversationSearch: document.getElementById('conversation-search'),
  conversationActiveFilter: document.getElementById('conversation-active-filter'),
  conversationList: document.getElementById('conversation-list'),
  conversationModal: document.getElementById('conversation-modal'),
  conversationModalTitle: document.getElementById('conversation-modal-title'),
  conversationModalMeta: document.getElementById('conversation-modal-meta'),
  conversationMessageList: document.getElementById('conversation-message-list'),
  closeConversationModal: document.getElementById('close-conversation-modal'),
  refreshConversationDetail: document.getElementById('refresh-conversation-detail'),
  autoRefreshConversation: document.getElementById('auto-refresh-conversation'),
  messageSearch: document.getElementById('message-search'),
  messageRoleFilter: document.getElementById('message-role-filter'),
  auditSearch: document.getElementById('audit-search'),
  auditDirectionFilter: document.getElementById('audit-direction-filter'),
  auditChannelFilter: document.getElementById('audit-channel-filter'),
  exportAuditJson: document.getElementById('export-audit-json'),
  exportAuditCsv: document.getElementById('export-audit-csv'),
  thresholdDoctorMiss: document.getElementById('threshold-doctor-miss'),
  thresholdStaleMinutes: document.getElementById('threshold-stale-minutes'),
  thresholdNotifyLevel: document.getElementById('threshold-notify-level'),
  channelTelegram: document.getElementById('channel-telegram'),
  channelFeishu: document.getElementById('channel-feishu'),
  channelDiscord: document.getElementById('channel-discord'),
  channelQq: document.getElementById('channel-qq'),
  autoStart: document.getElementById('auto-start'),
  tgBotToken: document.getElementById('tg-bot-token'),
  tgTokenHint: document.getElementById('tg-token-hint'),
  tgChatId: document.getElementById('tg-chat-id'),
  tgAllowedUsers: document.getElementById('tg-allowed-users'),
  saveTelegram: document.getElementById('save-telegram'),
  testTelegram: document.getElementById('test-telegram'),
  telegramFeedback: document.getElementById('telegram-feedback'),
  feishuAppId: document.getElementById('feishu-app-id'),
  feishuAppSecret: document.getElementById('feishu-app-secret'),
  feishuSecretHint: document.getElementById('feishu-secret-hint'),
  feishuDomain: document.getElementById('feishu-domain'),
  feishuAllowedUsers: document.getElementById('feishu-allowed-users'),
  saveFeishu: document.getElementById('save-feishu'),
  testFeishu: document.getElementById('test-feishu'),
  feishuFeedback: document.getElementById('feishu-feedback'),
  discordBotToken: document.getElementById('discord-bot-token'),
  discordTokenHint: document.getElementById('discord-token-hint'),
  discordAllowedUsers: document.getElementById('discord-allowed-users'),
  discordAllowedChannels: document.getElementById('discord-allowed-channels'),
  discordAllowedGuilds: document.getElementById('discord-allowed-guilds'),
  saveDiscord: document.getElementById('save-discord'),
  testDiscord: document.getElementById('test-discord'),
  discordFeedback: document.getElementById('discord-feedback'),
  qqAppId: document.getElementById('qq-app-id'),
  qqAppSecret: document.getElementById('qq-app-secret'),
  qqSecretHint: document.getElementById('qq-secret-hint'),
  qqAllowedUsers: document.getElementById('qq-allowed-users'),
  qqImageEnabled: document.getElementById('qq-image-enabled'),
  qqMaxImageSize: document.getElementById('qq-max-image-size'),
  saveQqCredentials: document.getElementById('save-qq-credentials'),
  saveQqUsers: document.getElementById('save-qq-users'),
  saveQqImages: document.getElementById('save-qq-images'),
  testQqConnection: document.getElementById('test-qq-connection'),
  qqTestResult: document.getElementById('qq-test-result'),
};

function loadThresholds() {
  try {
    const saved = JSON.parse(localStorage.getItem(THRESHOLD_KEY) || '{}');
    return { ...defaultThresholds, ...saved };
  } catch {
    return { ...defaultThresholds };
  }
}

function saveThresholdSettings() {
  localStorage.setItem(THRESHOLD_KEY, JSON.stringify(state.thresholds));
}

function showPanel(panelName) {
  els.navItems.forEach((item) => item.classList.toggle('is-active', item.dataset.panel === panelName));
  els.panels.forEach((panel) => panel.classList.toggle('is-active', panel.id === `panel-${panelName}`));
}

async function api(path, options = {}) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '请求失败');
  return data;
}

function escapeHtml(text) {
  return String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function debounce(fn, delay = 350) {
  let timer = null;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}

function setFeedback(target, message, kind = 'success') {
  if (!target) return;
  target.textContent = message;
  target.className = `inline-feedback is-${kind}`;
}

function clearFeedback(target) {
  if (!target) return;
  target.textContent = '';
  target.className = 'inline-feedback';
}

function setStreamStatus(message, kind = 'idle') {
  els.logStreamStatus.textContent = message;
  els.logStreamStatus.className = `stream-pill is-${kind}`;
}

function buildQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== '') search.set(key, String(value));
  });
  return search.toString();
}

function fillThresholds() {
  els.thresholdDoctorMiss.value = String(state.thresholds.doctorMissThreshold);
  els.thresholdStaleMinutes.value = String(state.thresholds.staleConversationMinutes);
  els.thresholdNotifyLevel.value = state.thresholds.notifyLevel;
}

function fillConfig(config) {
  state.config = config;
  const enabled = new Set(config.enabledChannels || []);
  els.channelTelegram.checked = enabled.has('telegram');
  els.channelFeishu.checked = enabled.has('feishu');
  els.channelDiscord.checked = enabled.has('discord');
  els.channelQq.checked = enabled.has('qq');
  els.autoStart.checked = !!config.autoStart;

  els.tgBotToken.value = '';
  els.tgTokenHint.textContent = config.telegram.hasToken ? `当前已保存 Token：${config.telegram.botTokenMasked}` : '当前尚未保存 Token';
  els.tgChatId.value = config.telegram.chatId || '';
  els.tgAllowedUsers.value = config.telegram.allowedUsers || '';

  els.feishuAppId.value = config.feishu.appId || '';
  els.feishuAppSecret.value = '';
  els.feishuSecretHint.textContent = config.feishu.hasSecret ? `当前已保存 Secret：${config.feishu.appSecretMasked}` : '当前尚未保存 Secret';
  els.feishuDomain.value = config.feishu.domain || 'https://open.feishu.cn';
  els.feishuAllowedUsers.value = config.feishu.allowedUsers || '';

  els.discordBotToken.value = '';
  els.discordTokenHint.textContent = config.discord.hasToken ? `当前已保存 Token：${config.discord.botTokenMasked}` : '当前尚未保存 Token';
  els.discordAllowedUsers.value = config.discord.allowedUsers || '';
  els.discordAllowedChannels.value = config.discord.allowedChannels || '';
  els.discordAllowedGuilds.value = config.discord.allowedGuilds || '';

  els.qqAppId.value = config.qq.appId || '';
  els.qqAppSecret.value = '';
  els.qqSecretHint.textContent = config.qq.hasSecret ? `当前已保存 Secret：${config.qq.appSecretMasked}` : '当前尚未保存 Secret';
  els.qqAllowedUsers.value = config.qq.allowedUsers || '';
  els.qqImageEnabled.checked = !!config.qq.imageEnabled;
  els.qqMaxImageSize.value = String(config.qq.maxImageSize || 20);
}
function renderAdapter(name, adapter) {
  const labels = { telegram: 'Telegram', feishu: '飞书', discord: 'Discord', qq: 'QQ' };
  const lines = [
    `<div>启用状态：${adapter.enabled ? '已启用' : '未启用'}</div>`,
    `<div>运行状态：${adapter.running ? '运行中' : '未运行'}</div>`,
  ];
  if ('ready' in adapter) lines.push(`<div>网关就绪：${adapter.ready ? '是' : '否'}</div>`);
  if ('lastInboundAt' in adapter) lines.push(`<div>最近入站：${escapeHtml(adapter.lastInboundAt || '无')}</div>`);
  if ('lastOutboundAt' in adapter) lines.push(`<div>最近出站：${escapeHtml(adapter.lastOutboundAt || '无')}</div>`);
  if ('resumedAt' in adapter) lines.push(`<div>最近恢复：${escapeHtml(adapter.resumedAt || '无')}</div>`);
  lines.push(`<div>最近错误：${escapeHtml(adapter.lastError || '无')}</div>`);
  return `<div class="adapter-item"><strong>${labels[name] || name}</strong>${lines.join('')}</div>`;
}

function renderStatus(status) {
  state.status = status;
  const running = !!status.running;
  els.statusPill.textContent = running ? '已连接' : '未运行';
  els.statusPill.className = `status-pill ${running ? 'running' : 'stopped'}`;
  els.heroSummary.textContent = status.summaryText || (running ? '桥接当前在线' : '桥接当前未运行');
  const statusFile = status.statusFile || {};
  const meta = [
    ['绑定数量', `${status.bindingsCount ?? 0}`],
    ['PID', statusFile.pid || '无'],
    ['Run ID', statusFile.runId || '无'],
    ['启动时间', statusFile.startedAt || '无'],
  ];
  els.heroMeta.innerHTML = meta.map(([label, value]) => `<div class="meta-chip"><strong>${label}</strong><div>${escapeHtml(String(value))}</div></div>`).join('');
  const adapterEntries = Object.entries(status.adapterState || {});
  els.adapterStatus.innerHTML = adapterEntries.length ? adapterEntries.map(([name, adapter]) => renderAdapter(name, adapter)).join('') : '<div class="adapter-item">暂无适配器状态</div>';
  if (!state.logSource) els.logBox.textContent = (status.recentLogs || []).join('\n') || '暂无日志';
  renderPidOptions(statusFile.pid);
  updateInsights();
}

function renderPidOptions(pid) {
  const currentValue = els.conversationPid.value;
  const options = pid ? [{ value: String(pid), label: `PID ${pid}` }] : [{ value: '', label: '无活动 PID' }];
  els.conversationPid.innerHTML = options.map((item) => `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`).join('');
  if (currentValue && options.some((item) => item.value === currentValue)) els.conversationPid.value = currentValue;
}

function renderAlerts(alerts) {
  if (!alerts.length) {
    els.alertList.innerHTML = '<div class="empty-card">当前没有高优先级运行告警</div>';
    return;
  }
  els.alertList.innerHTML = alerts.map((alert) => `
    <div class="alert-card is-${alert.level}">
      <strong>${escapeHtml(alert.title)}</strong>
      <div>${escapeHtml(alert.detail)}</div>
    </div>
  `).join('');
}

function renderSuggestions(items) {
  if (!items.length) {
    els.suggestionList.innerHTML = '<div class="empty-card">当前没有额外处理建议</div>';
    return;
  }
  els.suggestionList.innerHTML = items.map((item) => `<div class="suggestion-card"><strong>${escapeHtml(item.title)}</strong><div>${escapeHtml(item.detail)}</div></div>`).join('');
}

function getLatestConversationAt() {
  const timestamps = state.conversations.map((item) => new Date(item.updatedAt || '').getTime()).filter((value) => !Number.isNaN(value));
  if (!timestamps.length) return null;
  return new Date(Math.max(...timestamps));
}

function deriveAlerts() {
  const alerts = [];
  const status = state.status;
  const doctor = state.doctor;
  const thresholds = state.thresholds;
  if (!status?.running) alerts.push({ level: 'critical', title: 'Bridge 未运行', detail: '当前桥接进程未在线，可尝试启动或一键诊断修复。' });
  const qqError = status?.adapterState?.qq?.lastError;
  if (qqError) alerts.push({ level: 'error', title: 'QQ 适配器最近有错误', detail: qqError });
  if (status?.statusFile?.lastExitReason) alerts.push({ level: 'warn', title: '记录到最近退出原因', detail: status.statusFile.lastExitReason });
  const missCount = doctor?.summary?.miss || 0;
  if (missCount > Number(thresholds.doctorMissThreshold || 0)) alerts.push({ level: 'warn', title: '诊断存在缺失项', detail: `doctor 检测到 ${missCount} 个 MISS 项，已超过阈值 ${thresholds.doctorMissThreshold}。` });
  const latestConversationAt = getLatestConversationAt();
  if (latestConversationAt && status?.running) {
    const diffMinutes = Math.round((Date.now() - latestConversationAt.getTime()) / 60000);
    if (diffMinutes >= Number(thresholds.staleConversationMinutes || 30)) alerts.push({ level: 'warn', title: '会话长时间无新消息', detail: `最近一次会话更新时间距今约 ${diffMinutes} 分钟，超过阈值 ${thresholds.staleConversationMinutes} 分钟。` });
  }
  if (String(status?.statusStderr || '').includes('spawn EPERM')) alerts.push({ level: 'info', title: '受限环境回退中', detail: '当前状态检测在受限环境下回退到本地文件读取，这不影响桌面版和本地直跑。' });
  return alerts;
}

function deriveSuggestions() {
  const items = [];
  const status = state.status;
  const doctor = state.doctor;
  if (!status?.running) items.push({ title: '先恢复 bridge', detail: '优先点击“启动”或“一键诊断修复”，确认桥重新在线。' });
  if ((doctor?.summary?.miss || 0) > Number(state.thresholds.doctorMissThreshold || 0)) items.push({ title: '处理 doctor 缺失项', detail: '根据诊断结果补齐 config、daemon 或命令行依赖。' });
  const qqError = String(status?.adapterState?.qq?.lastError || '');
  if (qqError.includes('Session timed out') || qqError.includes('Reconnect failed')) items.push({ title: '排查 QQ 网关抖动', detail: '如果频繁出现超时或重连失败，可先重启 bridge，再检查网络和代理链路。' });
  const latestConversationAt = getLatestConversationAt();
  if (latestConversationAt && state.status?.running) {
    const diffMinutes = Math.round((Date.now() - latestConversationAt.getTime()) / 60000);
    if (diffMinutes >= Number(state.thresholds.staleConversationMinutes || 30)) items.push({ title: '检查最近会话是否堵塞', detail: '最近对话长时间没有更新，可查看消息详情抽屉确认是否卡在某个 session。' });
  }
  if (String(status?.statusStderr || '').includes('spawn EPERM')) items.push({ title: '切到本机直跑查看', detail: '如果当前是受限沙箱，建议直接运行 Web 版或桌面版，以获得完整的读写能力。' });
  return items;
}

function maybeNotifyAlerts(alerts) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const thresholdLevel = state.thresholds.notifyLevel || 'error';
  alerts.filter((item) => severityRank[item.level] >= severityRank[thresholdLevel]).forEach((alert) => {
    const key = `${alert.level}:${alert.title}:${alert.detail}`;
    if (state.notifiedAlerts.has(key)) return;
    state.notifiedAlerts.add(key);
    new Notification(`桥接告警: ${alert.title}`, { body: alert.detail });
  });
}

function updateInsights() {
  const alerts = deriveAlerts();
  renderAlerts(alerts);
  renderSuggestions(deriveSuggestions());
  maybeNotifyAlerts(alerts);
}

function renderBindings(items) {
  state.bindings = items;
  if (!items.length) {
    els.bindingsList.innerHTML = '<div class="empty-card">暂无会话绑定</div>';
    return;
  }
  els.bindingsList.innerHTML = items.map((binding) => `
    <div class="data-card">
      <div class="data-card-head"><strong>${escapeHtml(binding.bindingKey)}</strong><span class="mini-badge ${binding.active ? 'is-success' : 'is-muted'}">${binding.active ? '活跃' : '停用'}</span></div>
      <div class="data-grid">
        <div><span>工作目录</span><strong>${escapeHtml(binding.workingDirectory || '无')}</strong></div>
        <div><span>模式</span><strong>${escapeHtml(binding.mode || '无')}</strong></div>
        <div><span>会话 ID</span><strong>${escapeHtml(binding.codepilotSessionId || binding.sdkSessionId || '无')}</strong></div>
        <div><span>更新时间</span><strong>${escapeHtml(binding.updatedAt || '无')}</strong></div>
      </div>
      <div class="card-actions right-align"><button class="btn btn-ghost js-toggle-binding" data-binding-key="${escapeHtml(binding.bindingKey)}" data-active="${binding.active ? 'false' : 'true'}">${binding.active ? '停用绑定' : '恢复绑定'}</button></div>
    </div>
  `).join('');
}

function renderAudit(items) {
  state.audit = items;
  if (!items.length) {
    els.auditList.innerHTML = '<div class="empty-card">暂无审计记录</div>';
    return;
  }
  els.auditList.innerHTML = items.map((entry) => `
    <div class="data-card compact">
      <div class="data-card-head"><strong>${escapeHtml(entry.direction || 'unknown')}</strong><span class="mini-badge is-muted">${escapeHtml(entry.channelType || 'unknown')}</span></div>
      <div class="audit-summary">${escapeHtml(entry.summary || '')}</div>
      <div class="data-grid single-line">
        <div><span>chatId</span><strong>${escapeHtml(entry.chatId || '无')}</strong></div>
        <div><span>时间</span><strong>${escapeHtml(entry.createdAt || '无')}</strong></div>
      </div>
    </div>
  `).join('');
}
function renderDoctor(doctor) {
  state.doctor = doctor;
  const summary = doctor.summary || { ok: 0, miss: 0, info: 0 };
  els.doctorSummary.innerHTML = `
    <div class="meta-chip"><strong>OK</strong><div>${summary.ok}</div></div>
    <div class="meta-chip danger-chip"><strong>MISS</strong><div>${summary.miss}</div></div>
    <div class="meta-chip"><strong>INFO</strong><div>${summary.info}</div></div>
  `;
  els.doctorBox.textContent = (doctor.lines || []).join('\n') || '暂无诊断输出';
  updateInsights();
}

function renderConversations(items) {
  state.conversations = items;
  if (!items.length) {
    els.conversationList.innerHTML = '<div class="empty-card">当前筛选条件下暂无会话</div>';
    updateInsights();
    return;
  }
  els.conversationList.innerHTML = items.map((item) => `
    <div class="data-card">
      <div class="data-card-head">
        <strong>${escapeHtml(item.channelType)} / ${escapeHtml(item.chatId)}</strong>
        <span class="mini-badge ${item.active ? 'is-success' : 'is-muted'}">${item.active ? '活跃' : '停用'}</span>
      </div>
      <div class="data-grid">
        <div><span>PID</span><strong>${escapeHtml(item.pid || '无')}</strong></div>
        <div><span>消息数</span><strong>${escapeHtml(item.messageCount || 0)}</strong></div>
        <div><span>会话 ID</span><strong>${escapeHtml(item.sessionId || '无')}</strong></div>
        <div><span>更新时间</span><strong>${escapeHtml(item.updatedAt || '无')}</strong></div>
      </div>
      <div class="audit-summary">${escapeHtml(item.lastPreview || '暂无消息')}</div>
      <div class="card-actions right-align"><button class="btn btn-primary js-open-conversation" data-session-id="${escapeHtml(item.sessionId)}">查看对话详情</button></div>
    </div>
  `).join('');
  updateInsights();
}

function renderConversationModal(detail) {
  state.activeConversation = detail;
  els.conversationModalTitle.textContent = `对话详情 · ${detail.binding?.chatId || detail.sessionId}`;
  els.conversationModalMeta.textContent = `PID: ${detail.pid || '无'} | Session: ${detail.sessionId} | 当前 ${detail.messageCount} 条 / 过滤后 ${detail.filteredCount} 条 / 总计 ${detail.totalCount} 条`;
  els.conversationMessageList.innerHTML = (detail.messages || []).length
    ? detail.messages.map((message) => `
      <div class="message-item is-${escapeHtml(message.role || 'unknown')}">
        <div class="message-role">${escapeHtml(message.role || 'unknown')}</div>
        <div class="message-content">${escapeHtml(message.content || '')}</div>
      </div>
    `).join('')
    : '<div class="empty-card">当前过滤条件下暂无对话消息</div>';
  els.conversationModal.classList.remove('hidden');
}

function closeConversationModal() {
  els.conversationModal.classList.add('hidden');
  if (state.conversationTimer) {
    window.clearInterval(state.conversationTimer);
    state.conversationTimer = null;
  }
  state.activeConversation = null;
}

function collectMessageDetailQuery(sessionId) {
  return buildQuery({ sessionId, limit: 200, q: els.messageSearch.value.trim(), role: els.messageRoleFilter.value });
}

async function openConversationModal(sessionId) {
  const detail = await api(`/api/bridge/messages?${collectMessageDetailQuery(sessionId)}`);
  renderConversationModal(detail);
  if (state.conversationTimer) window.clearInterval(state.conversationTimer);
  if (els.autoRefreshConversation.checked) {
    state.conversationTimer = window.setInterval(async () => {
      if (!state.activeConversation?.sessionId) return;
      const next = await api(`/api/bridge/messages?${collectMessageDetailQuery(state.activeConversation.sessionId)}`);
      renderConversationModal(next);
    }, 5000);
  }
}

function collectConfigPayload() {
  return {
    runtime: state.config?.runtime || 'codex',
    enabledChannels: [els.channelTelegram.checked && 'telegram', els.channelFeishu.checked && 'feishu', els.channelDiscord.checked && 'discord', els.channelQq.checked && 'qq'].filter(Boolean),
    defaultWorkdir: state.config?.defaultWorkdir || 'F:\\QBot01',
    defaultMode: state.config?.defaultMode || 'code',
    defaultModel: state.config?.defaultModel || '',
    autoStart: els.autoStart.checked,
    telegram: { botToken: els.tgBotToken.value.trim(), chatId: els.tgChatId.value.trim(), allowedUsers: els.tgAllowedUsers.value.trim() },
    feishu: { appId: els.feishuAppId.value.trim(), appSecret: els.feishuAppSecret.value.trim(), domain: els.feishuDomain.value.trim(), allowedUsers: els.feishuAllowedUsers.value.trim() },
    discord: { botToken: els.discordBotToken.value.trim(), allowedUsers: els.discordAllowedUsers.value.trim(), allowedChannels: els.discordAllowedChannels.value.trim(), allowedGuilds: els.discordAllowedGuilds.value.trim() },
    qq: { appId: els.qqAppId.value.trim(), appSecret: els.qqAppSecret.value.trim(), allowedUsers: els.qqAllowedUsers.value.trim(), imageEnabled: els.qqImageEnabled.checked, maxImageSize: Number(els.qqMaxImageSize.value || '20') },
    proxies: state.config?.proxies || {},
  };
}

function collectConversationQuery() {
  return buildQuery({ pid: els.conversationPid.value || '', q: els.conversationSearch.value.trim(), active: els.conversationActiveFilter.value });
}

function collectAuditQuery(limit = 30) {
  return buildQuery({ limit, q: els.auditSearch.value.trim(), direction: els.auditDirectionFilter.value, channelType: els.auditChannelFilter.value });
}

async function refreshLogs() {
  const data = await api('/api/bridge/logs?tail=80');
  els.logBox.textContent = (data.lines || []).join('\n') || '暂无日志';
}

async function refreshBindings() {
  renderBindings((await api('/api/bridge/bindings')).items || []);
}

async function refreshAudit() {
  renderAudit((await api(`/api/bridge/audit?${collectAuditQuery(50)}`)).items || []);
}

async function refreshDoctor() {
  renderDoctor(await api('/api/bridge/doctor?lines=60'));
}

async function refreshConversations() {
  renderConversations((await api(`/api/bridge/conversations?${collectConversationQuery()}`)).items || []);
}

async function refreshAll() {
  const [config, status, bindings, audit, doctor, conversations] = await Promise.all([
    api('/api/bridge/config'),
    api('/api/bridge/status'),
    api('/api/bridge/bindings'),
    api(`/api/bridge/audit?${collectAuditQuery(50)}`),
    api('/api/bridge/doctor?lines=60'),
    api(`/api/bridge/conversations?${collectConversationQuery()}`),
  ]);
  fillConfig(config);
  fillThresholds();
  renderStatus(status);
  renderBindings(bindings.items || []);
  renderAudit(audit.items || []);
  renderDoctor(doctor);
  renderConversations(conversations.items || []);
}

function stopLogStreaming() {
  if (state.logSource) {
    state.logSource.close();
    state.logSource = null;
  }
  if (state.logTimer) {
    window.clearTimeout(state.logTimer);
    state.logTimer = null;
  }
}
function connectLogStream() {
  stopLogStreaming();
  if (!els.autoRefreshLogs.checked) {
    setStreamStatus('日志流已暂停', 'idle');
    return;
  }
  if (typeof EventSource === 'undefined') {
    setStreamStatus('浏览器不支持实时日志流', 'error');
    state.logTimer = window.setInterval(() => refreshLogs().catch(() => {}), 8000);
    return;
  }
  const source = new EventSource('/api/bridge/logs/stream?tail=80');
  state.logSource = source;
  setStreamStatus('日志流连接中...', 'idle');
  source.onopen = () => setStreamStatus('日志流已连接', 'success');
  source.onmessage = (event) => {
    const payload = JSON.parse(event.data || '{}');
    els.logBox.textContent = (payload.lines || []).join('\n') || '暂无日志';
  };
  source.onerror = () => {
    setStreamStatus('日志流已断开，5 秒后重连', 'error');
    source.close();
    state.logSource = null;
    if (!state.logTimer) {
      state.logTimer = window.setTimeout(() => {
        state.logTimer = null;
        connectLogStream();
      }, 5000);
    }
  };
}

async function saveConfig(message, target = els.overviewFeedback) {
  await api('/api/bridge/config', { method: 'POST', body: JSON.stringify(collectConfigPayload()) });
  els.tgBotToken.value = '';
  els.feishuAppSecret.value = '';
  els.discordBotToken.value = '';
  els.qqAppSecret.value = '';
  setFeedback(target, message, 'success');
  await refreshAll();
}

async function runChannelTest(path, payload, target, pendingMessage) {
  try {
    setFeedback(target, pendingMessage, 'success');
    const result = await api(path, { method: 'POST', body: JSON.stringify(payload) });
    setFeedback(target, result.message, result.ok ? 'success' : 'error');
  } catch (err) {
    setFeedback(target, err.message || '连接测试失败。', 'error');
  }
}

async function toggleBinding(bindingKey, active) {
  try {
    const result = await api('/api/bridge/bindings/toggle', { method: 'POST', body: JSON.stringify({ bindingKey, active }) });
    setFeedback(els.bindingsFeedback, result.message, result.ok ? 'success' : 'error');
  } catch (err) {
    setFeedback(els.bindingsFeedback, err.message || '切换绑定失败。', 'error');
  }
  await refreshBindings();
}

function saveThresholdValues() {
  state.thresholds = {
    doctorMissThreshold: Number(els.thresholdDoctorMiss.value || defaultThresholds.doctorMissThreshold),
    staleConversationMinutes: Number(els.thresholdStaleMinutes.value || defaultThresholds.staleConversationMinutes),
    notifyLevel: els.thresholdNotifyLevel.value || defaultThresholds.notifyLevel,
  };
  saveThresholdSettings();
  setFeedback(els.thresholdFeedback, '告警阈值已保存到本地浏览器。', 'success');
  updateInsights();
}

function exportAudit(format) {
  const query = collectAuditQuery(500);
  window.open(`/api/bridge/audit/export?format=${encodeURIComponent(format)}&${query}`, '_blank');
}

const debouncedConversationRefresh = debounce(() => refreshConversations().catch((err) => setFeedback(els.overviewFeedback, err.message || '刷新会话失败。', 'error')));
const debouncedAuditRefresh = debounce(() => refreshAudit().catch((err) => setFeedback(els.overviewFeedback, err.message || '刷新审计失败。', 'error')));
const debouncedMessageRefresh = debounce(() => {
  if (state.activeConversation?.sessionId) openConversationModal(state.activeConversation.sessionId).catch((err) => setFeedback(els.overviewFeedback, err.message || '刷新消息失败。', 'error'));
});

els.navItems.forEach((item) => item.addEventListener('click', () => showPanel(item.dataset.panel)));
els.refreshStatus.addEventListener('click', async () => { clearFeedback(els.overviewFeedback); await refreshAll(); });
els.refreshLogs.addEventListener('click', refreshLogs);
els.refreshBindings.addEventListener('click', refreshBindings);
els.refreshAudit.addEventListener('click', refreshAudit);
els.refreshDoctor.addEventListener('click', refreshDoctor);
els.refreshConversations.addEventListener('click', refreshConversations);
els.conversationPid.addEventListener('change', refreshConversations);
els.conversationSearch.addEventListener('input', debouncedConversationRefresh);
els.conversationActiveFilter.addEventListener('change', refreshConversations);
els.auditSearch.addEventListener('input', debouncedAuditRefresh);
els.auditDirectionFilter.addEventListener('change', refreshAudit);
els.auditChannelFilter.addEventListener('change', refreshAudit);
els.exportAuditJson.addEventListener('click', () => exportAudit('json'));
els.exportAuditCsv.addEventListener('click', () => exportAudit('csv'));
els.saveThresholds.addEventListener('click', saveThresholdValues);
els.messageSearch.addEventListener('input', debouncedMessageRefresh);
els.messageRoleFilter.addEventListener('change', () => {
  if (state.activeConversation?.sessionId) openConversationModal(state.activeConversation.sessionId).catch(() => {});
});
els.autoRefreshLogs.addEventListener('change', connectLogStream);
els.enableNotifications.addEventListener('click', async () => {
  if (!('Notification' in window)) {
    setFeedback(els.overviewFeedback, '当前浏览器不支持桌面通知。', 'error');
    return;
  }
  const permission = await Notification.requestPermission();
  setFeedback(els.overviewFeedback, permission === 'granted' ? '运行告警通知已启用。' : '未授予通知权限。', permission === 'granted' ? 'success' : 'error');
});
els.startBridge.addEventListener('click', async () => {
  const result = await api('/api/bridge/start', { method: 'POST' });
  setFeedback(els.overviewFeedback, result.stdout || result.stderr || '桥接启动命令已发送。', result.ok ? 'success' : 'error');
  await refreshAll();
});
els.stopBridge.addEventListener('click', async () => {
  const result = await api('/api/bridge/stop', { method: 'POST' });
  setFeedback(els.overviewFeedback, result.stdout || result.stderr || '桥接停止命令已发送。', result.ok ? 'success' : 'error');
  await refreshAll();
});
els.restartBridge.addEventListener('click', async () => {
  const result = await api('/api/bridge/restart', { method: 'POST' });
  setFeedback(els.overviewFeedback, result.start?.stdout || result.start?.stderr || '桥接重启命令已发送。', result.ok ? 'success' : 'error');
  await refreshAll();
});
els.repairPid.addEventListener('click', async () => {
  const result = await api('/api/bridge/repair-pid', { method: 'POST' });
  setFeedback(els.overviewFeedback, result.message || '已尝试修复 stale PID。', result.ok ? 'success' : 'error');
  await refreshAll();
});
els.runAutoRepair.addEventListener('click', async () => {
  setFeedback(els.overviewFeedback, '正在执行一键诊断修复...', 'success');
  const result = await api('/api/bridge/repair', { method: 'POST', body: '{}' });
  setFeedback(els.overviewFeedback, [result.message, ...(result.actions || []).map((item) => `${item.step}: ${item.message}`)].join('\n'), result.ok ? 'success' : 'error');
  renderDoctor(result.doctor || { lines: [], summary: { ok: 0, miss: 0, info: 0 } });
  renderStatus(result.status || state.status || {});
  await refreshConversations();
});

els.bindingsList.addEventListener('click', async (event) => {
  const button = event.target.closest('.js-toggle-binding');
  if (button) await toggleBinding(button.dataset.bindingKey, button.dataset.active === 'true');
});
els.conversationList.addEventListener('click', async (event) => {
  const button = event.target.closest('.js-open-conversation');
  if (button) await openConversationModal(button.dataset.sessionId);
});
els.closeConversationModal.addEventListener('click', closeConversationModal);
els.conversationModal.addEventListener('click', (event) => { if (event.target === els.conversationModal) closeConversationModal(); });
els.refreshConversationDetail.addEventListener('click', async () => { if (state.activeConversation?.sessionId) await openConversationModal(state.activeConversation.sessionId); });
els.autoRefreshConversation.addEventListener('change', async () => {
  if (!state.activeConversation?.sessionId) return;
  await openConversationModal(state.activeConversation.sessionId);
});

els.saveOverview.addEventListener('click', () => saveConfig('渠道配置已保存。', els.overviewFeedback));
els.saveTelegram.addEventListener('click', () => saveConfig('Telegram 设置已保存。', els.telegramFeedback));
els.saveFeishu.addEventListener('click', () => saveConfig('飞书设置已保存。', els.feishuFeedback));
els.saveDiscord.addEventListener('click', () => saveConfig('Discord 设置已保存。', els.discordFeedback));
els.saveQqCredentials.addEventListener('click', () => saveConfig('QQ 凭据已保存。', els.qqTestResult));
els.saveQqUsers.addEventListener('click', () => saveConfig('允许用户配置已保存。', els.qqTestResult));
els.saveQqImages.addEventListener('click', () => saveConfig('图片设置已保存。', els.qqTestResult));
els.testTelegram.addEventListener('click', () => runChannelTest('/api/bridge/test/telegram', { botToken: els.tgBotToken.value.trim() }, els.telegramFeedback, '正在测试 Telegram 连接...'));
els.testFeishu.addEventListener('click', () => runChannelTest('/api/bridge/test/feishu', { appId: els.feishuAppId.value.trim(), appSecret: els.feishuAppSecret.value.trim(), domain: els.feishuDomain.value.trim() }, els.feishuFeedback, '正在测试飞书连接...'));
els.testDiscord.addEventListener('click', () => runChannelTest('/api/bridge/test/discord', { botToken: els.discordBotToken.value.trim() }, els.discordFeedback, '正在测试 Discord 连接...'));
els.testQqConnection.addEventListener('click', () => runChannelTest('/api/bridge/test/qq', { appId: els.qqAppId.value.trim(), appSecret: els.qqAppSecret.value.trim() }, els.qqTestResult, '正在测试 QQ 连接...'));

window.addEventListener('beforeunload', () => {
  stopLogStreaming();
  if (state.conversationTimer) window.clearInterval(state.conversationTimer);
});

fillThresholds();
refreshAll().then(connectLogStream).catch((err) => {
  els.logBox.textContent = err.message || '初始化失败';
  setFeedback(els.overviewFeedback, err.message || '初始化失败', 'error');
  connectLogStream();
});
