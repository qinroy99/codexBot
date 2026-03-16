import fs from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.CTI_UI_PORT || 3210);
const PUBLIC_DIR = path.join(__dirname, 'public');
const PROJECT_ROOT = path.resolve(__dirname, '..');
const BRIDGE_CONTROL = path.join(PROJECT_ROOT, 'scripts', 'bridge-control.ps1');
const DOCTOR_SCRIPT = path.join(PROJECT_ROOT, 'vendor', 'Claude-to-IM-skill', 'scripts', 'doctor.ps1');
const CTI_HOME = path.join(os.homedir(), '.claude-to-im');
const CONFIG_PATH = path.join(CTI_HOME, 'config.env');
const STATUS_PATH = path.join(CTI_HOME, 'runtime', 'status.json');
const PID_PATH = path.join(CTI_HOME, 'runtime', 'bridge.pid');
const LOG_PATH = path.join(CTI_HOME, 'logs', 'bridge.log');
const DATA_DIR = path.join(CTI_HOME, 'data');
const BINDINGS_PATH = path.join(DATA_DIR, 'bindings.json');
const AUDIT_PATH = path.join(DATA_DIR, 'audit.json');
const SESSIONS_PATH = path.join(DATA_DIR, 'sessions.json');
const MESSAGES_DIR = path.join(DATA_DIR, 'messages');

const CONFIG_ORDER = [
  'CTI_RUNTIME', 'CTI_ENABLED_CHANNELS', 'CTI_DEFAULT_WORKDIR', 'CTI_DEFAULT_MODE', 'CTI_DEFAULT_MODEL', 'CTI_BRIDGE_AUTO_START',
  'CTI_TG_BOT_TOKEN', 'CTI_TG_CHAT_ID', 'CTI_TG_ALLOWED_USERS',
  'CTI_FEISHU_APP_ID', 'CTI_FEISHU_APP_SECRET', 'CTI_FEISHU_DOMAIN', 'CTI_FEISHU_ALLOWED_USERS',
  'CTI_DISCORD_BOT_TOKEN', 'CTI_DISCORD_ALLOWED_USERS', 'CTI_DISCORD_ALLOWED_CHANNELS', 'CTI_DISCORD_ALLOWED_GUILDS',
  'CTI_QQ_APP_ID', 'CTI_QQ_APP_SECRET', 'CTI_QQ_ALLOWED_USERS', 'CTI_QQ_IMAGE_ENABLED', 'CTI_QQ_MAX_IMAGE_SIZE',
  'HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY',
];

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data, null, 2));
}

function sendBuffer(res, status, data, type = 'text/plain; charset=utf-8', extraHeaders = {}) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', ...extraHeaders });
  res.end(data);
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 2 * 1024 * 1024) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

function parseEnv(text) {
  const lines = text.split(/\r?\n/);
  const entries = {};
  const extraLines = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      extraLines.push(line);
      continue;
    }
    const idx = line.indexOf('=');
    entries[line.slice(0, idx).trim()] = line.slice(idx + 1);
  }
  return { entries, extraLines };
}

function stringifyEnv(entries, extraLines) {
  const lines = [];
  for (const key of CONFIG_ORDER) if (key in entries && entries[key] !== '') lines.push(`${key}=${entries[key]}`);
  for (const [key, value] of Object.entries(entries)) if (!CONFIG_ORDER.includes(key) && value !== '') lines.push(`${key}=${value}`);
  if (extraLines.length) lines.push(...extraLines.filter((line) => line.trim()));
  return `${lines.join('\n')}\n`;
}

function maskSecret(value) {
  if (!value) return '';
  if (value.length <= 4) return '*'.repeat(value.length);
  return `${'*'.repeat(Math.max(8, value.length - 4))}${value.slice(-4)}`;
}

