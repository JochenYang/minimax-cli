import type { GlobalFlags } from './types/flags';

export interface ParsedArgs {
  commandPath: string[];
  flags: GlobalFlags;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const commandPath: string[] = [];
  const flags: GlobalFlags = {
    quiet: false,
    verbose: false,
    noColor: false,
    yes: false,
    dryRun: false,
    help: false,
    nonInteractive: false,
    async: false,
  };

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i]!;

    if (arg === '--help' || arg === '-h') {
      flags.help = true;
      i++;
      continue;
    }

    if (arg === '--') {
      i++;
      break;
    }

    if (arg.startsWith('--')) {
      const eqIndex = arg.indexOf('=');
      let key: string;
      let value: string | undefined;

      if (eqIndex !== -1) {
        key = arg.slice(2, eqIndex);
        value = arg.slice(eqIndex + 1);
      } else {
        key = arg.slice(2);
      }

      const camelKey = kebabToCamel(key);

      // Boolean flags
      if (['quiet', 'verbose', 'noColor', 'yes', 'dryRun', 'help', 'stream',
           'subtitles', 'wait', 'noWait', 'noBrowser',
           'nonInteractive', 'async'].includes(camelKey)) {
        (flags as Record<string, unknown>)[camelKey] = true;
        i++;
        continue;
      }

      // Value flags
      if (value === undefined) {
        i++;
        value = argv[i];
      }

      if (value === undefined) {
        throw new Error(`Flag --${key} requires a value.`);
      }

      // Repeatable flags
      if (['message', 'tool', 'pronunciation'].includes(camelKey)) {
        const arr = (flags as Record<string, unknown>)[camelKey] as string[] | undefined;
        if (arr) {
          arr.push(value);
        } else {
          (flags as Record<string, unknown>)[camelKey] = [value];
        }
      } else if (['maxTokens', 'temperature', 'topP', 'speed', 'volume',
                   'pitch', 'sampleRate', 'bitrate', 'channels', 'n',
                   'timeout', 'pollInterval'].includes(camelKey)) {
        (flags as Record<string, unknown>)[camelKey] = Number(value);
      } else {
        (flags as Record<string, unknown>)[camelKey] = value;
      }
      i++;
      continue;
    }

    // Positional argument — part of command path
    commandPath.push(arg);
    i++;
  }

  return { commandPath, flags };
}

function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}
