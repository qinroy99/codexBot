const THRESHOLD_KEY = 'cti-ui-thresholds';
const PINNED_THREAD_KEY = 'cti-pinned-thread';

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
  pinnedThreadKey: loadPinnedThread(),
};

const els = {
  navItems: [...document.querySelectorAll('.nav-item')],
  panelJumpButtons: [...document.querySelectorAll('.js-open-panel')],
  modeTemplateButtons: [...document.querySelectorAll('.js-mode-template')],
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
  workspaceFeedback: document.getElementById('workspace-feedback'),
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
  conversationChannelFilter: document.getElementById('conversation-channel-filter'),
  conversationActiveFilter: document.getElementById('conversation-active-filter'),
  conversationList: document.getElementById('conversation-list'),
  conversationDetailTitle: document.getElementById('conversation-detail-title'),
  conversationDetailMeta: document.getElementById('conversation-detail-meta'),
  threadDetailSummary: document.getElementById('thread-detail-summary'),
  conversationMessageList: document.getElementById('conversation-message-list'),
  refreshConversationDetail: document.getElementById('refresh-conversation-detail'),
  pinThread: document.getElementById('pin-thread'),
  exportThreadJson: document.getElementById('export-thread-json'),
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
  defaultWorkdir: document.getElementById('default-workdir'),
  defaultMode: document.getElementById('default-mode'),
  defaultModel: document.getElementById('default-model'),
  codexPassModel: document.getElementById('codex-pass-model'),
  saveWorkspaceDefaults: document.getElementById('save-workspace-defaults'),
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

function loadPinnedThread() {
  try {
    return localStorage.getItem(PINNED_THREAD_KEY) || '';
  } catch {
    return '';
  }
}

function savePinnedThread(threadKey) {
  state.pinnedThreadKey = threadKey || '';
  try {
    if (state.pinnedThreadKey) localStorage.setItem(PINNED_THREAD_KEY, state.pinnedThreadKey);
    else localStorage.removeItem(PINNED_THREAD_KEY);
  } catch {}
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

function formatDateTime(value) {
  if (!value) return '无';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
}

function formatFreshness(value) {
  if (!value) return '无更新';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '时间未知';
  const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 1) return '刚刚更新';
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} 小时前`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} 天前`;
}

function fillThresholds() {
  els.thresholdDoctorMiss.value = String(state.thresholds.doctorMissThreshold);
  els.thresholdStaleMinutes.value = String(state.thresholds.staleConversationMinutes);
  els.thresholdNotifyLevel.value = state.thresholds.notifyLevel;
}

function stringifyForDisplay(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function tryParseStructuredBlocks(content) {
  const raw = typeof content === 'string' ? content.trim() : '';
  if (!raw || (!raw.startsWith('[') && !raw.startsWith('{'))) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.some((item) => item && typeof item === 'object' && 'type' in item)) return parsed;
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.content) && parsed.content.some((item) => item && typeof item === 'object' && 'type' in item)) return parsed.content;
    return null;
  } catch {
    return null;
  }
}

function normalizeToolResultContent(content) {
  if (Array.isArray(content)) {
    return content.map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && item.type === 'text') return item.text || '';
      return stringifyForDisplay(item);
    }).filter(Boolean).join('\n\n');
  }
  return stringifyForDisplay(content);
}

function summarizeInline(text, maxLength = 96) {
  const oneLine = String(text || '').replace(/\s+/g, ' ').trim();
  if (!oneLine) return '';
  return oneLine.length > maxLength ? `${oneLine.slice(0, maxLength)}...` : oneLine;
}

function getMessageBlocks(message) {
  const blocks = tryParseStructuredBlocks(message.content);
  if (!blocks) {
    return [{
      kind: 'text',
      title: '消息正文',
      body: String(message.content || '').trim() || '空消息',
      raw: null,
    }];
  }
  const normalized = blocks.map((block, index) => {
    const type = String(block?.type || '').toLowerCase();
    if (type === 'text') {
      return {
        kind: 'text',
        title: blocks.length > 1 ? `回复片段 ${index + 1}` : '消息正文',
        body: String(block.text || '').trim() || '空文本',
        raw: block,
      };
    }
    if (type === 'tool_use') {
      return {
        kind: 'tool-use',
        title: block.name ? `工具调用 · ${block.name}` : '工具调用',
        meta: block.id ? `调用 ID ${block.id}` : '',
        body: stringifyForDisplay(block.input || {}),
        toolName: String(block.name || ''),
        toolUseId: String(block.id || ''),
        raw: block,
      };
    }
    if (type === 'tool_result') {
      return {
        kind: block.is_error ? 'tool-error' : 'tool-result',
        title: block.is_error ? '工具结果 · 错误' : '工具结果',
        meta: block.tool_use_id ? `对应 ${block.tool_use_id}` : '',
        body: normalizeToolResultContent(block.content),
        toolUseId: String(block.tool_use_id || ''),
        isError: !!block.is_error,
        raw: block,
      };
    }
    return {
      kind: 'json',
      title: block?.type ? `结构化块 · ${block.type}` : `结构化块 ${index + 1}`,
      body: stringifyForDisplay(block),
      raw: block,
    };
  }).filter(Boolean);
  return normalized.length ? normalized : [{
    kind: 'text',
    title: '消息正文',
    body: String(message.content || '').trim() || '空消息',
    raw: null,
  }];
}