function splitCsv(value) {
  return (value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeRole(value) {
  const role = normalizeText(value).toLowerCase();
  return ['user', 'assistant', 'system'].includes(role) ? role : 'all';
}

function normalizeActiveFilter(value) {
  const active = normalizeText(value).toLowerCase();
  return ['active', 'inactive'].includes(active) ? active : 'all';
}

function normalizeDirection(value) {
  const direction = normalizeText(value).toLowerCase();
  return ['inbound', 'outbound'].includes(direction) ? direction : 'all';
}

function normalizeChannelType(value) {
  const type = normalizeText(value).toLowerCase();
  return ['telegram', 'feishu', 'discord', 'qq'].includes(type) ? type : 'all';
}

function buildThreadKey(channelType, chatId) {
  return `${normalizeText(channelType) || 'unknown'}:${normalizeText(chatId) || 'unknown'}`;
}

function parseThreadKey(threadKey) {
  const raw = normalizeText(threadKey);
  const idx = raw.indexOf(':');
  if (idx < 0) return { channelType: '', chatId: raw };
  return { channelType: raw.slice(0, idx), chatId: raw.slice(idx + 1) };
}

function compareIsoDesc(a, b) {
  return String(b || '').localeCompare(String(a || ''));
}

function normalizeDomain(domain, fallback) {
  const trimmed = normalizeText(domain);
  if (!trimmed) return fallback;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function matchesKeyword(value, keyword) {
  if (!keyword) return true;
  return String(value || '').toLowerCase().includes(keyword.toLowerCase());
}

async function readConfig(includeSecrets = false) {
  let entries = {};
  try { entries = parseEnv(await fsp.readFile(CONFIG_PATH, 'utf8')).entries; } catch {}
  return {
    exists: Object.keys(entries).length > 0,
    runtime: entries.CTI_RUNTIME || 'codex',
    enabledChannels: splitCsv(entries.CTI_ENABLED_CHANNELS),
    defaultWorkdir: entries.CTI_DEFAULT_WORKDIR || 'F:\\QBot01',
    defaultMode: entries.CTI_DEFAULT_MODE || 'code',
    defaultModel: entries.CTI_DEFAULT_MODEL || '',
    autoStart: entries.CTI_BRIDGE_AUTO_START === 'true',
    telegram: {
      hasToken: !!entries.CTI_TG_BOT_TOKEN,
      botTokenMasked: maskSecret(entries.CTI_TG_BOT_TOKEN || ''),
      ...(includeSecrets ? { botTokenRaw: entries.CTI_TG_BOT_TOKEN || '' } : {}),
      chatId: entries.CTI_TG_CHAT_ID || '',
      allowedUsers: entries.CTI_TG_ALLOWED_USERS || '',
    },
    feishu: {
      appId: entries.CTI_FEISHU_APP_ID || '',
      hasSecret: !!entries.CTI_FEISHU_APP_SECRET,
      appSecretMasked: maskSecret(entries.CTI_FEISHU_APP_SECRET || ''),
      ...(includeSecrets ? { appSecretRaw: entries.CTI_FEISHU_APP_SECRET || '' } : {}),
      domain: entries.CTI_FEISHU_DOMAIN || 'https://open.feishu.cn',
      allowedUsers: entries.CTI_FEISHU_ALLOWED_USERS || '',
    },
    discord: {
      hasToken: !!entries.CTI_DISCORD_BOT_TOKEN,
      botTokenMasked: maskSecret(entries.CTI_DISCORD_BOT_TOKEN || ''),
      ...(includeSecrets ? { botTokenRaw: entries.CTI_DISCORD_BOT_TOKEN || '' } : {}),
      allowedUsers: entries.CTI_DISCORD_ALLOWED_USERS || '',
      allowedChannels: entries.CTI_DISCORD_ALLOWED_CHANNELS || '',
      allowedGuilds: entries.CTI_DISCORD_ALLOWED_GUILDS || '',
    },
    qq: {
      appId: entries.CTI_QQ_APP_ID || '',
      hasSecret: !!entries.CTI_QQ_APP_SECRET,
      appSecretMasked: maskSecret(entries.CTI_QQ_APP_SECRET || ''),
      ...(includeSecrets ? { appSecretRaw: entries.CTI_QQ_APP_SECRET || '' } : {}),
      allowedUsers: entries.CTI_QQ_ALLOWED_USERS || entries.CTI_QQ_ALLOWED_USER_OPENIDS || '',
      imageEnabled: (entries.CTI_QQ_IMAGE_ENABLED || 'true') === 'true',
      maxImageSize: Number(entries.CTI_QQ_MAX_IMAGE_SIZE || '20'),
    },
    proxies: {
      httpProxy: entries.HTTP_PROXY || '',
      httpsProxy: entries.HTTPS_PROXY || '',
      allProxy: entries.ALL_PROXY || '',
      noProxy: entries.NO_PROXY || '',
    },
  };
}

async function writeConfig(payload) {
  let raw = '';
  try { raw = await fsp.readFile(CONFIG_PATH, 'utf8'); } catch { raw = ''; }
  const { entries, extraLines } = parseEnv(raw);
  entries.CTI_RUNTIME = payload.runtime || 'codex';
  entries.CTI_ENABLED_CHANNELS = Array.isArray(payload.enabledChannels) ? payload.enabledChannels.join(',') : 'qq';
  entries.CTI_DEFAULT_WORKDIR = payload.defaultWorkdir || 'F:\\QBot01';
  entries.CTI_DEFAULT_MODE = payload.defaultMode || 'code';
  entries.CTI_DEFAULT_MODEL = payload.defaultModel || '';
  entries.CTI_BRIDGE_AUTO_START = payload.autoStart ? 'true' : 'false';
  if (payload.telegram) {
    if (payload.telegram.botToken) entries.CTI_TG_BOT_TOKEN = payload.telegram.botToken;
    entries.CTI_TG_CHAT_ID = payload.telegram.chatId || '';
    entries.CTI_TG_ALLOWED_USERS = payload.telegram.allowedUsers || '';
  }
  if (payload.feishu) {
    entries.CTI_FEISHU_APP_ID = payload.feishu.appId || '';
    if (payload.feishu.appSecret) entries.CTI_FEISHU_APP_SECRET = payload.feishu.appSecret;
    entries.CTI_FEISHU_DOMAIN = payload.feishu.domain || 'https://open.feishu.cn';
    entries.CTI_FEISHU_ALLOWED_USERS = payload.feishu.allowedUsers || '';
  }
  if (payload.discord) {
    if (payload.discord.botToken) entries.CTI_DISCORD_BOT_TOKEN = payload.discord.botToken;
    entries.CTI_DISCORD_ALLOWED_USERS = payload.discord.allowedUsers || '';
    entries.CTI_DISCORD_ALLOWED_CHANNELS = payload.discord.allowedChannels || '';
    entries.CTI_DISCORD_ALLOWED_GUILDS = payload.discord.allowedGuilds || '';
  }
  if (payload.qq) {
    entries.CTI_QQ_APP_ID = payload.qq.appId || '';
    if (payload.qq.appSecret) entries.CTI_QQ_APP_SECRET = payload.qq.appSecret;
    entries.CTI_QQ_ALLOWED_USERS = payload.qq.allowedUsers || '';
    entries.CTI_QQ_ALLOWED_USER_OPENIDS = '';
    entries.CTI_QQ_IMAGE_ENABLED = payload.qq.imageEnabled ? 'true' : 'false';
    entries.CTI_QQ_MAX_IMAGE_SIZE = String(payload.qq.maxImageSize || 20);
  }
  if (payload.proxies) {
    entries.HTTP_PROXY = payload.proxies.httpProxy || entries.HTTP_PROXY || '';
    entries.HTTPS_PROXY = payload.proxies.httpsProxy || entries.HTTPS_PROXY || '';
    entries.ALL_PROXY = payload.proxies.allProxy || entries.ALL_PROXY || '';
    entries.NO_PROXY = payload.proxies.noProxy || entries.NO_PROXY || '';
  }
  await fsp.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  const tempPath = `${CONFIG_PATH}.tmp`;
  await fsp.writeFile(tempPath, stringifyEnv(entries, extraLines), 'utf8');
  await fsp.rename(tempPath, CONFIG_PATH);
}

async function readJsonFile(filePath, fallback) {
  try { return JSON.parse(await fsp.readFile(filePath, 'utf8')); } catch { return fallback; }
}

async function writeJsonFile(filePath, data) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  await fsp.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8');
  await fsp.rename(tempPath, filePath);
}

async function tailFile(filePath, count = 80) {
  try { return (await fsp.readFile(filePath, 'utf8')).split(/\r?\n/).filter(Boolean).slice(-count); } catch { return []; }
}

function execPowerShell(args, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', ...args], { cwd: PROJECT_ROOT, windowsHide: true });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('Command timed out'));
    }, timeoutMs);
    child.stdout.on('data', (chunk) => { stdout += chunk.toString('utf8'); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf8'); });
    child.on('error', (err) => { clearTimeout(timer); reject(err); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() }); });
  });
}

