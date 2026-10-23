# CloudClip

Comment on a video like a doc, and your agent makes the edits.

CloudClip opens a video or image in a local web page. You pause, drag a box or click a spot, and type what should change. Your AI agent gets each comment with its timestamp and pixel coordinates, grabs the marked frame to see what you pointed at, and applies the edit with ffmpeg. It writes a new file and leaves the original alone.

Try the live demo at https://cloudclip.davidpn.com/. It runs in your browser and uploads nothing.

## Install

### Claude Code (desktop app or terminal)
```
/plugin marketplace add davidpn11/cloudclip
/plugin install cloudclip@cloudclip
```
Then ask Claude to "Review ~/Videos/launch.mp4 with CloudClip", or run `/cloudclip:review`.

### Other agents (Codex, Gemini CLI, Cursor, Grok)
The skill is one folder in the open Agent Skills format. Either clone this repo and work in it, so your agent reads [`AGENTS.md`](AGENTS.md), or copy [`skills/review/`](skills/review) into your agent's skills folder.

I plan to ship a native package for each of these later.

### Requirements
- `python3`, which comes with macOS and most Linux distributions
- `ffmpeg` and `ffprobe`, from `brew install ffmpeg`, `sudo apt install ffmpeg`, or `winget install ffmpeg`

## Using it

| Key | Action |
| --- | --- |
| C | Pause and open a comment. While it's open, drag on the frame to mark an area or click to mark a spot. Marking is optional. |
| Enter, Shift+Enter, Esc | Save, add a new line, cancel |
| Space, ← and → | Play or pause, jump 5 seconds |

Click a comment to jump to it and see its mark. Tell your agent "done" when you finish.

### What the agent receives
```json
[
  {"time": 72.4, "timestamp": "1:12.4", "text": "blur this logo", "box": {"x": 1190, "y": 86, "w": 384, "h": 108}},
  {"time": 80.0, "timestamp": "1:20.0", "text": "this number is wrong", "point": {"x": 640, "y": 300}},
  {"time": 95.2, "timestamp": "1:35.2", "text": "cut from here to 1:50"}
]
```
Times are in seconds. Coordinates are in the media's source pixels, measured from the top-left corner. Image comments have no time.

## How it works
```
skills/review/
  SKILL.md     the steps the agent follows, plus the ffmpeg recipes
  server.py    a Python server with no dependencies. It listens on 127.0.0.1 and serves the page,
               the media file (with seeking), and comments.json.
  app/         the review page. The website's demo runs these same files and saves to localStorage.
website/       the project website, a Next.js static export
demo/          the sample video and image for the demo
```

## Status
This is version 0.1. I tested the review page and the server by hand. The ffmpeg recipes in SKILL.md are a draft. Each one ran on a test clip, but nobody has run the whole flow from comments to edits on a real project yet. Check the output, and open an issue when an edit goes wrong.

Each session reviews one video or image. There is no audio-only mode yet.

## Privacy
The server listens on 127.0.0.1 only, so your media and comments stay on your machine. The agent saves comments to a temp file outside your project.

## Website
The site in `website/` is a Next.js static export. To run it locally:
```bash
cd website && bun install && bun run dev
```
`bun run dev` and `bun run build` first copy `skills/review/app` and `demo/` into `website/public`, so the demo always runs the same page the plugin ships.

The `Website` workflow in `.github/workflows/pages.yml` builds the site on every pull request and deploys it to GitHub Pages on every push to `main` that changes it. Before the first deploy, open the repo's Settings, go to Pages, and set Source to "GitHub Actions".

## Releasing
Bump `version` in `.claude-plugin/plugin.json` for every release. Without a new version, `claude plugin update` keeps the old copy. Run `claude plugin validate . --strict` before you push.

## License
[MIT](LICENSE)