function describeMessageFlow(message, detail) {
  const role = String(message.role || 'unknown').toLowerCase();
  const channelLabel = detail.channelType ? detail.channelType.toUpperCase() : 'IM';
  if (role === 'user') {
    return {
      direction: 'inbound',
      title: `${channelLabel} 入站消息`,
      badge: '入站',
      summary: '来自外部 IM 渠道，准备交给 Codex 处理。',
    };
  }
  if (role === 'assistant') {
    return {
      direction: 'outbound',
      title: 'Codex 出站回复',
      badge: '出站',
      summary: '由 Codex 生成，准备回发到桥接渠道。',
    };
  }
  return {
    direction: 'internal',
    title: 'Bridge 内部事件',
    badge: '内部',
    summary: '用于记录系统或桥接层状态。',
  };
}

function buildToolTimelineSteps(blocks) {
  const toolUses = blocks.filter((block) => block.kind === 'tool-use');
  if (!toolUses.length) return [];

  const totalAttemptsByTool = toolUses.reduce((acc, block) => {
    const key = block.toolName || block.title || '工具调用';
    acc.set(key, (acc.get(key) || 0) + 1);
    return acc;
  }, new Map());
  const resultsById = new Map(
    blocks
      .filter((block) => block.kind === 'tool-result' || block.kind === 'tool-error')
      .map((block) => [block.toolUseId || '', block]),
  );
  const seenAttempts = new Map();

  return toolUses.map((block, index) => {
    const toolName = block.toolName || block.title || `工具 ${index + 1}`;
    const totalAttempts = totalAttemptsByTool.get(toolName) || 1;
    const attempt = (seenAttempts.get(toolName) || 0) + 1;
    seenAttempts.set(toolName, attempt);

    const result = resultsById.get(block.toolUseId || '');
    const isError = !!result?.isError;
    const status = !result ? 'pending' : isError ? 'error' : attempt > 1 ? 'retry' : 'success';
    const statusLabel = !result ? '等待结果' : isError ? '执行失败' : attempt > 1 ? '重试成功' : '执行成功';
    const summary = result
      ? summarizeInline(result.body || '')
      : '当前消息记录里还没有对应的工具结果块。';

    return {
      index: index + 1,
      title: toolName,
      status,
      statusLabel,
      attempt,
      totalAttempts,
      durationLabel: result ? '耗时未采集' : '执行中',
      summary: summary || (isError ? '工具返回了错误，但未附带详细文本。' : '工具结果为空。'),
      callId: block.toolUseId || '',
    };
  });
}

function buildMessageExecutionMeta(message, flow, toolSteps, index, totalMessages) {
  const retryCount = toolSteps.reduce((sum, step) => sum + Math.max(0, step.attempt - 1), 0);
  const errorCount = toolSteps.filter((step) => step.status === 'error').length;
  const pendingCount = toolSteps.filter((step) => step.status === 'pending').length;
  const sequenceLabel = `步骤 ${index + 1}/${totalMessages}`;

  if (flow.direction === 'inbound') {
    return {
      summary: '桥接已收下这条消息，并将它排入当前会话。',
      chips: [sequenceLabel, '状态 已接收', '耗时未采集'],
    };
  }

  if (flow.direction === 'outbound') {
    if (toolSteps.length) {
      const statusLabel = pendingCount ? '等待收口' : errorCount ? '部分失败' : '已完成';
      return {
        summary: errorCount
          ? '这轮回复里包含工具失败或错误返回，适合继续盯失败点。'
          : retryCount
            ? '这轮回复经历过重试，最终已经完成回包。'
            : '这轮回复的工具链已经执行完成，并进入回包阶段。',
        chips: [
          sequenceLabel,
          `状态 ${statusLabel}`,
          `工具 ${toolSteps.length}`,
          retryCount ? `重试 ${retryCount}` : '重试 0',
          pendingCount ? '耗时采集中' : '耗时未采集',
        ],
      };
    }

    return {
      summary: '这是没有工具调用的直接回复，已由 Codex 生成并准备回发。',
      chips: [sequenceLabel, '状态 已完成', '直出回复', '耗时未采集'],
    };
  }

  return {
    summary: '系统或桥接层补充的一条内部记录。',
    chips: [sequenceLabel, '状态 内部记录'],
  };
}