function resolveCommand(command) {
  const pathValue = process.env.PATH || '';
  const pathExt = (process.env.PATHEXT || '.EXE;.CMD;.BAT;.COM').split(';').filter(Boolean);
  const hasExt = /\.[a-z0-9]+$/i.test(command);
  for (const baseDir of pathValue.split(';').filter(Boolean)) {
    const direct = path.join(baseDir, command);
    if (fs.existsSync(direct)) return direct;
    if (!hasExt) {
      for (const ext of pathExt) {
        const candidates = [path.join(baseDir, `${command}${ext.toLowerCase()}`), path.join(baseDir, `${command}${ext.toUpperCase()}`)];
        for (const candidate of candidates) if (fs.existsSync(candidate)) return candidate;
      }
    }
  }
  return null;
}

function findLastTimestamp(lines, keyword) {
  const line = [...lines].reverse().find((item) => item.includes(keyword));
  const match = line?.match(/\[(\d{4}-\d{2}-\d{2}T[^\]]+)\]/);
  return match?.[1] || null;
}

function findLastError(lines, keywords) {
  return [...lines].reverse().find((item) => keywords.some((keyword) => item.includes(keyword)) && item.includes('[ERROR]')) || null;
}

function findLastAuditTime(audit, direction, channelType) {
  return [...audit].reverse().find((entry) => entry.direction === direction && entry.channelType === channelType)?.createdAt || null;
}

function parseSummary(entry) {
  return String(entry.summary || entry.text || entry.content || '').replace(/\s+/g, ' ').trim();
}

async function getBindings() {
  const raw = await readJsonFile(BINDINGS_PATH, {});
  return Object.entries(raw).map(([bindingKey, binding]) => ({ bindingKey, ...binding, active: binding.active !== false })).sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}

async function getAudit(limit = 50, filters = {}) {
  const keyword = normalizeText(filters.q).toLowerCase();
  const direction = normalizeDirection(filters.direction);
  const channelType = normalizeChannelType(filters.channelType);
  const items = await readJsonFile(AUDIT_PATH, []);
  return items.slice().reverse().filter((entry) => {
    if (direction !== 'all' && String(entry.direction || '').toLowerCase() !== direction) return false;
    if (channelType !== 'all' && String(entry.channelType || '').toLowerCase() !== channelType) return false;
    if (!keyword) return true;
    return [entry.summary, entry.chatId, entry.sessionId, entry.bindingKey, entry.channelType, entry.direction].some((value) => matchesKeyword(value, keyword));
  }).slice(0, limit).map((entry) => ({ ...entry, summary: parseSummary(entry) }));
}

