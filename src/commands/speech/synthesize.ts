import { defineCommand } from '../../command';
import { CLIError } from '../../errors/base';
import { ExitCode } from '../../errors/codes';
import { request, requestJson } from '../../client/http';
import { speechEndpoint } from '../../client/endpoints';
import { formatOutput, detectOutputFormat } from '../../output/formatter';
import type { Config } from '../../config/schema';
import type { GlobalFlags } from '../../types/flags';
import type { SpeechRequest, SpeechResponse } from '../../types/api';
import { readFileSync, writeFileSync } from 'fs';

export default defineCommand({
  name: 'speech synthesize',
  description: 'Synchronous TTS, up to 10k chars (speech-2.8-hd / 2.6 / 02)',
  usage: 'minimax speech synthesize --text <text> [--out <path>] [flags]',
  options: [
    { flag: '--model <model>', description: 'Model ID (default: speech-2.8-hd)' },
    { flag: '--text <text>', description: 'Text to synthesize' },
    { flag: '--text-file <path>', description: 'Read text from file (use - for stdin)' },
    { flag: '--voice <id>', description: 'Voice ID (default: English_expressive_narrator)' },
    { flag: '--speed <n>', description: 'Speech speed multiplier' },
    { flag: '--volume <n>', description: 'Volume level' },
    { flag: '--pitch <n>', description: 'Pitch adjustment' },
    { flag: '--format <fmt>', description: 'Audio format (default: mp3)' },
    { flag: '--sample-rate <hz>', description: 'Sample rate (default: 32000)' },
    { flag: '--bitrate <bps>', description: 'Bitrate (default: 128000)' },
    { flag: '--channels <n>', description: 'Audio channels (default: 1)' },
    { flag: '--language <code>', description: 'Language boost' },
    { flag: '--subtitles', description: 'Include subtitle timing data' },
    { flag: '--pronunciation <from/to>', description: 'Custom pronunciation (repeatable)' },
    { flag: '--sound-effect <effect>', description: 'Add sound effect' },
    { flag: '--out <path>', description: 'Save audio to file (uses hex decoding)' },
    { flag: '--stream', description: 'Stream raw audio to stdout' },
  ],
  examples: [
    'minimax speech synthesize --text "Hello, world!"',
    'minimax speech synthesize --text "Hello, world!" --out hello.mp3',
    'echo "Breaking news." | minimax speech synthesize --text-file - --out news.mp3',
    'minimax speech synthesize --text "Stream" --stream | mpv --no-terminal -',
  ],
  async run(config: Config, flags: GlobalFlags) {
    let text = flags.text as string | undefined;

    if (flags.textFile) {
      const path = flags.textFile as string;
      text = path === '-'
        ? readFileSync('/dev/stdin', 'utf-8')
        : readFileSync(path, 'utf-8');
    }

    if (!text) {
      throw new CLIError(
        '--text or --text-file is required.',
        ExitCode.USAGE,
        'minimax speech synthesize --text "Hello" --out hello.mp3',
      );
    }

    const model = (flags.model as string) || 'speech-2.8-hd';
    const voice = (flags.voice as string) || 'English_expressive_narrator';
    const outPath = flags.out as string | undefined;
    const outFormat = outPath ? 'hex' : 'url';
    const format = detectOutputFormat(config.output);

    const body: SpeechRequest = {
      model,
      text,
      voice_setting: {
        voice_id: voice,
        speed: (flags.speed as number) || undefined,
        vol: (flags.volume as number) || undefined,
        pitch: (flags.pitch as number) || undefined,
      },
      audio_setting: {
        format: (flags.format as string) || 'mp3',
        sample_rate: (flags.sampleRate as number) || 32000,
        bitrate: (flags.bitrate as number) || 128000,
        channel: (flags.channels as number) || 1,
      },
      output_format: outFormat,
      stream: flags.stream === true,
    };

    if (flags.language) body.language_boost = flags.language as string;
    if (flags.subtitles) body.subtitle = true;

    if (flags.pronunciation) {
      body.pronunciation_dict = (flags.pronunciation as string[]).map(p => {
        const [from, to] = p.split('/');
        return { tone: to || from!, text: from! };
      });
    }

    if (config.dryRun) {
      console.log(formatOutput({ request: body }, format));
      return;
    }

    const url = speechEndpoint(config.baseUrl);

    if (flags.stream) {
      const res = await request(config, { url, method: 'POST', body, stream: true });
      const reader = res.body?.getReader();
      if (!reader) throw new CLIError('No response body', ExitCode.GENERAL);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        process.stdout.write(value);
      }
      reader.releaseLock();
      return;
    }

    const response = await requestJson<SpeechResponse>(config, {
      url,
      method: 'POST',
      body,
    });

    if (!config.quiet) {
      process.stderr.write(`[Model: ${model}]\n`);
    }

    if (outPath && response.data.audio) {
      // --out given: decode hex and save to file
      const audioBuffer = Buffer.from(response.data.audio, 'hex');
      writeFileSync(outPath, audioBuffer);

      if (config.quiet) {
        console.log(outPath);
      } else {
        console.log(formatOutput({
          saved: outPath,
          duration_ms: response.extra_info?.audio_length,
          size_bytes: response.extra_info?.audio_size,
          sample_rate: response.extra_info?.audio_sample_rate,
        }, format));
      }
    } else if (response.data.audio_url) {
      // No --out: return URL
      if (config.quiet) {
        console.log(response.data.audio_url);
      } else {
        console.log(formatOutput({
          url: response.data.audio_url,
          duration_ms: response.extra_info?.audio_length,
          size_bytes: response.extra_info?.audio_size,
        }, format));
      }
    }
  },
});
