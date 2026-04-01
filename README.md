# minimax-cli

CLI for the [MiniMax AI Platform](https://platform.minimax.io) — generate text, images, video, speech, and music from the terminal. Supports **Global** (`api.minimax.io`) and **CN** (`api.minimaxi.com`) with automatic region detection.

---

### Why minimax-cli?

Zero-config Agent integration — `minimax config export-schema` dumps a standard Anthropic/OpenAI-compatible JSON Tool Schema in one shot. Cursor, Cline, Dify, and any other Agent framework that speaks tool schemas can start using all minimax commands instantly.

Pipeline & CI friendly — all data flows through `stdout`, every piece of UI (spinners, status bars, progress bars) stays on `stderr`. `minimax text chat --message "hi" | jq .` Just Works™ — no stray ANSI codes, no mixed streams.

Polished terminal experience — every invocation shows a branded dashboard with live quota balance and a real-color status bar exposing region, key source, and active model. Because how you look matters in the shell.

---

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/MiniMax-AI-Dev/minimax-cli/main/install.sh | sh
```

Or via npm / bun:

```bash
npm install -g minimax-cli
```

## Quick Start

```bash
minimax auth login --api-key sk-xxxxx
minimax text chat --message "What is MiniMax?"
minimax image generate --prompt "A cat in a spacesuit"
minimax video generate --prompt "Ocean waves at sunset"
minimax speech synthesize --text "Hello!" --out hello.mp3
minimax music generate --prompt "Indie folk" --lyrics "La la la..."
minimax vision describe --image photo.jpg
minimax search query --q "MiniMax AI latest news"
```

## Commands

| Command | Description |
|---|---|
| `text chat` | Chat completion (MiniMax-M2.7) |
| `image generate` | Image generation (image-01) |
| `video generate` | Video generation (Hailuo-2.3) |
| `speech synthesize` | Text-to-speech (speech-2.8-hd) |
| `music generate` | Music generation (music-2.5) |
| `vision describe` | Image understanding (VLM) |
| `search query` | Web search |
| `quota show` | Usage quotas |
| `config show / set` | Configuration |
| `config export-schema` | Export tool schemas as JSON |
| `auth login/status/refresh/logout` | Authentication |
| `update` | Self-update |

Run `minimax <command> --help` for full options.

## Agent / CI Usage

See [skill/SKILL.md](skill/SKILL.md) for the complete agent integration guide, including all command signatures, tool schema export, and piping patterns.

```bash
minimax video generate --prompt "A robot." --async --quiet   # non-blocking
minimax text chat --message "Hi" --output json | jq .        # pipe-friendly
minimax config export-schema | jq .                          # tool schemas
```

## Changelog

### v0.5.0
- **Brand status bar**: HTTP requests now print a beautiful true-color status bar showing `MINIMAX Region: CN | Key: sk-c...nI7s | Model: MiniMax-M2.7` in MiniMax brand colors (blue, purple, cyan, pink)
- Status bar respects `--quiet` flag and only renders in TTY terminals
- Removed duplicate `[Model: ...]` output from `text chat` command

### v0.1.0
- Initial release — text, image, video, speech, music, vision, and search commands

## Output Philosophy

- `stdout` → data only (text, paths, JSON)
- `stderr` → spinners, warnings, help

## License

MIT