async function buildConversationThreads(pid = '', filters = {}) {
  const [bindings, sessions, audit] = await Promise.all([
    getBindings(),
    readJsonFile(SESSIONS_PATH, {}),
    readJsonFile(AUDIT_PATH, []),
  ]);
  const keyword = normalizeText(filters.q).toLowerCase();
  const active = normalizeActiveFilter(filters.active);
  const channelTypeFilter = normalizeChannelType(filters.channelType);
  const targetPid = normalizeText(pid);
  const threadMap = new Map();

  const ensureThread = (channelType, chatId) => {
    const threadKey = buildThreadKey(channelType, chatId);
    if (!threadMap.has(threadKey)) {
      threadMap.set(threadKey, {
        threadKey,
        channelType: normalizeText(channelType) || 'unknown',
        chatId: normalizeText(chatId) || 'unknown',
        active: false,
        pids: new Set(),
        workingDirectories: new Set(),
        modes: new Set(),
        sessionIds: new Set(),
        latestSessionId: '',
        messageCount: 0,
        inboundCount: 0,
        outboundCount: 0,
        latestAuditAt: null,
        updatedAt: null,
        lastPreview: '',
      });
    }
    return threadMap.get(threadKey);
  };

  for (const binding of bindings) {
    const sessionId = binding.codepilotSessionId || binding.sdkSessionId || binding.sessionId;
    const channelType = binding.channelType || 'unknown';
    const chatId = binding.chatId || binding.bindingKey;
    const session = sessions[sessionId] || {};
    const sessionPid = String(binding.pid || session.pid || '');
    if (targetPid && sessionPid !== targetPid) continue;
    if (channelTypeFilter !== 'all' && channelType !== channelTypeFilter) continue;
    if (active === 'active' && binding.active === false) continue;
    if (active === 'inactive' && binding.active !== false) continue;
    const thread = ensureThread(channelType, chatId);
    const messages = sessionId ? await readJsonFile(path.join(MESSAGES_DIR, `${sessionId}.json`), []) : [];
    const lastMessage = [...messages].reverse().find((item) => item?.content);
    const lastPreview = String(lastMessage?.content || '').replace(/\s+/g, ' ').trim().slice(0, 180);
    const updatedAt = binding.updatedAt || session.updatedAt || session.createdAt || null;
    thread.active = thread.active || binding.active !== false;
    if (sessionPid) thread.pids.add(sessionPid);
    if (binding.workingDirectory || session.workingDirectory) thread.workingDirectories.add(binding.workingDirectory || session.workingDirectory);
    if (binding.mode || session.mode) thread.modes.add(binding.mode || session.mode);
    if (sessionId) thread.sessionIds.add(sessionId);
    thread.messageCount += messages.length;
    if (compareIsoDesc(updatedAt, thread.updatedAt) < 0) {
      thread.updatedAt = updatedAt;
      thread.latestSessionId = sessionId || thread.latestSessionId;
      if (lastPreview) thread.lastPreview = lastPreview;
    }
    if (!thread.lastPreview && lastPreview) thread.lastPreview = lastPreview;
  }

  for (const entry of audit) {
    const channelType = entry.channelType || 'unknown';
    const chatId = entry.chatId || entry.bindingKey || 'unknown';
    if (channelTypeFilter !== 'all' && channelType !== channelTypeFilter) continue;
    const thread = ensureThread(channelType, chatId);
    if (entry.direction === 'inbound') thread.inboundCount += 1;
    if (entry.direction === 'outbound') thread.outboundCount += 1;
    if (!thread.lastPreview || compareIsoDesc(entry.createdAt, thread.latestAuditAt) < 0) {
      thread.latestAuditAt = entry.createdAt || thread.latestAuditAt;
      if (parseSummary(entry)) thread.lastPreview = parseSummary(entry).slice(0, 180);
    }
    if (compareIsoDesc(entry.createdAt, thread.updatedAt) < 0) thread.updatedAt = entry.createdAt || thread.updatedAt;
  }

  const results = Array.from(threadMap.values()).map((thread) => {
    const pids = Array.from(thread.pids);
    const workingDirectories = Array.from(thread.workingDirectories);
    const modes = Array.from(thread.modes);
    const sessionIds = Array.from(thread.sessionIds);
    return {
      threadKey: thread.threadKey,
      channelType: thread.channelType,
      chatId: thread.chatId,
      active: thread.active,
      pid: pids[0] || '',
      pids,
      workingDirectory: workingDirectories[0] || '',
      workingDirectories,
      mode: modes[0] || '',
      modes,
      sessionIds,
      sessionCount: sessionIds.length,
      latestSessionId: thread.latestSessionId || sessionIds.at(-1) || '',
      messageCount: thread.messageCount,
      inboundCount: thread.inboundCount,
      outboundCount: thread.outboundCount,
      updatedAt: thread.updatedAt,
      latestAuditAt: thread.latestAuditAt,
      lastPreview: thread.lastPreview || '',
    };
  }).filter((item) => {
    if (active === 'active' && !item.active) return false;
    if (active === 'inactive' && item.active) return false;
    if (targetPid && !(item.pids || []).includes(targetPid)) return false;
    if (!keyword) return true;
    const haystack = [
      item.threadKey,
      item.channelType,
      item.chatId,
      item.pid,
      item.workingDirectory,
      item.mode,
      item.lastPreview,
      ...(item.sessionIds || []),
    ].join(' ').toLowerCase();
    return haystack.includes(keyword);
  });

  return results.sort((a, b) => compareIsoDesc(a.updatedAt, b.updatedAt));
}

async function listConversations(pid = '', filters = {}) {
  return buildConversationThreads(pid, filters);
}

