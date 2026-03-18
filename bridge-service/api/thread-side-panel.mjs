import { clampThreadPanelLimit } from '../../shared/types/bridge-contracts.mjs';

const CHANNEL_LABELS = Object.freeze({
  qq: 'QQ',
  telegram: 'Telegram',
  feishu: 'Feishu',
  discord: 'Discord',
  unknown: 'Unknown',
});

function normalizeText(value) {
  return String(value || '').trim();
}

function formatFreshness(value) {
  if (!value) return 'No recent activity';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time unknown';
  const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 1) return 'Updated just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day ago`;
}

function buildThreadTitle(item) {
  const channel = CHANNEL_LABELS[item.channelType] || item.channelType || CHANNEL_LABELS.unknown;
  return `${channel} · ${normalizeText(item.chatId) || 'unknown chat'}`;
}

function buildThreadSubtitle(item) {
  const tags = [];
  if (item.pid) tags.push(`PID ${item.pid}`);
  if (item.mode) tags.push(item.mode);
  if (item.workingDirectory) tags.push(item.workingDirectory);
  return tags.join(' · ');
}

function mapThreadItem(item) {
  return {
    sessionId: normalizeText(item.latestSessionId || item.sessionId),
    bindingKey: normalizeText(item.bindingKey || item.threadKey),
    threadKey: normalizeText(item.threadKey),
    channelType: normalizeText(item.channelType) || 'unknown',
    chatId: normalizeText(item.chatId) || 'unknown',
    active: item.active !== false,
    updatedAt: normalizeText(item.updatedAt),
    title: buildThreadTitle(item),
    subtitle: buildThreadSubtitle(item),
    summary: normalizeText(item.lastPreview) || 'No messages yet',
    freshness: formatFreshness(item.updatedAt),
    messageCount: Number(item.messageCount || 0),
    inboundCount: Number(item.inboundCount || 0),
    outboundCount: Number(item.outboundCount || 0),
  };
}

function mapMessage(message) {
  return {
    role: normalizeText(message.role) || 'assistant',
    content: String(message.content || ''),
    createdAt: normalizeText(message.createdAt),
  };
}

export function readThreadPanelRequest(searchParams) {
  return {
    pid: normalizeText(searchParams.get('pid')),
    q: normalizeText(searchParams.get('q')),
    active: normalizeText(searchParams.get('active')) || 'all',
    channelType: normalizeText(searchParams.get('channelType')) || 'all',
    role: normalizeText(searchParams.get('role')) || 'all',
    limit: clampThreadPanelLimit(searchParams.get('limit')),
    sessionId: normalizeText(searchParams.get('sessionId')),
    threadKey: normalizeText(searchParams.get('threadKey')),
  };
}

export function buildThreadPanelThread(detail) {
  if (!detail) return null;
  const binding = detail.binding || {};
  const threadKey = normalizeText(detail.threadKey || binding.threadKey || `${binding.channelType || detail.channelType || 'unknown'}:${binding.chatId || detail.chatId || 'unknown'}`);
  const sessionId = normalizeText(detail.sessionId || binding.codepilotSessionId || binding.sdkSessionId || detail.sessionIds?.at?.(-1) || '');
  const channelType = normalizeText(detail.channelType || binding.channelType) || 'unknown';
  const chatId = normalizeText(detail.chatId || binding.chatId || binding.bindingKey) || 'unknown';
  return {
    sessionId,
    bindingKey: normalizeText(binding.bindingKey || threadKey),
    threadKey,
    title: `${CHANNEL_LABELS[channelType] || channelType} · ${chatId}`,
    subtitle: normalizeText(binding.workingDirectory || detail.session?.working_directory || detail.session?.workingDirectory || ''),
    channelType,
    chatId,
    totalCount: Number(detail.totalCount || 0),
    filteredCount: Number(detail.filteredCount || 0),
    role: normalizeText(detail.role) || 'all',
    query: normalizeText(detail.query),
    messages: Array.isArray(detail.messages) ? detail.messages.map(mapMessage) : [],
  };
}

export function buildThreadPanelBootstrap({ status, threads, activeThread, request }) {
  const items = Array.isArray(threads) ? threads.map(mapThreadItem) : [];
  return {
    generatedAt: new Date().toISOString(),
    request,
    status: {
      running: !!status?.running,
      summaryText: normalizeText(status?.summaryText) || 'Bridge status unavailable',
      bindingsCount: Number(status?.bindingsCount || 0),
      pid: normalizeText(status?.statusFile?.pid),
      lastExitReason: normalizeText(status?.statusFile?.lastExitReason),
    },
    threads: items,
    activeThread: buildThreadPanelThread(activeThread),
  };
}
