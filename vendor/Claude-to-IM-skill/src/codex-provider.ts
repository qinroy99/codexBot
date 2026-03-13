/**
 * Codex Provider 闂?LLMProvider implementation backed by @openai/codex-sdk.
 *
 * Maps Codex SDK thread events to the SSE stream format consumed by
 * the bridge conversation engine, making Codex a drop-in alternative
 * to the Claude Code SDK backend.
 *
 * Requires `@openai/codex-sdk` to be installed (optionalDependency).
 * The provider lazily imports the SDK at first use and throws a clear
 * error if it is not available.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { LLMProvider, StreamChatParams } from 'claude-to-im/src/lib/bridge/host.js';
import type { PendingPermissions } from './permission-gateway.js';
import { sseEvent } from './sse-utils.js';

/** MIME 闂?file extension for temp image files. */
const MIME_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

// All SDK types kept as `any` because @openai/codex-sdk is optional.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CodexModule = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CodexInstance = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ThreadInstance = any;

/**
 * Map bridge permission modes to Codex approval policies.
 * - 'acceptEdits' (code mode) 闂?'on-failure' (auto-approve most things)
 * - 'plan' 闂?'on-request' (ask before executing)
 * - 'default' (ask mode) 闂?'on-request'
 */
function toApprovalPolicy(permissionMode?: string): string {
  switch (permissionMode) {
    case 'acceptEdits': return 'on-failure';
    case 'plan': return 'on-request';
    case 'default': return 'on-request';
    default: return 'on-request';
  }
}

/** Whether to forward bridge model to Codex CLI. Default: false (use Codex current/default model). */
function shouldPassModelToCodex(): boolean {
  return process.env.CTI_CODEX_PASS_MODEL === 'true';
}

function looksLikeClaudeModel(model?: string): boolean {
  return !!model && /^claude[-_]/i.test(model);
}

function shouldRetryFreshThread(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('resuming session with different model') ||
    lower.includes('no such session') ||
    (lower.includes('resume') && lower.includes('session'))
  );
}

function shouldRetryTimeout(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('codex backend timeout exceeded') ||
    lower.includes('responses_websocket') ||
    lower.includes('failed to connect to websocket') ||
    lower.includes('stream disconnected') ||
    lower.includes('os error 10060')
  );
}

function loadProxyEnvFromConfigFile(): Record<string, string> {
  const proxyEnv: Record<string, string> = {};
  const configPath = path.join(process.env.CTI_HOME || path.join(os.homedir(), '.claude-to-im'), 'config.env');

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (key === 'HTTP_PROXY' || key === 'HTTPS_PROXY' || key === 'ALL_PROXY' || key === 'NO_PROXY') {
        proxyEnv[key] = value;
      }
    }
  } catch {
    // ignore missing config
  }

  return proxyEnv;
}

function looksLikeLightweightPrompt(prompt: string): boolean {
  const trimmed = prompt.trim();
  if (!trimmed || trimmed.length > 80 || trimmed.includes('\n')) {
    return false;
  }

  const lower = trimmed.toLowerCase();
  const taskHints = [
    'cmd', 'command', 'shell', 'bash', 'powershell', 'terminal', 'run ',
    'git ', 'ls', 'dir', 'pwd', 'npm', 'node', 'python',
    '\u6267\u884c', '\u8fd0\u884c', '\u547d\u4ee4', '\u811a\u672c', '\u4ee3\u7801', '\u6587\u4ef6', '\u76ee\u5f55', '\u5217\u51fa', '\u67e5\u770b', '\u7f16\u8f91', '\u4fee\u6539', '\u521b\u5efa', '\u5199\u5165'
  ];

  return !taskHints.some(hint => lower.includes(hint));
}

function shouldUseFastFirstTurn(params: StreamChatParams, savedThreadId?: string): boolean {
  const hasImages = !!params.files?.some(file => file.type.startsWith('image/'));
  return !savedThreadId && !hasImages && looksLikeLightweightPrompt(params.prompt);
}

function buildStyledPrompt(prompt: string): string {
  return [
    '请默认使用简洁中文回复。',
    '先给结论，再补充必要信息。',
    '如果适合列表，使用简短扁平条目，不要长段铺垫。',
    '不要先说“我先看看/我先检查/我先用某个 skill”，除非用户明确要求展示过程。',
    '当用户在问推荐、是否需要、缺什么、怎么选时，优先直接回答“要/不要/缺/不缺”以及最小必要建议。',
    '',
    '用户消息：',
    prompt,
  ].join('\\n');
}

function stripCodexExecNoise(message: string): string {
  return message
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line
      && !line.includes('Failed to create shell snapshot for powershell')
      && line !== 'Reading prompt from stdin...'
      && !/^\d{4}-\d{2}-\d{2}T.*\sWARN\s/.test(line)
      && !line.startsWith('Codex Exec exited with code 1:'))
    .join('\\n')
    .trim();
}