async function getConversationDetail(sessionId, options = {}) {
  const keyword = normalizeText(options.q).toLowerCase();
  const role = normalizeRole(options.role);
  const limit = Math.max(1, Number(options.limit || 200));
  const threadKey = normalizeText(options.threadKey);
  const bindings = await getBindings();
  const sessions = await readJsonFile(SESSIONS_PATH, {});

  if (threadKey) {
    const { channelType, chatId } = parseThreadKey(threadKey);
    const relatedBindings = bindings.filter((item) => {
      const bindingChatId = String(item.chatId || item.bindingKey || '');
      if (channelType && item.channelType !== channelType) return false;
      if (chatId && bindingChatId !== chatId) return false;
      return true;
    });
    const sessionEntries = [];
    for (const binding of relatedBindings) {
      const relatedSessionId = binding.codepilotSessionId || binding.sdkSessionId || binding.sessionId;
      if (!relatedSessionId) continue;
      const session = sessions[relatedSessionId] || {};
      const messages = await readJsonFile(path.join(MESSAGES_DIR, `${relatedSessionId}.json`), []);
      sessionEntries.push({
        sessionId: relatedSessionId,
        binding,
        session,
        pid: String(binding.pid || session.pid || ''),
        updatedAt: binding.updatedAt || session.updatedAt || session.createdAt || null,
        messages,
      });
    }
    sessionEntries.sort((a, b) => compareIsoDesc(a.updatedAt, b.updatedAt) * -1);
    const allMessages = sessionEntries.flatMap((entry) => entry.messages.map((message) => ({ ...message, sessionId: entry.sessionId })));
    const filteredMessages = allMessages.filter((message) => {
      if (role !== 'all' && String(message.role || '').toLowerCase() !== role) return false;
      if (keyword && !String(message.content || '').toLowerCase().includes(keyword)) return false;
      return true;
    });
    const messages = filteredMessages.slice(-limit);
    const pids = Array.from(new Set(sessionEntries.map((entry) => entry.pid).filter(Boolean)));
    return {
      scope: 'thread',
      threadKey,
      channelType: channelType || (relatedBindings[0]?.channelType || 'unknown'),
      chatId: chatId || (relatedBindings[0]?.chatId || relatedBindings[0]?.bindingKey || 'unknown'),
      pid: pids[0] || '',
      pids,
      binding: relatedBindings[0] || null,
      bindings: relatedBindings,
      session: sessionEntries.at(-1)?.session || null,
      sessionIds: sessionEntries.map((entry) => entry.sessionId),
      totalCount: allMessages.length,
      filteredCount: filteredMessages.length,
      messageCount: messages.length,
      role,
      query: keyword,
      messages,
    };
  }

  if (!sessionId) throw new Error('ȱ�� sessionId �� threadKey��');
  const binding = bindings.find((item) => item.codepilotSessionId === sessionId || item.sdkSessionId === sessionId || item.sessionId === sessionId) || null;
  const session = sessions[sessionId] || {};
  const allMessages = await readJsonFile(path.join(MESSAGES_DIR, `${sessionId}.json`), []);
  const filteredMessages = allMessages.filter((message) => {
    if (role !== 'all' && String(message.role || '').toLowerCase() !== role) return false;
    if (keyword && !String(message.content || '').toLowerCase().includes(keyword)) return false;
    return true;
  });
  const messages = filteredMessages.slice(-limit);
  return {
    scope: 'session',
    sessionId,
    pid: String(binding?.pid || session.pid || ''),
    binding,
    session,
    totalCount: allMessages.length,
    filteredCount: filteredMessages.length,
    messageCount: messages.length,
    role,
    query: keyword,
    messages,
  };
}

function buildAdapterState(enabledChannels, running, logs, audit) {
  const enabled = new Set(enabledChannels || []);
  const qqReadyAt = findLastTimestamp(logs, 'Gateway READY');
  const qqResumedAt = findLastTimestamp(logs, 'Gateway RESUMED');
  return {
    telegram: { enabled: enabled.has('telegram'), running: enabled.has('telegram') && running, ready: enabled.has('telegram') && running, lastInboundAt: findLastAuditTime(audit, 'inbound', 'telegram'), lastOutboundAt: findLastAuditTime(audit, 'outbound', 'telegram'), lastError: findLastError(logs, ['Telegram']) || null },
    feishu: { enabled: enabled.has('feishu'), running: enabled.has('feishu') && running, ready: enabled.has('feishu') && running, lastInboundAt: findLastAuditTime(audit, 'inbound', 'feishu'), lastOutboundAt: findLastAuditTime(audit, 'outbound', 'feishu'), lastError: findLastError(logs, ['Feishu', 'Lark']) || null },
    discord: { enabled: enabled.has('discord'), running: enabled.has('discord') && running, ready: enabled.has('discord') && running, lastInboundAt: findLastAuditTime(audit, 'inbound', 'discord'), lastOutboundAt: findLastAuditTime(audit, 'outbound', 'discord'), lastError: findLastError(logs, ['Discord']) || null },
    qq: { enabled: enabled.has('qq'), running: enabled.has('qq') && running, ready: enabled.has('qq') && !!(qqReadyAt || qqResumedAt), lastInboundAt: findLastAuditTime(audit, 'inbound', 'qq'), lastOutboundAt: findLastAuditTime(audit, 'outbound', 'qq'), resumedAt: qqResumedAt, lastError: findLastError(logs, ['QQ', 'Gateway']) || null },
  };
}

async function getBridgeRuntimeStatus() {
  const [config, statusFile, recentLogs, audit, bindings] = await Promise.all([readConfig(false), readJsonFile(STATUS_PATH, {}), tailFile(LOG_PATH, 80), getAudit(200), getBindings()]);
  let statusStdout = '';
  let statusStderr = '';
  let running = false;
  try {
    const result = await execPowerShell(['-File', BRIDGE_CONTROL, 'status'], 30000);
    statusStdout = result.stdout;
    statusStderr = result.stderr;
    const combined = `${result.stdout}\n${result.stderr}`.toLowerCase();
    running = combined.includes('running') && !combined.includes('not running');
  } catch (err) {
    statusStderr = err instanceof Error ? err.message : String(err);
    running = !!statusFile.pid || statusFile.running === true;
  }
  return {
    running,
    summaryText: running ? `桥接当前在线，已启用 ${config.enabledChannels.length || 0} 个渠道。` : '桥接当前未运行，可尝试启动或执行一键诊断修复。',
    enabledChannels: config.enabledChannels,
    bindingsCount: bindings.length,
    recentLogs,
    statusFile,
    statusStdout,
    statusStderr,
    adapterState: buildAdapterState(config.enabledChannels, running, recentLogs, audit),
    latestAuditAt: audit[0]?.createdAt || null,
  };
}