function renderToolTimeline(toolSteps) {
  if (!toolSteps.length) return '';
  return `
    <div class="message-timeline">
      <div class="message-timeline-head">
        <strong>Agent 时间线</strong>
        <span class="message-block-meta">工具 ${toolSteps.length} 步</span>
      </div>
      <div class="timeline-step-list">
        ${toolSteps.map((step) => `
          <div class="timeline-step is-${escapeHtml(step.status)}">
            <div class="timeline-step-row">
              <div class="timeline-step-title-wrap">
                <span class="timeline-step-index">#${step.index}</span>
                <strong>${escapeHtml(step.title)}</strong>
              </div>
              <span class="timeline-step-status is-${escapeHtml(step.status)}">${escapeHtml(step.statusLabel)}</span>
            </div>
            <div class="timeline-step-meta">
              <span>${escapeHtml(step.durationLabel)}</span>
              <span>${step.totalAttempts > 1 ? `第 ${step.attempt}/${step.totalAttempts} 次` : '首轮执行'}</span>
              ${step.callId ? `<span>调用 ${escapeHtml(step.callId)}</span>` : ''}
            </div>
            <div class="timeline-step-summary">${escapeHtml(step.summary)}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderMessageCard(message, detail, index = 0, totalMessages = 1) {
  const flow = describeMessageFlow(message, detail);
  const blocks = getMessageBlocks(message);
  const toolSteps = buildToolTimelineSteps(blocks);
  const hasTools = toolSteps.length > 0;
  const execution = buildMessageExecutionMeta(message, flow, toolSteps, index, totalMessages);
  const badges = [
    `<span class="message-flow-badge is-${flow.direction}">${escapeHtml(flow.badge)}</span>`,
    `<span class="mini-badge is-muted">${escapeHtml(String(message.role || 'unknown'))}</span>`,
    message.sessionId ? `<span class="mini-badge is-muted">会话 ${escapeHtml(message.sessionId)}</span>` : '',
    hasTools ? '<span class="mini-badge is-success">含工具调用</span>' : '',
  ].filter(Boolean).join('');
  const executionHtml = execution.chips.length
    ? `<div class="message-execution-strip">${execution.chips.map((chip) => `<span class="execution-chip">${escapeHtml(chip)}</span>`).join('')}</div>`
    : '';
  const blocksHtml = blocks.map((block) => `
    <div class="message-block is-${escapeHtml(block.kind)}">
      <div class="message-block-head">
        <strong>${escapeHtml(block.title)}</strong>
        ${block.meta ? `<span class="message-block-meta">${escapeHtml(block.meta)}</span>` : ''}
      </div>
      <pre class="message-block-content">${escapeHtml(block.body || '')}</pre>
    </div>
  `).join('');
  return `
    <div class="message-item is-${escapeHtml(String(message.role || 'unknown').toLowerCase())} is-${flow.direction}${hasTools ? ' has-tools' : ''}">
      <div class="message-head">
        <div class="message-head-main">
          <strong>${escapeHtml(flow.title)}</strong>
          <div class="message-source-line">${escapeHtml(execution.summary || flow.summary)}</div>
        </div>
        <div class="message-head-meta">${badges}</div>
      </div>
      ${executionHtml}
      ${renderToolTimeline(toolSteps)}
      <div class="message-block-list">${blocksHtml}</div>
    </div>
  `;
}

function fillConfig(config) {
  state.config = config;
  const enabled = new Set(config.enabledChannels || []);
  els.channelTelegram.checked = enabled.has('telegram');
  els.channelFeishu.checked = enabled.has('feishu');
  els.channelDiscord.checked = enabled.has('discord');
  els.channelQq.checked = enabled.has('qq');
  els.autoStart.checked = !!config.autoStart;
  els.defaultWorkdir.value = config.defaultWorkdir || 'F:\\QBot01';
  els.defaultMode.value = config.defaultMode || 'code';
  els.defaultModel.value = config.defaultModel || '';
  els.codexPassModel.checked = !!config.codexPassModel;

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
  if ('ready' in adapter) lines.push(`<div>就绪状态：${adapter.ready ? '是' : '否'}</div>`);
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
    ['活跃绑定', `${status.bindingsCount ?? 0}`],
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
  if (!status?.running) alerts.push({ level: 'critical', title: 'Bridge 未运行', detail: '当前桥接进程不在线，可以尝试启动或执行一键诊断修复。' });
  const qqError = status?.adapterState?.qq?.lastError;
  if (qqError) alerts.push({ level: 'error', title: 'QQ 适配器最近有错误', detail: qqError });
  if (status?.statusFile?.lastExitReason) alerts.push({ level: 'warn', title: '记录到最近退出原因', detail: status.statusFile.lastExitReason });
  const missCount = doctor?.summary?.miss || 0;
  if (missCount > Number(thresholds.doctorMissThreshold || 0)) alerts.push({ level: 'warn', title: 'doctor 存在缺失项', detail: `doctor 检测到 ${missCount} 个 MISS 项，已超过阈值 ${thresholds.doctorMissThreshold}。` });
  const latestConversationAt = getLatestConversationAt();
  if (latestConversationAt && status?.running) {
    const diffMinutes = Math.round((Date.now() - latestConversationAt.getTime()) / 60000);
    if (diffMinutes >= Number(thresholds.staleConversationMinutes || 30)) alerts.push({ level: 'warn', title: '会话长时间无新消息', detail: `最近一次会话更新距今约 ${diffMinutes} 分钟，超过阈值 ${thresholds.staleConversationMinutes} 分钟。` });
  }
  if (String(status?.statusStderr || '').includes('spawn EPERM')) alerts.push({ level: 'info', title: '当前为受限环境回退模式', detail: '状态检测已回退到本地文件读取，这不影响本机直跑和桌面壳接入。' });
  return alerts;
}

function deriveSuggestions() {
  const items = [];
  const status = state.status;
  const doctor = state.doctor;
  if (!status?.running) items.push({ title: '先恢复 bridge', detail: '优先点击“启动桥接”或“一键诊断修复”，确认桥接重新在线。' });
  if ((doctor?.summary?.miss || 0) > Number(state.thresholds.doctorMissThreshold || 0)) items.push({ title: '处理 doctor 缺失项', detail: '根据 doctor 结果补齐 config、daemon 或命令行依赖。' });
  const qqError = String(status?.adapterState?.qq?.lastError || '');
  if (qqError.includes('Session timed out') || qqError.includes('Reconnect failed')) items.push({ title: '排查 QQ 网关抖动', detail: '如果频繁出现超时或重连失败，先重启 bridge，再检查网络和代理链路。' });
  const latestConversationAt = getLatestConversationAt();
  if (latestConversationAt && state.status?.running) {
    const diffMinutes = Math.round((Date.now() - latestConversationAt.getTime()) / 60000);
    if (diffMinutes >= Number(state.thresholds.staleConversationMinutes || 30)) items.push({ title: '检查最近会话是否卡住', detail: '最近对话长时间没有更新，可以打开线程详情确认是否卡在某个 session。' });
  }
  if (String(status?.statusStderr || '').includes('spawn EPERM')) items.push({ title: '切到本机直跑查看', detail: '如果当前是受限沙箱，建议直接运行 Web 版或桌面版以获得完整读写能力。' });
  return items;
}

function maybeNotifyAlerts(alerts) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const thresholdLevel = state.thresholds.notifyLevel || 'error';
  alerts.filter((item) => severityRank[item.level] >= severityRank[thresholdLevel]).forEach((alert) => {
    const key = `${alert.level}:${alert.title}:${alert.detail}`;
    if (state.notifiedAlerts.has(key)) return;
    state.notifiedAlerts.add(key);
    new Notification(`\u6865\u63a5\u544a\u8b66: ${alert.title}`, { body: alert.detail });
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
  els.doctorBox.textContent = (doctor.lines || []).join('\n') || 'No doctor output yet.';
  updateInsights();
}

function renderConversations(items) {
  state.conversations = items;
  if (!items.length) {
    els.conversationList.innerHTML = '<div class="empty-card">当前筛选条件下暂无线程</div>';
    if (!state.activeConversation) {
      els.conversationDetailTitle.textContent = '选择一个线程';
      els.conversationDetailMeta.textContent = '当前还没有打开任何线程。';
      els.threadDetailSummary.innerHTML = '';
      els.conversationMessageList.innerHTML = '<div class="empty-card">请从左侧选择线程以查看聚合后的完整对话记录。</div>';
    }
    updateInsights();
    return;
  }
  const activeThreadKey = state.activeConversation?.threadKey || '';
  const pinnedThreadKey = state.pinnedThreadKey || '';
  els.conversationList.innerHTML = items.map((item) => {
    const selectedClass = item.threadKey === activeThreadKey ? ' is-active' : '';
    const pinnedBadge = item.threadKey === pinnedThreadKey ? '<span class="mini-badge is-success">已固定</span>' : '';
    return `
      <div class="data-card thread-card${selectedClass}" data-thread-key="${escapeHtml(item.threadKey)}" data-session-id="${escapeHtml(item.latestSessionId || '')}">
        <div class="thread-card-top">
          <div class="thread-card-title-wrap">
            <strong class="thread-card-title">${escapeHtml(item.channelType)} / ${escapeHtml(item.chatId)}</strong>
            <div class="thread-card-subtitle">${escapeHtml(formatDateTime(item.updatedAt))}</div>
          </div>
          <div class="thread-card-badges">
            ${pinnedBadge}
            <span class="mini-badge ${item.active ? 'is-success' : 'is-muted'}">${item.active ? '活跃' : '停用'}</span>
            <span class="mini-badge is-muted">${escapeHtml(formatFreshness(item.updatedAt))}</span>
          </div>
        </div>
        <div class="thread-card-stats">
          <span>消息 ${escapeHtml(item.messageCount || 0)}</span>
          <span>会话 ${escapeHtml(item.sessionCount || 0)}</span>
          <span>入/${escapeHtml(item.inboundCount || 0)} 出/${escapeHtml(item.outboundCount || 0)}</span>
        </div>
        <div class="audit-summary">${escapeHtml(item.lastPreview || '暂无消息')}</div>
      </div>
    `;
  }).join('');
  updateInsights();
}

function renderConversationDetail(detail) {
  state.activeConversation = {
    ...detail,
    threadKey: detail.threadKey || state.activeConversation?.threadKey || '',
    sessionId: detail.sessionId || state.activeConversation?.sessionId || '',
  };
  const relatedThread = state.conversations.find((item) => item.threadKey === state.activeConversation.threadKey) || null;
  const titleSuffix = detail.scope === 'thread'
    ? `${detail.channelType || 'unknown'} / ${detail.chatId || 'unknown'}`
    : `${detail.binding?.chatId || detail.sessionId}`;
  const scopeMeta = detail.scope === 'thread'
    ? `线程 ${detail.threadKey || 'unknown'} | 关联会话 ${detail.sessionIds?.length || 0}`
    : `会话 ${detail.sessionId}`;
  const templateSummary = [
    relatedThread?.mode || detail.session?.mode || detail.binding?.mode || '未设置',
    detail.session?.model || state.config?.defaultModel || '未指定模型',
  ].join(' · ');
  els.conversationDetailTitle.textContent = `线程详情 · ${titleSuffix}`;
  els.conversationDetailMeta.textContent = `PID: ${detail.pid || '无'} | ${scopeMeta} | 当前 ${detail.messageCount} 条 / 过滤后 ${detail.filteredCount} 条 / 总计 ${detail.totalCount} 条`;
  els.threadDetailSummary.innerHTML = [
    ['Thread Key', detail.threadKey || '无'],
    ['工作目录', relatedThread?.workingDirectory || detail.binding?.workingDirectory || '未绑定'],
    ['运行模板', templateSummary],
    ['消息流向', `入 ${relatedThread?.inboundCount || 0} / 出 ${relatedThread?.outboundCount || 0}`],
  ].map(([label, value]) => `<div class="meta-chip"><strong>${escapeHtml(label)}</strong><div>${escapeHtml(String(value))}</div></div>`).join('');
  if (els.pinThread) els.pinThread.textContent = state.pinnedThreadKey === state.activeConversation.threadKey ? '取消固定' : '固定线程';
  if (els.exportThreadJson) els.exportThreadJson.disabled = !(detail.messages || []).length;
  els.conversationMessageList.innerHTML = (detail.messages || []).length
    ? detail.messages.map((message, index, list) => renderMessageCard(message, detail, index, list.length)).join('')
    : '<div class="empty-card">当前过滤条件下暂无消息</div>';
}
function resetConversationDetail() {
  if (state.conversationTimer) {
    window.clearInterval(state.conversationTimer);
    state.conversationTimer = null;
  }
  state.activeConversation = null;
  els.conversationDetailTitle.textContent = '选择一个线程';
  els.conversationDetailMeta.textContent = '当前还没有打开任何线程。';
  els.threadDetailSummary.innerHTML = '';
  if (els.pinThread) els.pinThread.textContent = '固定线程';
  if (els.exportThreadJson) els.exportThreadJson.disabled = true;
  els.conversationMessageList.innerHTML = '<div class="empty-card">请从左侧选择线程以查看聚合后的完整对话记录。</div>';
}

function collectMessageDetailQuery(target = {}) {
  return buildQuery({
    threadKey: target.threadKey || '',
    sessionId: target.sessionId || '',
    limit: 200,
    q: els.messageSearch.value.trim(),
    role: els.messageRoleFilter.value,
  });
}

function togglePinnedThread() {
  const currentThreadKey = state.activeConversation?.threadKey || '';
  if (!currentThreadKey) return;
  savePinnedThread(state.pinnedThreadKey === currentThreadKey ? '' : currentThreadKey);
  renderConversations(state.conversations);
  if (state.activeConversation) renderConversationDetail(state.activeConversation);
}

function exportCurrentThreadJson() {
  if (!state.activeConversation) return;
  const blob = new Blob([JSON.stringify(state.activeConversation, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeKey = (state.activeConversation.threadKey || 'thread').replaceAll(':', '_');
  link.href = url;
  link.download = `${safeKey}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function openConversationDetail(target = {}) {
  const detail = await api(`/api/bridge/messages?${collectMessageDetailQuery(target)}`);
  renderConversationDetail(detail);
  renderConversations(state.conversations);
  if (state.conversationTimer) window.clearInterval(state.conversationTimer);
  if (els.autoRefreshConversation.checked) {
    state.conversationTimer = window.setInterval(async () => {
      if (!state.activeConversation?.threadKey && !state.activeConversation?.sessionId) return;
      const next = await api(`/api/bridge/messages?${collectMessageDetailQuery(state.activeConversation)}`);
      renderConversationDetail(next);
      renderConversations(state.conversations);
    }, 5000);
  }
}

function collectConfigPayload() {
  return {
    runtime: state.config?.runtime || 'codex',
    enabledChannels: [els.channelTelegram.checked && 'telegram', els.channelFeishu.checked && 'feishu', els.channelDiscord.checked && 'discord', els.channelQq.checked && 'qq'].filter(Boolean),
    defaultWorkdir: els.defaultWorkdir.value.trim() || 'F:\\QBot01',
    defaultMode: els.defaultMode.value || 'code',
    defaultModel: els.defaultModel.value.trim(),
    codexPassModel: !!els.codexPassModel.checked,
    autoStart: els.autoStart.checked,
    telegram: { botToken: els.tgBotToken.value.trim(), chatId: els.tgChatId.value.trim(), allowedUsers: els.tgAllowedUsers.value.trim() },
    feishu: { appId: els.feishuAppId.value.trim(), appSecret: els.feishuAppSecret.value.trim(), domain: els.feishuDomain.value.trim(), allowedUsers: els.feishuAllowedUsers.value.trim() },
    discord: { botToken: els.discordBotToken.value.trim(), allowedUsers: els.discordAllowedUsers.value.trim(), allowedChannels: els.discordAllowedChannels.value.trim(), allowedGuilds: els.discordAllowedGuilds.value.trim() },
    qq: { appId: els.qqAppId.value.trim(), appSecret: els.qqAppSecret.value.trim(), allowedUsers: els.qqAllowedUsers.value.trim(), imageEnabled: els.qqImageEnabled.checked, maxImageSize: Number(els.qqMaxImageSize.value || '20') },
    proxies: state.config?.proxies || {},
  };
}

function collectConversationQuery() {
  return buildQuery({ pid: els.conversationPid.value || '', q: els.conversationSearch.value.trim(), active: els.conversationActiveFilter.value, channelType: els.conversationChannelFilter.value });
}

function collectAuditQuery(limit = 30) {
  return buildQuery({ limit, q: els.auditSearch.value.trim(), direction: els.auditDirectionFilter.value, channelType: els.auditChannelFilter.value });
}

async function refreshLogs() {
  const data = await api('/api/bridge/logs?tail=80');
  els.logBox.textContent = (data.lines || []).join('\n') || '\u6682\u65e0\u65e5\u5fd7';
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
  const items = (await api(`/api/bridge/conversations?${collectConversationQuery()}`)).items || [];
  renderConversations(items);
  if (state.activeConversation?.threadKey) {
    const exists = items.some((item) => item.threadKey === state.activeConversation.threadKey);
    if (exists) await openConversationDetail({ threadKey: state.activeConversation.threadKey, sessionId: state.activeConversation.sessionId || '' });
    else resetConversationDetail();
    return;
  }
  if (state.pinnedThreadKey) {
    const pinned = items.find((item) => item.threadKey === state.pinnedThreadKey);
    if (pinned) await openConversationDetail({ threadKey: pinned.threadKey, sessionId: pinned.latestSessionId || '' });
  }
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
    setStreamStatus('\u65e5\u5fd7\u6d41\u5df2\u6682\u505c', 'idle');
    return;
  }
  if (typeof EventSource === 'undefined') {
    setStreamStatus('\u6d4f\u89c8\u5668\u4e0d\u652f\u6301\u5b9e\u65f6\u65e5\u5fd7\u6d41', 'error');
    state.logTimer = window.setInterval(() => refreshLogs().catch(() => {}), 8000);
    return;
  }
  const source = new EventSource('/api/bridge/logs/stream?tail=80');
  state.logSource = source;
  setStreamStatus('\u65e5\u5fd7\u6d41\u8fde\u63a5\u4e2d...','idle');
  source.onopen = () => setStreamStatus('\u65e5\u5fd7\u6d41\u5df2\u8fde\u63a5', 'success');
  source.onmessage = (event) => {
    const payload = JSON.parse(event.data || '{}');
    els.logBox.textContent = (payload.lines || []).join('\n') || '\u6682\u65e0\u65e5\u5fd7';
  };
  source.onerror = () => {
    setStreamStatus('\u65e5\u5fd7\u6d41\u5df2\u65ad\u5f00\uff0c5 \u79d2\u540e\u91cd\u8fde', 'error');
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
    setFeedback(target, err.message || '\u8fde\u63a5\u6d4b\u8bd5\u5931\u8d25\u3002', 'error');
  }
}

async function toggleBinding(bindingKey, active) {
  try {
    const result = await api('/api/bridge/bindings/toggle', { method: 'POST', body: JSON.stringify({ bindingKey, active }) });
    setFeedback(els.bindingsFeedback, result.message, result.ok ? 'success' : 'error');
  } catch (err) {
    setFeedback(els.bindingsFeedback, err.message || '\u5207\u6362\u7ed1\u5b9a\u5931\u8d25\u3002', 'error');
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
  setFeedback(els.thresholdFeedback, '\u544a\u8b66\u9608\u503c\u5df2\u4fdd\u5b58\u5230\u672c\u5730\u6d4f\u89c8\u5668\u3002', 'success');
  updateInsights();
}

function exportAudit(format) {
  const query = collectAuditQuery(500);
  window.open(`/api/bridge/audit/export?format=${encodeURIComponent(format)}&${query}`, '_blank');
}

const debouncedConversationRefresh = debounce(() => refreshConversations().catch((err) => setFeedback(els.overviewFeedback, err.message || '\u5237\u65B0\u7EBF\u7A0B\u5931\u8D25\u3002', 'error')));
const debouncedAuditRefresh = debounce(() => refreshAudit().catch((err) => setFeedback(els.overviewFeedback, err.message || '\u5237\u65b0\u5ba1\u8ba1\u5931\u8d25\u3002', 'error')));
const debouncedMessageRefresh = debounce(() => {
  if (state.activeConversation?.threadKey || state.activeConversation?.sessionId) openConversationDetail(state.activeConversation).catch((err) => setFeedback(els.overviewFeedback, err.message || '\u5237\u65B0\u6D88\u606F\u5931\u8D25\u3002', 'error'));
});

els.navItems.forEach((item) => item.addEventListener('click', () => showPanel(item.dataset.panel)));
els.panelJumpButtons.forEach((button) => button.addEventListener('click', () => showPanel(button.dataset.panelTarget)));
els.modeTemplateButtons.forEach((button) => button.addEventListener('click', () => {
  const nextMode = button.dataset.mode || 'code';
  els.defaultMode.value = nextMode;
  setFeedback(els.workspaceFeedback, '已切换默认模式到 ' + nextMode + '。', 'success');
}));
els.refreshStatus.addEventListener('click', async () => { clearFeedback(els.overviewFeedback); await refreshAll(); });
els.refreshLogs.addEventListener('click', refreshLogs);
els.refreshBindings.addEventListener('click', refreshBindings);
els.refreshAudit.addEventListener('click', refreshAudit);
els.refreshDoctor.addEventListener('click', refreshDoctor);
els.refreshConversations.addEventListener('click', refreshConversations);
els.conversationPid.addEventListener('change', refreshConversations);
els.conversationSearch.addEventListener('input', debouncedConversationRefresh);
els.conversationChannelFilter.addEventListener('change', refreshConversations);
els.conversationActiveFilter.addEventListener('change', refreshConversations);
els.auditSearch.addEventListener('input', debouncedAuditRefresh);
els.auditDirectionFilter.addEventListener('change', refreshAudit);
els.auditChannelFilter.addEventListener('change', refreshAudit);
els.exportAuditJson.addEventListener('click', () => exportAudit('json'));
els.exportAuditCsv.addEventListener('click', () => exportAudit('csv'));
els.saveThresholds.addEventListener('click', saveThresholdValues);
els.messageSearch.addEventListener('input', debouncedMessageRefresh);
els.messageRoleFilter.addEventListener('change', () => {
  if (state.activeConversation?.threadKey || state.activeConversation?.sessionId) openConversationDetail(state.activeConversation).catch(() => {});
});
els.refreshConversationDetail.addEventListener('click', async () => {
  if (state.activeConversation?.threadKey || state.activeConversation?.sessionId) await openConversationDetail(state.activeConversation);
});
els.pinThread.addEventListener('click', togglePinnedThread);
els.exportThreadJson.addEventListener('click', exportCurrentThreadJson);
els.autoRefreshConversation.addEventListener('change', async () => {
  if (!state.activeConversation?.threadKey && !state.activeConversation?.sessionId) return;
  await openConversationDetail(state.activeConversation);
});
els.autoRefreshLogs.addEventListener('change', connectLogStream);
els.enableNotifications.addEventListener('click', async () => {
  if (!('Notification' in window)) {
    setFeedback(els.overviewFeedback, '\u5F53\u524D\u6D4F\u89C8\u5668\u4E0D\u652F\u6301\u684C\u9762\u901A\u77E5\u3002', 'error');
    return;
  }
  const permission = await Notification.requestPermission();
  setFeedback(els.overviewFeedback, permission === 'granted' ? '\u684C\u9762\u544A\u8B66\u901A\u77E5\u5DF2\u542F\u7528\u3002' : '\u672A\u6388\u4E88\u901A\u77E5\u6743\u9650\u3002', permission === 'granted' ? 'success' : 'error');
});
els.startBridge.addEventListener('click', async () => {
  const result = await api('/api/bridge/start', { method: 'POST' });
  setFeedback(els.overviewFeedback, result.stdout || result.stderr || '\u5DF2\u53D1\u9001 bridge \u542F\u52A8\u547D\u4EE4\u3002', result.ok ? 'success' : 'error');
  await refreshAll();
});
els.stopBridge.addEventListener('click', async () => {
  const result = await api('/api/bridge/stop', { method: 'POST' });
  setFeedback(els.overviewFeedback, result.stdout || result.stderr || '\u5DF2\u53D1\u9001 bridge \u505C\u6B62\u547D\u4EE4\u3002', result.ok ? 'success' : 'error');
  await refreshAll();
});
els.restartBridge.addEventListener('click', async () => {
  const result = await api('/api/bridge/restart', { method: 'POST' });
  setFeedback(els.overviewFeedback, result.start?.stdout || result.start?.stderr || '\u5DF2\u53D1\u9001 bridge \u91CD\u542F\u547D\u4EE4\u3002', result.ok ? 'success' : 'error');
  await refreshAll();
});
els.repairPid.addEventListener('click', async () => {
  const result = await api('/api/bridge/repair-pid', { method: 'POST' });
  setFeedback(els.overviewFeedback, result.message || '\u5DF2\u5C1D\u8BD5\u4FEE\u590D stale PID\u3002', result.ok ? 'success' : 'error');
  await refreshAll();
});
els.runAutoRepair.addEventListener('click', async () => {
  setFeedback(els.overviewFeedback, '\u6B63\u5728\u6267\u884C\u81EA\u52A8\u4FEE\u590D...','success');
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
  const card = event.target.closest('[data-thread-key]');
  if (!card) return;
  await openConversationDetail({ threadKey: card.dataset.threadKey, sessionId: card.dataset.sessionId || '' });
});
els.saveOverview.addEventListener('click', () => saveConfig('\u6e20\u9053\u914d\u7f6e\u5df2\u4fdd\u5b58\u3002', els.overviewFeedback));
els.saveWorkspaceDefaults.addEventListener('click', () => saveConfig('工作区默认值已保存。', els.workspaceFeedback));
els.saveTelegram.addEventListener('click', () => saveConfig('Telegram \u8bbe\u7f6e\u5df2\u4fdd\u5b58\u3002', els.telegramFeedback));
els.saveFeishu.addEventListener('click', () => saveConfig('\u98de\u4e66\u8bbe\u7f6e\u5df2\u4fdd\u5b58\u3002', els.feishuFeedback));
els.saveDiscord.addEventListener('click', () => saveConfig('Discord \u8bbe\u7f6e\u5df2\u4fdd\u5b58\u3002', els.discordFeedback));
els.saveQqCredentials.addEventListener('click', () => saveConfig('QQ \u51ed\u636e\u5df2\u4fdd\u5b58\u3002', els.qqTestResult));
els.saveQqUsers.addEventListener('click', () => saveConfig('\u5141\u8bb8\u7528\u6237\u914d\u7f6e\u5df2\u4fdd\u5b58\u3002', els.qqTestResult));
els.saveQqImages.addEventListener('click', () => saveConfig('\u56fe\u7247\u8bbe\u7f6e\u5df2\u4fdd\u5b58\u3002', els.qqTestResult));
els.testTelegram.addEventListener('click', () => runChannelTest('/api/bridge/test/telegram', { botToken: els.tgBotToken.value.trim() }, els.telegramFeedback, '\u6b63\u5728\u6d4b\u8bd5 Telegram \u8fde\u63a5...'));
els.testFeishu.addEventListener('click', () => runChannelTest('/api/bridge/test/feishu', { appId: els.feishuAppId.value.trim(), appSecret: els.feishuAppSecret.value.trim(), domain: els.feishuDomain.value.trim() }, els.feishuFeedback, '\u6b63\u5728\u6d4b\u8bd5\u98de\u4e66\u8fde\u63a5...'));
els.testDiscord.addEventListener('click', () => runChannelTest('/api/bridge/test/discord', { botToken: els.discordBotToken.value.trim() }, els.discordFeedback, '\u6b63\u5728\u6d4b\u8bd5 Discord \u8fde\u63a5...'));
els.testQqConnection.addEventListener('click', () => runChannelTest('/api/bridge/test/qq', { appId: els.qqAppId.value.trim(), appSecret: els.qqAppSecret.value.trim() }, els.qqTestResult, '\u6b63\u5728\u6d4b\u8bd5 QQ \u8fde\u63a5...'));

window.addEventListener('beforeunload', () => {
  stopLogStreaming();
  if (state.conversationTimer) window.clearInterval(state.conversationTimer);
});

fillThresholds();
refreshAll().then(connectLogStream).catch((err) => {
  els.logBox.textContent = err.message || '\u521d\u59cb\u5316\u5931\u8d25';
  setFeedback(els.overviewFeedback, err.message || '\u521d\u59cb\u5316\u5931\u8d25\u3002', 'error');
  connectLogStream();
});