function extractRetryTime(message: string): string | undefined {
  const match = message.match(/try again at ([^.]+)\./i);
  return match?.[1]?.trim();
}

function toUserFacingError(message: string): string {
  const normalized = stripCodexExecNoise(message) || message;
  const lower = normalized.toLowerCase();

  if (lower.includes('codex backend timeout exceeded') || lower.includes('responses_websocket') || lower.includes('wss://chatgpt.com/backend-api/codex/responses') || lower.includes('os error 10060') || lower.includes('failed to connect to websocket') || lower.includes('stream disconnected')) {
    return '\u0043odex \u540e\u7aef\u7f51\u7edc\u8fde\u63a5\u8d85\u65f6\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002';
  }

  if (lower.includes('not inside a trusted directory')) {
    return '\u5f53\u524d\u76ee\u5f55\u4fe1\u4efb\u6821\u9a8c\u5931\u8d25\uff0c\u6211\u5df2\u8bb0\u5f55\u95ee\u9898\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002';
  }

  if (lower.includes("you've hit your usage limit") || lower.includes('hit your usage limit') || lower.includes('send a request to your admin')) {
    const retryAt = extractRetryTime(normalized);
    return retryAt
      ? '\u0043odex \u5f53\u524d\u989d\u5ea6\u5df2\u7528\u5c3d\uff0c\u8bf7\u5728 2026-03-11 ' + retryAt + ' \u540e\u91cd\u8bd5\uff0c\u6216\u8054\u7cfb\u7ba1\u7406\u5458\u63d0\u5347\u989d\u5ea6\u3002'
      : '\u0043odex \u5f53\u524d\u989d\u5ea6\u5df2\u7528\u5c3d\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u6216\u8054\u7cfb\u7ba1\u7406\u5458\u63d0\u5347\u989d\u5ea6\u3002';
  }

  return normalized || message;
}

export class CodexProvider implements LLMProvider {
  private sdk: CodexModule | null = null;
  private codex: CodexInstance | null = null;

  /** Maps session IDs to Codex thread IDs for resume. */
  private threadIds = new Map<string, string>();

  constructor(private pendingPerms: PendingPermissions) {}

  /**
   * Lazily load the Codex SDK. Throws a clear error if not installed.
   */
  private async ensureSDK(): Promise<{ sdk: CodexModule; codex: CodexInstance }> {
    if (this.sdk && this.codex) {
      return { sdk: this.sdk, codex: this.codex };
    }

    try {
      this.sdk = await (Function('return import("@openai/codex-sdk")')() as Promise<CodexModule>);
    } catch {
      throw new Error(
        '[CodexProvider] @openai/codex-sdk is not installed. ' +
        'Install it with: npm install @openai/codex-sdk'
      );
    }

    // Resolve API key: CTI_CODEX_API_KEY > CODEX_API_KEY > OPENAI_API_KEY > (login auth)
    const apiKey = process.env.CTI_CODEX_API_KEY
      || process.env.CODEX_API_KEY
      || process.env.OPENAI_API_KEY
      || undefined;
    const baseUrl = process.env.CTI_CODEX_BASE_URL || undefined;

    const proxyEnv = {
      ...Object.fromEntries(
        Object.entries(process.env).filter(([, value]) => value !== undefined) as Array<[string, string]>
      ),
      ...loadProxyEnvFromConfigFile(),
    };

    const CodexClass = this.sdk.Codex;
    this.codex = new CodexClass({
      ...(apiKey ? { apiKey } : {}),
      ...(baseUrl ? { baseUrl } : {}),
      ...(Object.keys(proxyEnv).length > 0 ? { env: proxyEnv } : {}),
    });

    return { sdk: this.sdk, codex: this.codex };
  }