function requestJson(rawUrl, options = {}) {
  const url = new URL(rawUrl);
  const transport = url.protocol === 'https:' ? https : http;
  const payload = options.body ? JSON.stringify(options.body) : null;
  return new Promise((resolve, reject) => {
    const req = transport.request({
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || undefined,
      path: `${url.pathname}${url.search}`,
      method: options.method || 'GET',
      headers: { Accept: 'application/json', ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}), ...(options.headers || {}) },
      timeout: options.timeoutMs || 15000,
    }, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk.toString('utf8'); });
      res.on('end', () => {
        try { resolve({ statusCode: res.statusCode || 0, json: raw ? JSON.parse(raw) : {}, raw }); }
        catch (err) { reject(new Error(`Invalid JSON response from ${url.hostname}: ${err instanceof Error ? err.message : String(err)}`)); }
      });
    });
    req.on('timeout', () => req.destroy(new Error(`Request timed out: ${url.hostname}`)));
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function testTelegramConnection(config, payload) {
  const token = payload.botToken || config.telegram.botTokenRaw || '';
  if (!token) return { ok: false, message: '请先填写 Telegram Bot Token。' };
  const result = await requestJson(`https://api.telegram.org/bot${token}/getMe`);
  if (result.json.ok) return { ok: true, message: `Telegram 连接测试通过：@${result.json.result?.username || 'unknown'}`, detail: result.json.result || {} };
  return { ok: false, message: result.json.description || 'Telegram 连接测试失败。', detail: result.json };
}

async function testDiscordConnection(config, payload) {
  const token = payload.botToken || config.discord.botTokenRaw || '';
  if (!token) return { ok: false, message: '请先填写 Discord Bot Token。' };
  const result = await requestJson('https://discord.com/api/v10/users/@me', { headers: { Authorization: `Bot ${token}` } });
  if (result.statusCode >= 200 && result.statusCode < 300 && result.json.id) return { ok: true, message: `Discord 连接测试通过：${result.json.username || 'bot'}#${result.json.discriminator || '0'}`, detail: result.json };
  return { ok: false, message: result.json.message || 'Discord 连接测试失败。', detail: result.json };
}

async function testFeishuConnection(config, payload) {
  const appId = payload.appId || config.feishu.appId || '';
  const appSecret = payload.appSecret || config.feishu.appSecretRaw || '';
  const domain = normalizeDomain(payload.domain || config.feishu.domain, 'https://open.feishu.cn');
  if (!appId || !appSecret) return { ok: false, message: '请先填写飞书 App ID 和 App Secret。' };
  const result = await requestJson(`${domain}/open-apis/auth/v3/tenant_access_token/internal`, { method: 'POST', body: { app_id: appId, app_secret: appSecret } });
  if (result.json.code === 0 && result.json.tenant_access_token) return { ok: true, message: '飞书连接测试通过，已成功获取 tenant_access_token。', expire: result.json.expire || null };
  return { ok: false, message: result.json.msg || '飞书连接测试失败。', detail: result.json };
}

async function testQqConnection(config, payload) {
  const appId = payload.appId || config.qq.appId || '';
  const appSecret = payload.appSecret || config.qq.appSecretRaw || '';
  if (!appId || !appSecret) return { ok: false, message: '请填写 QQ App ID 和 App Secret。' };
  const result = await requestJson('https://bots.qq.com/app/getAppAccessToken', { method: 'POST', body: { appId, clientSecret: appSecret } });
  if (result.json.access_token) return { ok: true, message: 'QQ 连接测试通过，已成功获取 access_token。', expiresIn: result.json.expires_in || null };
  return { ok: false, message: result.json.message || 'QQ 连接测试失败，未获取到 access_token。', detail: result.json };
}
async function repairStalePid() {
  try { await fsp.unlink(PID_PATH); return { ok: true, message: '已清理 bridge.pid。' }; }
  catch (err) { return { ok: false, message: err instanceof Error ? err.message : String(err) }; }
}

function parseDoctorOutput(output) {
  const lines = output.split(/\r?\n/).filter(Boolean);
  const checks = lines.filter((line) => /^\[(OK|MISS|INFO)\]/.test(line)).map((line) => {
    const match = line.match(/^\[(OK|MISS|INFO)\]\s+(.*)$/);
    return { level: match?.[1] || 'INFO', text: match?.[2] || line };
  });
  return { lines, checks, summary: { ok: checks.filter((item) => item.level === 'OK').length, miss: checks.filter((item) => item.level === 'MISS').length, info: checks.filter((item) => item.level === 'INFO').length } };
}

