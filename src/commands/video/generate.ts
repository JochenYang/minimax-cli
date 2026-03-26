import { defineCommand } from '../../command';
import { CLIError } from '../../errors/base';
import { ExitCode } from '../../errors/codes';
import { requestJson } from '../../client/http';
import { videoGenerateEndpoint, videoTaskEndpoint, fileRetrieveEndpoint } from '../../client/endpoints';
import { poll } from '../../polling/poll';
import { downloadFile, formatBytes } from '../../files/download';
import { formatOutput, detectOutputFormat } from '../../output/formatter';
import type { Config } from '../../config/schema';
import type { GlobalFlags } from '../../types/flags';
import type { VideoRequest, VideoResponse, VideoTaskResponse, FileRetrieveResponse } from '../../types/api';
import { readFileSync } from 'fs';

export default defineCommand({
  name: 'video generate',
  description: 'Generate a video (Hailuo-2.3 / 2.3-Fast)',
  usage: 'minimax video generate --prompt <text> [flags]',
  options: [
    { flag: '--model <model>', description: 'Model ID (default: MiniMax-Hailuo-2.3)' },
    { flag: '--prompt <text>', description: 'Video description' },
    { flag: '--first-frame <path-or-url>', description: 'First frame image' },
    { flag: '--callback-url <url>', description: 'Webhook URL for completion notification' },
    { flag: '--download <path>', description: 'Save video to file on completion' },
    { flag: '--no-wait', description: 'Return task ID immediately without waiting' },
    { flag: '--poll-interval <seconds>', description: 'Polling interval when waiting (default: 5)' },
  ],
  examples: [
    'minimax video generate --prompt "A man reads a book. Static shot."',
    'minimax video generate --prompt "Ocean waves at sunset." --download sunset.mp4',
    'minimax video generate --prompt "A robot painting." --no-wait --quiet',
  ],
  async run(config: Config, flags: GlobalFlags) {
    const prompt = flags.prompt as string | undefined;
    if (!prompt) {
      throw new CLIError(
        '--prompt is required for video generation.',
        ExitCode.USAGE,
        'minimax video generate --prompt <text> [--model <model>]',
      );
    }

    const model = (flags.model as string) || 'MiniMax-Hailuo-2.3';
    const format = detectOutputFormat(config.output);

    const body: VideoRequest = {
      model,
      prompt,
    };

    if (flags.firstFrame) {
      const framePath = flags.firstFrame as string;
      if (framePath.startsWith('http')) {
        body.first_frame_image = framePath;
      } else {
        const imgData = readFileSync(framePath);
        body.first_frame_image = `data:image/jpeg;base64,${imgData.toString('base64')}`;
      }
    }

    if (flags.callbackUrl) {
      body.callback_url = flags.callbackUrl as string;
    }

    if (config.dryRun) {
      console.log(formatOutput({ request: body }, format));
      return;
    }

    const url = videoGenerateEndpoint(config.baseUrl);
    const response = await requestJson<VideoResponse>(config, {
      url,
      method: 'POST',
      body,
    });

    const taskId = response.task_id;

    // --no-wait: return task ID immediately
    if (flags.noWait) {
      if (config.quiet) {
        console.log(taskId);
      } else {
        console.log(formatOutput({
          task_id: taskId,
          status: 'Submitted',
        }, format));
      }
      return;
    }

    // Default: poll until completion
    const pollInterval = (flags.pollInterval as number) || 5;
    const taskUrl = videoTaskEndpoint(config.baseUrl, taskId);

    const result = await poll<VideoTaskResponse>(config, {
      url: taskUrl,
      intervalSec: pollInterval,
      timeoutSec: config.timeout,
      isComplete: (d) => (d as VideoTaskResponse).status === 'Success',
      isFailed: (d) => (d as VideoTaskResponse).status === 'Failed',
      getStatus: (d) => (d as VideoTaskResponse).status,
    });

    if (!result.file_id) {
      throw new CLIError(
        'Task completed but no file_id returned.',
        ExitCode.GENERAL,
      );
    }

    // Resolve file_id to download URL
    const fileInfo = await requestJson<FileRetrieveResponse>(config, {
      url: fileRetrieveEndpoint(config.baseUrl, result.file_id),
    });
    const downloadUrl = fileInfo.file?.download_url;

    if (!downloadUrl) {
      throw new CLIError(
        'No download URL available for this file.',
        ExitCode.GENERAL,
      );
    }

    // --download: save to file
    if (flags.download) {
      const destPath = flags.download as string;
      const { size } = await downloadFile(downloadUrl, destPath, { quiet: config.quiet });

      if (config.quiet) {
        console.log(destPath);
      } else {
        console.log(formatOutput({
          task_id: taskId,
          status: 'Success',
          file_id: result.file_id,
          saved: destPath,
          size: formatBytes(size),
        }, format));
      }
      return;
    }

    // Default: return download URL
    if (config.quiet) {
      console.log(downloadUrl);
    } else {
      console.log(formatOutput({
        task_id: taskId,
        status: 'Success',
        file_id: result.file_id,
        url: downloadUrl,
        video_width: result.video_width,
        video_height: result.video_height,
      }, format));
    }
  },
});