  streamChat(params: StreamChatParams): ReadableStream<string> {
    const self = this;

    return new ReadableStream<string>({
      start(controller) {
        (async () => {
          let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
          let upstreamAbortSignal: AbortSignal | undefined;
          let abortFromUpstream: (() => void) | undefined;
          let runAbortController: AbortController | undefined;
          let fastFailTimeoutMs = 90000;
          const tempFiles: string[] = [];
          try {
            const { codex } = await self.ensureSDK();

            // Resolve or create thread
            let savedThreadId = params.sdkSessionId
              ? self.threadIds.get(params.sessionId) || params.sdkSessionId
              : undefined;

            // Cross-runtime migration safety:
            // when a persisted Claude-model session leaks into Codex runtime,
            // resuming it can fail immediately with model/session mismatch.
            if (savedThreadId && looksLikeClaudeModel(params.model)) {
              console.warn('[codex-provider] Ignoring stale Claude-like sdkSessionId in Codex runtime; starting fresh thread');
              savedThreadId = undefined;
            }

            const approvalPolicy = toApprovalPolicy(params.permissionMode);
            const passModel = shouldPassModelToCodex();
            const fastFirstTurn = shouldUseFastFirstTurn(params, savedThreadId);
            fastFailTimeoutMs = fastFirstTurn ? 60000 : 90000;
            runAbortController = new AbortController();
            upstreamAbortSignal = params.abortController?.signal;
            abortFromUpstream = () => runAbortController?.abort();
            timeoutHandle = setTimeout(() => {
              if (!runAbortController?.signal.aborted) {
                runAbortController.abort(new Error(`Codex backend timeout exceeded after ${fastFailTimeoutMs / 1000} seconds`));
              }
            }, fastFailTimeoutMs);

            if (upstreamAbortSignal) {
              if (upstreamAbortSignal.aborted) {
                runAbortController.abort();
              } else {
                upstreamAbortSignal.addEventListener('abort', abortFromUpstream, { once: true });
              }
            }

            const threadOptions: Record<string, unknown> = {
              ...(passModel && params.model ? { model: params.model } : {}),
              ...(!fastFirstTurn && params.workingDirectory ? { workingDirectory: params.workingDirectory } : {}),
              ...(fastFirstTurn ? {
                sandboxMode: 'read-only',
                // Keep the first turn lightweight without using unsupported minimal effort.
                modelReasoningEffort: 'low',
                // Disable web_search so lightweight greetings do not pull extra tools.
                webSearchMode: 'disabled',
              } : {}),
              skipGitRepoCheck: true,
              approvalPolicy,
            };

            // Build input: Codex SDK UserInput supports { type: "text" } and
            // { type: "local_image", path: string }. We write base64 data to
            // temp files so the SDK can read them as local images.
            const imageFiles = params.files?.filter(
              f => f.type.startsWith('image/')
            ) ?? [];

            let input: string | Array<Record<string, string>>;
            if (imageFiles.length > 0) {
              const parts: Array<Record<string, string>> = [
                { type: 'text', text: buildStyledPrompt(params.prompt) },
              ];
              for (const file of imageFiles) {
                const ext = MIME_EXT[file.type] || '.png';
                const tmpPath = path.join(os.tmpdir(), `cti-img-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
                fs.writeFileSync(tmpPath, Buffer.from(file.data, 'base64'));
                tempFiles.push(tmpPath);
                parts.push({ type: 'local_image', path: tmpPath });
              }
              input = parts;
            } else {
              input = buildStyledPrompt(params.prompt);
            }

            let retryFresh = false;
            let retryTimeout = false;

            while (true) {
              let thread: ThreadInstance;
              if (savedThreadId) {
                try {
                  thread = codex.resumeThread(savedThreadId, threadOptions);
                } catch {
                  thread = codex.startThread(threadOptions);
                }
              } else {
                thread = codex.startThread(threadOptions);
              }

              let sawAnyEvent = false;
              try {
                const { events } = await thread.runStreamed(input, { signal: runAbortController!.signal });

                for await (const event of events) {
                  sawAnyEvent = true;
                  if (params.abortController?.signal.aborted) {
                    break;
                  }

                  switch (event.type) {
                    case 'thread.started': {
                      const threadId = event.thread_id as string;
                      self.threadIds.set(params.sessionId, threadId);

                      controller.enqueue(sseEvent('status', {
                        session_id: threadId,
                      }));
                      break;
                    }

                    case 'item.completed': {
                      const item = event.item as Record<string, unknown>;
                      self.handleCompletedItem(controller, item);
                      break;
                    }

                    case 'turn.completed': {
                      const usage = event.usage as Record<string, unknown> | undefined;
                      const threadId = self.threadIds.get(params.sessionId);

                      controller.enqueue(sseEvent('result', {
                        usage: usage ? {
                          input_tokens: usage.input_tokens ?? 0,
                          output_tokens: usage.output_tokens ?? 0,
                          cache_read_input_tokens: usage.cached_input_tokens ?? 0,
                        } : undefined,
                        ...(threadId ? { session_id: threadId } : {}),
                      }));
                      break;
                    }

                    case 'turn.failed': {
                      const error = (event as { message?: string }).message;
                      controller.enqueue(sseEvent('error', error || 'Turn failed'));
                      break;
                    }

                    case 'error': {
                      const error = (event as { message?: string }).message;
                      controller.enqueue(sseEvent('error', error || 'Thread error'));
                      break;
                    }

                    // item.started, item.updated, turn.started 闂?no action needed
                  }
                }
                break;
              } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                if (runAbortController?.signal.aborted && !upstreamAbortSignal?.aborted) {
                  throw new Error(`Codex backend timeout exceeded after ${fastFailTimeoutMs / 1000} seconds`);
                }
                if (!retryTimeout && shouldRetryTimeout(message)) {
                  console.warn('[codex-provider] Timeout/network failure, retrying once with a fresh thread:', message);
                  retryTimeout = true;
                  savedThreadId = undefined;
                  if (timeoutHandle) {
                    clearTimeout(timeoutHandle);
                  }
                  runAbortController = new AbortController();
                  if (upstreamAbortSignal) {
                    if (upstreamAbortSignal.aborted) {
                      runAbortController.abort();
                    } else {
                      if (abortFromUpstream) {
                        upstreamAbortSignal.removeEventListener('abort', abortFromUpstream);
                      }
                      abortFromUpstream = () => runAbortController?.abort();
                      upstreamAbortSignal.addEventListener('abort', abortFromUpstream, { once: true });
                    }
                  }
                  timeoutHandle = setTimeout(() => {
                    if (!runAbortController?.signal.aborted) {
                      runAbortController.abort(new Error(`Codex backend timeout exceeded after ${fastFailTimeoutMs / 1000} seconds`));
                    }
                  }, fastFailTimeoutMs);
                  continue;
                }
                if (savedThreadId && !retryFresh && !sawAnyEvent && shouldRetryFreshThread(message)) {
                  console.warn('[codex-provider] Resume failed, retrying with a fresh thread:', message);
                  savedThreadId = undefined;
                  retryFresh = true;
                  continue;
                }
                throw err;
              }
            }

            controller.close();
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error('[codex-provider] Error:', err instanceof Error ? err.stack || err.message : err);
            try {
              controller.enqueue(sseEvent('error', toUserFacingError(message)));
              controller.close();
            } catch {
              // Controller already closed
            }
          } finally {
            if (timeoutHandle) {
              clearTimeout(timeoutHandle);
            }
            if (upstreamAbortSignal) {
              if (abortFromUpstream) {
                upstreamAbortSignal.removeEventListener('abort', abortFromUpstream);
              }
            }
            for (const tmp of tempFiles) {
              try { fs.unlinkSync(tmp); } catch { /* ignore */ }
            }
          }
        })();
      },
    });
  }

  /**
   * Map a completed Codex item to SSE events.
   */
  private handleCompletedItem(
    controller: ReadableStreamDefaultController<string>,
    item: Record<string, unknown>,
  ): void {
    const itemType = item.type as string;

    switch (itemType) {
      case 'agent_message': {
        const text = (item.text as string) || '';
        if (text) {
          controller.enqueue(sseEvent('text', text));
        }
        break;
      }

      case 'command_execution': {
        const toolId = (item.id as string) || `tool-${Date.now()}`;
        const command = item.command as string || '';
        const output = item.aggregated_output as string || '';
        const exitCode = item.exit_code as number | undefined;
        const isError = exitCode != null && exitCode !== 0;

        controller.enqueue(sseEvent('tool_use', {
          id: toolId,
          name: 'Bash',
          input: { command },
        }));

        const resultContent = output || (isError ? `Exit code: ${exitCode}` : 'Done');
        controller.enqueue(sseEvent('tool_result', {
          tool_use_id: toolId,
          content: resultContent,
          is_error: isError,
        }));
        break;
      }

      case 'file_change': {
        const toolId = (item.id as string) || `tool-${Date.now()}`;
        const changes = item.changes as Array<{ path: string; kind: string }> || [];
        const summary = changes.map(c => `${c.kind}: ${c.path}`).join('\n');

        controller.enqueue(sseEvent('tool_use', {
          id: toolId,
          name: 'Edit',
          input: { files: changes },
        }));

        controller.enqueue(sseEvent('tool_result', {
          tool_use_id: toolId,
          content: summary || 'File changes applied',
          is_error: false,
        }));
        break;
      }

      case 'mcp_tool_call': {
        const toolId = (item.id as string) || `tool-${Date.now()}`;
        const server = item.server as string || '';
        const tool = item.tool as string || '';
        const args = item.arguments as unknown;
        const result = item.result as { content?: unknown; structured_content?: unknown } | undefined;
        const error = item.error as { message?: string } | undefined;

        const resultContent = result?.content ?? result?.structured_content;
        const resultText = typeof resultContent === 'string' ? resultContent : (resultContent ? JSON.stringify(resultContent) : undefined);

        controller.enqueue(sseEvent('tool_use', {
          id: toolId,
          name: `mcp__${server}__${tool}`,
          input: args,
        }));

        controller.enqueue(sseEvent('tool_result', {
          tool_use_id: toolId,
          content: error?.message || resultText || 'Done',
          is_error: !!error,
        }));
        break;
      }

      case 'reasoning': {
        // Reasoning is internal; emit as status
        const text = (item.text as string) || '';
        if (text) {
          controller.enqueue(sseEvent('status', { reasoning: text }));
        }
        break;
      }
    }
  }
}