async function runInternalDoctor(logLines = 80, reason = '') {
  const [config, statusFile, logs] = await Promise.all([readConfig(false), readJsonFile(STATUS_PATH, {}), tailFile(LOG_PATH, logLines)]);
  const lines = ['Claude-to-IM Doctor', ''];
  const checks = [];
  if (reason) { lines.push(`[INFO] doctor.ps1 fallback: ${reason}`); checks.push({ level: 'INFO', text: `doctor.ps1 fallback: ${reason}` }); }
  for (const item of [{ name: 'node', command: 'node' }, { name: 'npm', command: 'npm.cmd' }, { name: 'git', command: 'git.exe' }, { name: 'codex', command: 'codex.exe' }]) {
    const found = resolveCommand(item.command);
    if (found) { lines.push(`[OK]   ${item.name} -> ${found}`); checks.push({ level: 'OK', text: `${item.name} -> ${found}` }); }
    else { lines.push(`[MISS] ${item.name}`); checks.push({ level: 'MISS', text: item.name }); }
  }
  lines.push('');
  if (config.exists) { lines.push(`[OK]   config -> ${CONFIG_PATH}`); checks.push({ level: 'OK', text: `config -> ${CONFIG_PATH}` }); }
  else { lines.push(`[MISS] config -> ${CONFIG_PATH}`); checks.push({ level: 'MISS', text: `config -> ${CONFIG_PATH}` }); }
  const daemonPath = path.join(PROJECT_ROOT, 'vendor', 'Claude-to-IM-skill', 'dist', 'daemon.mjs');
  if (fs.existsSync(daemonPath)) { lines.push(`[OK]   daemon -> ${daemonPath}`); checks.push({ level: 'OK', text: `daemon -> ${daemonPath}` }); }
  else { lines.push(`[MISS] daemon -> ${daemonPath}`); checks.push({ level: 'MISS', text: `daemon -> ${daemonPath}` }); }
  if (statusFile && Object.keys(statusFile).length) { lines.push('', '[INFO] status.json', JSON.stringify(statusFile, null, 2)); checks.push({ level: 'INFO', text: 'status.json' }); }
  if (logs.length) { lines.push('', `[INFO] last ${logLines} log lines`, ...logs); checks.push({ level: 'INFO', text: `last ${logLines} log lines` }); }
  const summary = { ok: checks.filter((item) => item.level === 'OK').length, miss: checks.filter((item) => item.level === 'MISS').length, info: checks.filter((item) => item.level === 'INFO').length };
  return { ok: summary.miss === 0, lines, checks, summary, stdout: lines.join('\n'), stderr: '' };
}

async function runDoctor(logLines = 80) {
  try {
    const result = await execPowerShell(['-File', DOCTOR_SCRIPT, String(logLines)], 60000);
    const combined = [result.stdout, result.stderr].filter(Boolean).join('\n');
    return { ok: result.code === 0 || combined.length > 0, ...parseDoctorOutput(combined), stdout: result.stdout, stderr: result.stderr };
  } catch (err) {
    return runInternalDoctor(logLines, err instanceof Error ? err.message : String(err));
  }
}

async function toggleBindingActive(bindingKey, active) {
  const bindings = await readJsonFile(BINDINGS_PATH, {});
  if (!bindings[bindingKey]) throw new Error('未找到该绑定记录。');
  bindings[bindingKey].active = !!active;
  bindings[bindingKey].updatedAt = new Date().toISOString();
  await writeJsonFile(BINDINGS_PATH, bindings);
  return { ok: true, message: active ? '会话绑定已重新启用。' : '会话绑定已停用。' };
}

async function runAutoRepair() {
  const actions = [];
  const config = await readConfig(false);
  const status = await getBridgeRuntimeStatus();
  if (!status.running && fs.existsSync(PID_PATH)) actions.push({ step: 'repair_pid', ...(await repairStalePid()) });
  if (!status.running && config.exists) {
    try {
      const start = await execPowerShell(['-File', BRIDGE_CONTROL, 'start'], 60000);
      actions.push({ step: 'start_bridge', ok: start.code === 0, message: start.stdout || start.stderr || '已尝试启动 bridge。' });
    } catch (err) {
      actions.push({ step: 'start_bridge', ok: false, message: err instanceof Error ? err.message : String(err) });
    }
  } else if (!config.exists) {
    actions.push({ step: 'start_bridge', ok: false, message: '未找到 config.env，跳过自动启动。' });
  }
  const doctor = await runDoctor(60);
  const refreshedStatus = await getBridgeRuntimeStatus();
  return { ok: actions.every((item) => item.ok !== false) && doctor.summary.miss === 0, message: actions.length ? '已完成一键诊断修复。' : '未发现需要自动修复的问题。', actions, doctor, status: refreshedStatus };
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function buildAuditCsv(items) {
  const headers = ['createdAt', 'direction', 'channelType', 'chatId', 'bindingKey', 'sessionId', 'summary'];
  const rows = [headers.join(',')];
  for (const item of items) rows.push(headers.map((header) => csvEscape(header === 'summary' ? parseSummary(item) : item[header])).join(','));
  return rows.join('\r\n');
}

function serveStatic(req, res) {
  let requestPath = req.url === '/' ? '/index.html' : req.url;
  requestPath = requestPath.split('?')[0];
  const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);
  if (!filePath.startsWith(PUBLIC_DIR)) return sendBuffer(res, 403, 'Forbidden');
  fs.readFile(filePath, (err, data) => {
    if (err) return sendBuffer(res, 404, 'Not found');
    const ext = path.extname(filePath);
    const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8' };
    sendBuffer(res, 200, data, types[ext] || 'application/octet-stream');
  });
}

async function handleLogStream(req, res) {
  const host = req.headers.host || `127.0.0.1:${PORT}`;
  const url = new URL(req.url, `http://${host}`);
  const tail = Number(url.searchParams.get('tail') || '80');
  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' });
  let lastPayload = '';
  const sendSnapshot = async () => {
    const lines = await tailFile(LOG_PATH, tail);
    const payload = JSON.stringify({ lines, updatedAt: new Date().toISOString() });
    if (payload !== lastPayload) { res.write(`data: ${payload}\n\n`); lastPayload = payload; }
    else res.write(`event: ping\ndata: ${Date.now()}\n\n`);
  };
  await sendSnapshot();
  const timer = setInterval(() => sendSnapshot().catch((err) => res.write(`event: error\ndata: ${JSON.stringify({ message: err instanceof Error ? err.message : String(err) })}\n\n`)), 3000);
  req.on('close', () => { clearInterval(timer); res.end(); });
}

