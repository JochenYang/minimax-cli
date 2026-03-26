import type { Config } from '../config/schema';
import type { ApiErrorBody } from '../errors/api';
import { resolveCredential } from '../auth/resolver';
import { mapApiError } from '../errors/api';
import { CLIError } from '../errors/base';
import { ExitCode } from '../errors/codes';

export interface RequestOpts {
  url: string;
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
  stream?: boolean;
  noAuth?: boolean;
  authStyle?: 'bearer' | 'x-api-key';
}

export async function request(
  config: Config,
  opts: RequestOpts,
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'minimax-cli/0.1.0',
    ...opts.headers,
  };

  if (!opts.noAuth) {
    const credential = await resolveCredential(config);
    if (opts.authStyle === 'x-api-key') {
      headers['x-api-key'] = credential.token;
    } else {
      headers['Authorization'] = `Bearer ${credential.token}`;
    }

    if (config.verbose) {
      process.stderr.write(`> ${opts.method || 'GET'} ${opts.url}\n`);
      process.stderr.write(`> Auth: ${credential.token.slice(0, 8)}...\n`);
    }
  }

  const timeoutMs = (opts.timeout || config.timeout) * 1000;

  const res = await fetch(opts.url, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (config.verbose) {
    process.stderr.write(`< ${res.status} ${res.statusText}\n`);
  }

  if (!res.ok) {
    let body: ApiErrorBody = {};
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      // Response body is not JSON
    }
    throw mapApiError(res.status, body, opts.url);
  }

  return res;
}

export async function requestJson<T>(config: Config, opts: RequestOpts): Promise<T> {
  const res = await request(config, opts);
  const data = (await res.json()) as T & { base_resp?: { status_code?: number; status_msg?: string } };

  // MiniMax APIs return HTTP 200 with error details in base_resp
  if (data.base_resp && data.base_resp.status_code && data.base_resp.status_code !== 0) {
    throw mapApiError(200, { base_resp: data.base_resp }, opts.url);
  }

  return data;
}
