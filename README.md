# minimax-cli

Command-line interface for the [MiniMax Token Plan](https://platform.minimax.io/docs/token-plan/intro).

```
  __  __ ___ _   _ ___ __  __    _   __  __
 |  \/  |_ _| \ | |_ _|  \/  |  / \ \ \/ /
 | |\/| || ||  \| || || |\/| | / _ \ \  /
 | |  | || || |\  || || |  | |/ ___ \/  \
 |_|  |_|___|_| \_|___|_|  |_/_/   \_\/_/\
```

Generate text, images, video, speech, and music from the terminal. Supports both the **Global** (`api.minimax.io`) and **CN** (`api.minimaxi.com`) platforms with automatic region detection.

## Installation

### Standalone binary (recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/MiniMax-AI-Dev/minimax-cli/main/install.sh | sh
```

Downloads a precompiled binary to `/usr/local/bin/minimax`. No runtime required.

### npm (requires Node 18+)

```bash
npm install -g minimax-cli
```

### bun

```bash
bun install -g minimax-cli
```

### From source

```bash
git clone https://github.com/MiniMax-AI-Dev/minimax-cli.git
cd minimax-cli
bun install
bun run dev -- --help
```

## Quick start

```bash
# Set your API key
minimax auth login --api-key sk-xxxxx

# The CLI auto-detects your region (global or cn) on first run

# Chat
minimax text chat --message "user:What is MiniMax?"

# Generate an image
minimax image generate --prompt "A cat in a spacesuit on Mars"

# Text-to-speech
minimax speech synthesize --text "Hello, world!" --out hello.mp3

# Search the web
minimax search query --q "latest AI news"

# Describe an image
minimax vision describe --image photo.jpg --prompt "What is this?"
```

## Commands

### text

```bash
# Simple chat
minimax text chat --message "user:Hello"

# With system prompt and model selection
minimax text chat --model MiniMax-M2.7-highspeed \
  --system "You are a coding assistant." \
  --message "user:Write fizzbuzz in Python"

# Streaming (default in TTY)
minimax text chat --message "user:Tell me a story" --stream

# Multi-turn conversation from file
cat conversation.json | minimax text chat --messages-file -
```

### speech

```bash
# Generate speech and save to file
minimax speech synthesize --text "Hello, world!" --out hello.mp3

# Read from file or stdin
echo "Breaking news." | minimax speech synthesize --text-file - --out news.mp3

# Stream audio to a player
minimax speech synthesize --text "Stream this" --stream | mpv --no-terminal -

# Custom voice and speed
minimax speech synthesize --text "Fast narration" --voice English_expressive_narrator --speed 1.5 --out fast.mp3
```

### image

```bash
# Generate an image
minimax image generate --prompt "Mountain landscape at sunset"

# Custom aspect ratio and batch
minimax image generate --prompt "Logo design" --aspect-ratio 1:1 --n 3 --out-dir ./generated/

# With subject reference
minimax image generate --prompt "Portrait in oil painting style" --subject-ref ./photo.jpg
```

### video

```bash
# Submit a video generation task
minimax video generate --prompt "A man reads a book. Static shot."

# Wait for completion and download
minimax video generate --prompt "Ocean waves at sunset." --wait --download sunset.mp4

# With first frame image
minimax video generate --prompt "Mouse runs toward camera." --first-frame ./mouse.jpg

# Check task status
minimax video task get --task-id 106916112212032

# Download a completed video
minimax video download --file-id 176844028768320 --out video.mp4
```

### music

```bash
# Generate with custom lyrics
minimax music generate --prompt "Indie folk, melancholic" --lyrics "La la la..." --out song.mp3

# Lyrics from file
minimax music generate --prompt "Upbeat pop" --lyrics-file song.txt --out summer.mp3

# Auto-generated lyrics
minimax music generate --prompt "Jazz lounge" --auto-lyrics --out jazz.mp3
```

### search

```bash
# Web search
minimax search query --q "MiniMax AI"

# JSON output for scripting
minimax search query --q "latest news" --output json
```

### vision

```bash
# Describe a local image
minimax vision describe --image photo.jpg

# Describe from URL
minimax vision describe --image https://example.com/photo.jpg

# Custom prompt
minimax vision describe --image screenshot.png --prompt "Extract the text from this screenshot"
```

### quota

```bash
# Show usage and remaining quotas
minimax quota show

# JSON output
minimax quota show --output json
```

### config

```bash
# Show current configuration
minimax config show

# Set region
minimax config set --key region --value cn

# Set default output format
minimax config set --key output --value json

# Set request timeout
minimax config set --key timeout --value 600
```

### auth

```bash
# Login with API key
minimax auth login --api-key sk-xxxxx

# Check auth status
minimax auth status

# Logout
minimax auth logout
```

## Global flags

| Flag | Description |
|---|---|
| `--api-key <key>` | API key (overrides all other auth) |
| `--region <region>` | API region: `global` (default), `cn` |
| `--base-url <url>` | API base URL (overrides region) |
| `--output <format>` | Output format: `text`, `json`, `yaml` |
| `--quiet` | Suppress non-essential output |
| `--verbose` | Print HTTP request/response details |
| `--timeout <seconds>` | Request timeout (default: 300) |
| `--no-color` | Disable ANSI colors and spinners |
| `--yes` | Skip confirmation prompts |
| `--dry-run` | Show what would happen without executing |

## Region auto-detection

On first run, the CLI probes both the Global and CN quota endpoints with your API key to determine which platform it belongs to. The detected region is cached in `~/.minimax/config.yaml` so subsequent runs are instant.

You can override the region at any time:

```bash
# Per-command
minimax text chat --region cn --message "user:Hello"

# Environment variable
export MINIMAX_REGION=cn

# Persistent
minimax config set --key region --value cn
```

## Configuration

The CLI reads configuration from multiple sources, in order of precedence:

1. Command-line flags (`--api-key`, `--region`, etc.)
2. Environment variables (`MINIMAX_API_KEY`, `MINIMAX_REGION`, `MINIMAX_BASE_URL`, `MINIMAX_OUTPUT`, `MINIMAX_TIMEOUT`)
3. Config file (`~/.minimax/config.yaml`)
4. Defaults

## Output formats

- **text** (default in TTY) -- human-readable tables and formatted text
- **json** (default in non-TTY) -- full API response, suitable for piping to `jq`
- **yaml** -- YAML serialization of the full response

When stdout is not a TTY (e.g., piped to another program), the output automatically switches to JSON for easy parsing.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | General error |
| 2 | Usage error (bad flags, missing arguments) |
| 3 | Authentication error |
| 4 | Quota exceeded |
| 5 | Timeout |
| 10 | Content filter triggered |

## Building

```bash
# Run from source
bun run dev -- <command>

# Type check
bun run typecheck

# Run tests
bun test

# Build standalone binaries for all platforms
bun run build

# Build npm-publishable bundle
bun run build:npm
```

## License

MIT
