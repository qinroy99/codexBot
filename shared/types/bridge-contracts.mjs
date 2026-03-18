export const THREAD_PANEL_DEFAULT_LIMIT = 120;
export const THREAD_PANEL_MAX_LIMIT = 300;

export const THREAD_PANEL_ROUTES = Object.freeze({
  bootstrap: '/api/bridge/thread-panel/bootstrap',
  thread: '/api/bridge/thread-panel/thread',
  app: '/im-side-panel/',
});

export function clampThreadPanelLimit(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return THREAD_PANEL_DEFAULT_LIMIT;
  return Math.max(1, Math.min(THREAD_PANEL_MAX_LIMIT, Math.round(numeric)));
}

/**
 * @typedef {Object} ThreadPanelFilters
 * @property {string} pid
 * @property {string} q
 * @property {'all'|'active'|'inactive'} active
 * @property {'all'|'qq'|'telegram'|'feishu'|'discord'} channelType
 * @property {'all'|'user'|'assistant'|'system'} role
 * @property {number} limit
 */

/**
 * @typedef {Object} ThreadPanelThreadItem
 * @property {string} sessionId
 * @property {string} bindingKey
 * @property {string} threadKey
 * @property {string} channelType
 * @property {string} chatId
 * @property {boolean} active
 * @property {string} updatedAt
 * @property {string} title
 * @property {string} summary
 * @property {string} freshness
 */

/**
 * @typedef {Object} ThreadPanelMessage
 * @property {string} role
 * @property {string} content
 * @property {string} createdAt
 */

/**
 * @typedef {Object} ThreadPanelThreadDetail
 * @property {string} sessionId
 * @property {string} title
 * @property {string} subtitle
 * @property {string} bindingKey
 * @property {string} threadKey
 * @property {ThreadPanelMessage[]} messages
 */
