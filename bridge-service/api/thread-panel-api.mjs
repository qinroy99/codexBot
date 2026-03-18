import { buildThreadPanelBootstrap, buildThreadPanelThread, readThreadPanelRequest } from './thread-side-panel.mjs';

export function createThreadPanelApi(deps) {
  const { getStatus, listConversations, getConversationDetail } = deps || {};

  if (typeof getStatus !== 'function') throw new TypeError('getStatus must be a function');
  if (typeof listConversations !== 'function') throw new TypeError('listConversations must be a function');
  if (typeof getConversationDetail !== 'function') throw new TypeError('getConversationDetail must be a function');

  return {
    async getBootstrap(searchParams) {
      const request = readThreadPanelRequest(searchParams);
      const [status, threads] = await Promise.all([
        getStatus(),
        listConversations(request.pid, {
          q: request.q,
          active: request.active,
          channelType: request.channelType,
        }),
      ]);

      const activeThread = request.threadKey || request.sessionId
        ? await getConversationDetail(request.sessionId, {
            threadKey: request.threadKey,
            limit: request.limit,
            q: request.q,
            role: request.role,
          })
        : null;

      return buildThreadPanelBootstrap({ status, threads, activeThread, request });
    },

    async getThread(searchParams) {
      const request = readThreadPanelRequest(searchParams);
      const detail = await getConversationDetail(request.sessionId, {
        threadKey: request.threadKey,
        limit: request.limit,
        q: request.q,
        role: request.role,
      });
      return buildThreadPanelThread(detail);
    },
  };
}