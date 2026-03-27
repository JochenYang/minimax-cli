# minimax-cli

Command-line interface for the [MiniMax Token Plan](https://platform.minimax.io/docs/token-plan/intro).

```
  __  __ ___ _   _ ___ __  __    _   __  __
 |  \/  |_ _| \ | |_ _|  \/  |  / \ \ \/ /
 | |\/| || ||  \| || || |\/| | / _ \ \  /
 | |  | || || |\  || || |  | |/ ___ \/  \
 |_|  |_|___|_| \_|___|_|  |_/_/   \_\_/\
```

Generate text, images, video, speech, and music from the terminal. Supports both the **Global** (`api.minimax.io`) and **CN** (`api.minimaxi.com`) platforms with automatic region detection.

## What's New (v0.4.0)

**File management + Vision `file_id` support:**

```bash
FILE_ID=$(minimax file upload --file image.png --quiet)
minimax vision describe --file-id $FILE_ID --prompt "这张图里有几个人？"
```

Also new in v0.3.0: **`minimax config export-schema`** — export all commands as Anthropic/OpenAI-compatible JSON tool schemas with a single command. See [Changelog](#changelog) for full version history.

## Installation

### Standalone binary (recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/MiniMax-AI-Dev/minimax-cli/main/install.sh | sh
```

### npm

```bash
npm install -g minimax-cli
```

### bun

```bash
bun install -g minimax-cli
```

### From source

```bash
git clone https://github.com/MiniMax-AI-Dev/minimax-cli.git && cd minimax-cli
bun install
bun run dev -- --help
```

## Quick start

```bash
minimax auth login --api-key sk-xxxxx
minimax text chat --message "user:What is MiniMax?"
minimax image generate --prompt "A cat in a spacesuit on Mars"
minimax speech synthesize --text "Hello!" --out hello.mp3
minimax vision describe --image photo.jpg
```

## Agent & CI usage

```bash
# Async: get task ID immediately, no blocking
minimax video generate --prompt "A robot." --async --quiet
# → {"taskId":"..."}

# Pipe-friendly: stdout is pure data, stderr is progress
minimax text chat --message "Hi" | jq .

# CI: missing args fail fast with clear errors
minimax image generate --non-interactive
# → Error: Missing required argument: --prompt
```

## Commands

| Command | Description |
|---|---|
| `text chat` | Send a chat completion |
| `speech synthesize` | Text-to-speech, up to 10k chars |
| `image generate` | Generate images |
| `video generate` | Generate a video (auto-downloads on completion) |
| `video task get` | Query video task status |
| `video download` | Download a completed video |
| `file upload` | Upload a file to MiniMax storage |
| `file list` | List uploaded files |
| `file delete` | Delete an uploaded file |
| `music generate` | Generate a song |
| `search query` | Web search |
| `vision describe` | Describe an image (supports `--file-id` to skip base64) |
| `quota show` | Show usage quotas |
| `config export-schema` | Export tool schemas as JSON |
| `config show` / `config set` | View or update configuration |
| `auth login/status/refresh/logout` | Authentication |

All commands accept [global flags](#global-flags).

## Examples

```bash
# Text chat
minimax text chat --message "user:Write fizzbuzz"
minimax text chat --message "Hi" --stream

# Image generation
minimax image generate --prompt "Sunset over ocean" --aspect-ratio 16:9 --n 3

# Vision (path/URL or pre-uploaded file ID)
minimax vision describe --image photo.jpg --prompt "What breed is this?"
minimax vision describe --file-id file-123 --prompt "Extract the text"

# Video (auto-downloads to ~/.minimax-video/ on completion)
minimax video generate --prompt "A man reads a book."
minimax video generate --prompt "A robot." --async --quiet

# Speech synthesis
minimax speech synthesize --text "Hello world!" --out hello.mp3
minimax speech synthesize --text "Breaking news." --text-file - --stream | mpv -

# Music generation
minimax music generate --prompt "Indie folk" --lyrics "La la la..." --out song.mp3

# Web search
minimax search query --q "MiniMax AI latest news"

# File management (for reuse in vision/video)
FILE_ID=$(minimax file upload --file image.png --purpose vision --quiet)
minimax vision describe --file-id $FILE_ID

# Export Agent tool schemas
minimax config export-schema | jq .
minimax config export-schema --command "video generate" | jq .

# Auth
minimax auth login --api-key sk-xxxxx
minimax auth status
```

## Global flags

| Flag | Description |
|---|---|
| `--api-key <key>` | API key (overrides all other auth) |
| `--region <region>` | `global` (default) or `cn` |
| `--base-url <url>` | Override API base URL |
| `--output <format>` | `text`, `json`, or `yaml` |
| `--quiet` | Suppress non-essential output to stderr |
| `--verbose` | Print HTTP request/response details |
| `--timeout <seconds>` | Request timeout (default: 300) |
| `--no-color` | Disable ANSI colors and spinners |
| `--yes` | Skip confirmation prompts |
| `--dry-run` | Show what would happen without executing |
| `--non-interactive` | Disable interactive prompts (CI/agent use) |
| `--async` | Return task ID immediately without polling |
| `--version` / `--help` | Version and help |

## Output philosophy

- `stdout` → result data only (text, file paths, JSON)
- `stderr` → spinners, region detection, help text, warnings, verbose logs

```bash
# stdout is clean JSON — pipe to jq safely
minimax text chat --message "Hi" | jq .

# stderr shows spinner without polluting the pipe
minimax video generate --prompt "Ocean waves." 2>/dev/null
```

## Configuration

Precedence (highest to lowest): CLI flags → env vars → `~/.minimax/config.yaml` → defaults.

```bash
minimax config set --key region --value cn
export MINIMAX_REGION=cn
```

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
bun run dev -- <command>   # Run from source
bun run typecheck          # Type check
bun test                   # Run tests
bun run build              # Build standalone binaries
```

## Changelog

### v0.4.0 — File Management API + Vision file_id Support

**New `file` resource group:**
- `minimax file upload` — upload local file, get `file_id`; `--quiet` outputs only the ID
- `minimax file list` — formatted table of uploaded files
- `minimax file delete` — remove file by ID

**Vision `--file-id` support:**
- `vision describe` now accepts `--file-id` as mutually exclusive alternative to `--image`
- With `--file-id`: sends `{prompt, file_id}` directly to VLM API (no base64)
- With `--image`: existing base64 encoding path unchanged
- Interactive TTY prompt detects whether input is path/URL or fileId

Note: MiniMax File API returned HTTP 404 with the current API key. Endpoint paths and request handling are verified correct via `--verbose` mode.

### v0.3.0 — Agent Tool Schema Auto-Generation

- `OptionDef` interface extended with optional `type` and `required` fields
- New `CommandRegistry.getAllCommands()` traversal method
- `src/utils/schema.ts`: parses `--flag <value>` strings into Anthropic/OpenAI-compatible tool schemas
- New command: `minimax config export-schema` — exports all tool schemas as clean JSON to stdout
- Core commands marked `required: true`: `image generate --prompt`, `text chat --message`, `video generate --prompt`, `vision describe --image`

### v0.2.0 — Agent & CI Compatibility

- `src/utils/env.ts`: `isInteractive()` and `isCI()` helpers
- `--non-interactive`: forces non-interactive mode regardless of TTY state
- `--async`: immediate task-ID return without blocking poll
- All help routes to stderr (not stdout) — `--help | jq` works cleanly
- Streaming: thinking blocks go to stderr in non-TTY mode; final text always to stdout
- Interactive fallback: missing args prompt in TTY, fail fast in CI/agent mode

### v0.1.0 — Initial release

Text chat with streaming · Image generation with batch and subject reference · Video generation with polling and download · Music generation with lyrics · Speech synthesis with voice customization · Web search · Image understanding · OAuth and API key authentication · Automatic region detection (global vs CN) · YAML/JSON/text output formats

## License

MIT