const server = http.createServer(async (req, res) => {
  try {
    if (!req.url) return sendBuffer(res, 400, 'Bad request');
    const host = req.headers.host || `127.0.0.1:${PORT}`;
    const url = new URL(req.url, `http://${host}`);

    if (req.method === 'GET' && url.pathname === '/api/bridge/status') return sendJson(res, 200, await getBridgeRuntimeStatus());
    if (req.method === 'GET' && url.pathname === '/api/bridge/config') return sendJson(res, 200, await readConfig(false));
    if (req.method === 'GET' && url.pathname === '/api/bridge/logs/stream') return handleLogStream(req, res);
    if (req.method === 'GET' && url.pathname === '/api/bridge/logs') return sendJson(res, 200, { lines: await tailFile(LOG_PATH, Number(url.searchParams.get('tail') || '80')) });
    if (req.method === 'GET' && url.pathname === '/api/bridge/bindings') return sendJson(res, 200, { items: await getBindings() });
    if (req.method === 'GET' && url.pathname === '/api/bridge/audit/export') {
      const items = await getAudit(Number(url.searchParams.get('limit') || '200'), { q: url.searchParams.get('q') || '', direction: url.searchParams.get('direction') || 'all', channelType: url.searchParams.get('channelType') || 'all' });
      const format = String(url.searchParams.get('format') || 'json').toLowerCase();
      const stamp = new Date().toISOString().replaceAll(':', '-');
      if (format === 'csv') return sendBuffer(res, 200, buildAuditCsv(items), 'text/csv; charset=utf-8', { 'Content-Disposition': `attachment; filename="audit-${stamp}.csv"` });
      return sendBuffer(res, 200, JSON.stringify(items, null, 2), 'application/json; charset=utf-8', { 'Content-Disposition': `attachment; filename="audit-${stamp}.json"` });
    }
    if (req.method === 'GET' && url.pathname === '/api/bridge/audit') return sendJson(res, 200, { items: await getAudit(Number(url.searchParams.get('limit') || '50'), { q: url.searchParams.get('q') || '', direction: url.searchParams.get('direction') || 'all', channelType: url.searchParams.get('channelType') || 'all' }) });
    if (req.method === 'GET' && url.pathname === '/api/bridge/doctor') return sendJson(res, 200, await runDoctor(Number(url.searchParams.get('lines') || '80')));
    if (req.method === 'GET' && url.pathname === '/api/bridge/conversations') return sendJson(res, 200, { items: await listConversations(url.searchParams.get('pid') || '', { q: url.searchParams.get('q') || '', active: url.searchParams.get('active') || 'all', channelType: url.searchParams.get('channelType') || 'all' }) });
    if (req.method === 'GET' && url.pathname === '/api/bridge/messages') return sendJson(res, 200, await getConversationDetail(url.searchParams.get('sessionId') || '', { threadKey: url.searchParams.get('threadKey') || '', limit: Number(url.searchParams.get('limit') || '200'), q: url.searchParams.get('q') || '', role: url.searchParams.get('role') || 'all' }));

    if (req.method === 'POST' && url.pathname === '/api/bridge/config') { await writeConfig(JSON.parse((await readBody(req)) || '{}')); return sendJson(res, 200, { ok: true }); }
    if (req.method === 'POST' && url.pathname === '/api/bridge/start') { const result = await execPowerShell(['-File', BRIDGE_CONTROL, 'start'], 60000); return sendJson(res, 200, { ok: result.code === 0, stdout: result.stdout, stderr: result.stderr }); }
    if (req.method === 'POST' && url.pathname === '/api/bridge/stop') { const result = await execPowerShell(['-File', BRIDGE_CONTROL, 'stop'], 60000); return sendJson(res, 200, { ok: result.code === 0, stdout: result.stdout, stderr: result.stderr }); }
    if (req.method === 'POST' && url.pathname === '/api/bridge/restart') { const stop = await execPowerShell(['-File', BRIDGE_CONTROL, 'stop'], 60000); const start = await execPowerShell(['-File', BRIDGE_CONTROL, 'start'], 60000); return sendJson(res, 200, { ok: start.code === 0, stop, start }); }
    if (req.method === 'POST' && url.pathname === '/api/bridge/repair-pid') return sendJson(res, 200, await repairStalePid());
    if (req.method === 'POST' && url.pathname === '/api/bridge/repair') return sendJson(res, 200, await runAutoRepair());
    if (req.method === 'POST' && url.pathname === '/api/bridge/bindings/toggle') { const payload = JSON.parse((await readBody(req)) || '{}'); return sendJson(res, 200, await toggleBindingActive(payload.bindingKey, payload.active)); }
    if (req.method === 'POST' && url.pathname === '/api/bridge/test/telegram') return sendJson(res, 200, await testTelegramConnection(await readConfig(true), JSON.parse((await readBody(req)) || '{}')));
    if (req.method === 'POST' && url.pathname === '/api/bridge/test/feishu') return sendJson(res, 200, await testFeishuConnection(await readConfig(true), JSON.parse((await readBody(req)) || '{}')));
    if (req.method === 'POST' && url.pathname === '/api/bridge/test/discord') return sendJson(res, 200, await testDiscordConnection(await readConfig(true), JSON.parse((await readBody(req)) || '{}')));
    if (req.method === 'POST' && url.pathname === '/api/bridge/test/qq') return sendJson(res, 200, await testQqConnection(await readConfig(true), JSON.parse((await readBody(req)) || '{}')));

    return serveStatic(req, res);
  } catch (err) {
    return sendJson(res, 500, { ok: false, message: err instanceof Error ? err.message : String(err) });
  }
});

server.listen(PORT, () => {
  console.log(`[ui-console] http://127.0.0.1:${PORT}`);
});
