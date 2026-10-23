# CloudClip

**Comment on a video like a doc. Your agent makes the edits.**

CloudClip opens your video or image in a local web page. You pause, drag a box or click a spot, and type what should change. Your AI agent gets every comment as exact timestamps and pixel coordinates, looks at each marked frame, and applies the edits with ffmpeg. It writes a new file and never overwrites your original.

**Live demo:** https://davidpn11.github.io/cloudclip/ (runs in your browser, nothing is uploaded)

## Install

### Claude Code (desktop app or terminal)
```
/plugin marketplace add davidpn11/cloudclip
/plugin install cloudclip@cloudclip
```
Then ask: *"Review ~/Videos/launch.mp4 with CloudClip"*, or run `/cloudclip:review`.

### Other agents (Codex, Gemini CLI, Cursor, Grok, …)
The skill is one self-contained folder that follows the open Agent Skills format, so either:
- clone this repo and work in it, and your agent picks up [`AGENTS.md`](AGENTS.md), or
- copy [`skills/review/`](skills/review) into your agent's skills folder.

Native packages for these platforms are planned.

### Requirements
- `python3` (comes with macOS and most Linux distros)
- `ffmpeg` and `ffprobe` (`brew install ffmpeg`, `sudo apt install ffmpeg`, or `winget install ffmpeg`)

## Using it

| Key | Action |
| --- | --- |
| **C** | Pause and add a comment. While it's open, drag on the frame to mark an area or click to mark a spot (optional) |
| **Enter** / **Shift+Enter** / **Esc** | Save / new line / cancel |
| **Space**, **← / →** | Play or pause, jump 5s |

Click a comment to jump to it and see its mark. Tell your agent "done" when you're finished.

### What the agent receives
```json
[
  {"time": 72.4, "timestamp": "1:12.4", "text": "blur this logo", "box": {"x": 1190, "y": 86, "w": 384, "h": 108}},
  {"time": 80.0, "timestamp": "1:20.0", "text": "this number is wrong", "point": {"x": 640, "y": 300}},
  {"time": 95.2, "timestamp": "1:35.2", "text": "cut from here to 1:50"}
]
```
Times are in seconds. Coordinates are in the media's source pixels, origin top-left. Image comments have no time.

## How it works
```
skills/review/
  SKILL.md     the workflow your agent follows (checks, server, review, ffmpeg recipes)
  server.py    tiny Python stdlib server on 127.0.0.1: the page, the media (with seeking), and comments.json
  app/         the review page; the same files run the GitHub Pages demo (comments go to localStorage there)
index.html     this project's website; demo/ holds its sample media
```

## Status
v0.1. The review page and server are tested. **The ffmpeg editing recipes in SKILL.md are a draft.** Each one was checked on a test clip, but the full comments-to-edit flow hasn't been tested end to end on real projects yet. Check the output, and please open an issue when an edit goes wrong.

One video or image per session. No audio-only mode yet.

## Privacy
The server listens on 127.0.0.1 only, and your media and comments stay on your machine. Comments are saved to a temp file chosen by the agent, not inside your project.

## Website
GitHub Pages serves this repo's root: Settings → Pages → Deploy from branch → `main` / `(root)`.
