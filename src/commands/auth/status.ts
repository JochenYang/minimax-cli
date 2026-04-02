import { defineCommand } from '../../command';
import { resolveCredential } from '../../auth/resolver';
import { loadCredentials } from '../../auth/credentials';
import { formatOutput, detectOutputFormat } from '../../output/formatter';
import { requestJson } from '../../client/http';
import { quotaEndpoint } from '../../client/endpoints';
import type { Config } from '../../config/schema';
import type { GlobalFlags } from '../../types/flags';
import type { QuotaResponse } from '../../types/api';

export default defineCommand({
  name: 'auth status',
  description: 'Show current authentication state and quota snapshot',
  usage: 'minimax auth status',
  examples: [
    'minimax auth status',
    'minimax auth status --output json',
  ],
  async run(config: Config, _flags: GlobalFlags) {
    try {
      const credential = await resolveCredential(config);
      const format = detectOutputFormat(config.output);

      if (format !== 'text') {
        const result: Record<string, unknown> = {
          method: credential.method,
          source: credential.source,
        };
        if (credential.method === 'oauth') {
          const creds = await loadCredentials();
          if (creds) {
            result.token_expires = creds.expires_at;
            if (creds.account) result.account = creds.account;
          }
        } else {
          result.key = credential.token.slice(0, 6) + '...' + credential.token.slice(-4);
        }
        console.log(formatOutput(result, format));
        return;
      }

      // Text format — rich output
      console.log('Authentication Status:');
      console.log(`  Method: ${credential.method}`);
      console.log(`  Source: ${credential.source}`);

      const token = credential.token;
      const maskedToken = token.length > 8 ? `${token.slice(0, 4)}...${token.slice(-4)}` : '***';
      console.log(`  Key:    ${maskedToken}`);

      if (credential.method === 'oauth') {
        const creds = await loadCredentials();
        if (creds) {
          if (creds.account) console.log(`  Account: ${creds.account}`);
          const expiresAt = new Date(creds.expires_at);
          const minutesLeft = Math.round((expiresAt.getTime() - Date.now()) / 60000);
          console.log(`  Expires in: ${minutesLeft} minutes`);
        }
      }

      // Fetch quota snapshot
      console.log('');
      process.stderr.write('Fetching quota snapshot...\n');
      try {
        const url = quotaEndpoint(config.baseUrl);
        const quota = await requestJson<QuotaResponse>(config, { url, method: 'GET' });
        const models = quota.model_remains || [];
        if (models.length > 0) {
          console.log('Available Quotas:');
          for (const m of models.slice(0, 5)) {
            const remaining = m.current_interval_total_count - m.current_interval_usage_count;
            const pct = m.current_interval_total_count > 0
              ? Math.round((remaining / m.current_interval_total_count) * 100)
              : 0;
            console.log(`  ${m.model_name.padEnd(24)} ${String(remaining).padStart(6)} / ${m.current_interval_total_count}  (${pct}%)`);
          }
          if (models.length > 5) {
            console.log(`  ... and ${models.length - 5} more (run 'minimax quota show' for full details)`);
          }
        } else {
          console.log('  No quota data available.');
        }
      } catch (e) {
        console.log(`  Quota fetch failed: ${(e as Error).message}`);
      }
      console.log('');
      console.log("Run 'minimax quota show' for full details.");

    } catch {
      const format = detectOutputFormat(config.output);
      const result = {
        authenticated: false,
        message: 'Not authenticated.',
        hint: 'Run: minimax auth login\nOr set $MINIMAX_API_KEY',
      };
      console.log(formatOutput(result, format));
    }
  },
});
