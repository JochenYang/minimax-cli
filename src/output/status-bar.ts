import type { Config } from '../config/schema';

let printed = false;

const reset    = '\x1b[0m';
const dim      = '\x1b[2m';
const bold     = '\x1b[1m';
const mmBlue   = '\x1b[38;2;43;82;255m';
const mmPurple = '\x1b[38;2;147;51;234m';
const mmCyan   = '\x1b[38;2;6;184;212m';
const mmPink   = '\x1b[38;2;236;72;153m';

export function maybeShowStatusBar(config: Config, token: string, model?: string): void {
  if (config.quiet || printed || !process.stderr.isTTY) return;
  printed = true;

  const region    = config.baseUrl.includes('minimaxi.com') ? 'CN' : 'Global';
  const maskedKey = token.length > 8 ? `${token.slice(0, 4)}...${token.slice(-4)}` : '***';
  const modelStr  = model ? ` ${dim}|${reset} ${dim}Model:${reset} ${mmPurple}${model}${reset}` : '';

  process.stderr.write(
    `${bold}${mmBlue}MINIMAX${reset} ` +
    `${dim}Region:${reset} ${mmCyan}${region}${reset} ` +
    `${dim}|${reset} ` +
    `${dim}Key:${reset} ${mmPink}${maskedKey}${reset}` +
    `${modelStr}\n`,
  );
}
