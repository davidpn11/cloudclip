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

### Codex (CLI and app)
```
codex plugin marketplace add davidpn11/cloudclip
codex plugin add cloudclip@cloudclip
```
In the Codex app, add the marketplace the same way, then install `cloudclip` from Plugins. Start a new session afterwards so Codex loads the skill.

### GitHub Copilot CLI
```
copilot plugin marketplace add davidpn11/cloudclip
copilot plugin install cloudclip@cloudclip
```

### Cursor
CloudClip ships a root `plugin.json` in the [Agent Plugins](https://agent-plugins.org) format, which Cursor loads without changes. Until it's listed in the Cursor Marketplace, clone it into Cursor's local plugins folder and run "Developer: Reload Window".
```
git clone https://github.com/davidpn11/cloudclip ~/.cursor/plugins/local/cloudclip
```

### Grok Build
Grok Build reads Claude Code plugins and marketplaces, so installing CloudClip in Claude Code also makes it show up in Grok's `/plugins`. Without Claude Code, clone it into Grok's plugins folder:
```
git clone https://github.com/davidpn11/cloudclip ~/.grok/plugins/cloudclip
```

### Antigravity CLI and other agents
The [skills CLI](https://github.com/vercel-labs/skills) copies `skills/review/` into the skills folder of each agent it finds on your machine, such as Antigravity, OpenCode, Windsurf or Cline:
```
npx skills add davidpn11/cloudclip
```
Google replaced Gemini CLI with Antigravity CLI in June 2026, so Gemini CLI users should take this route too.

Any other agent can use CloudClip if you copy [`skills/review/`](skills/review) into its skills folder, or open this repo so it reads [`AGENTS.md`](AGENTS.md).

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
plugin.json    the Agent Plugins manifest, read by Codex, Cursor and Copilot CLI
.claude-plugin/          the Claude Code manifest and marketplace, also read by Copilot CLI and Grok Build
.agents/plugins/         the Codex marketplace
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
Bump `version` in both `plugin.json` and `.claude-plugin/plugin.json` for every release. Without a new version, `claude plugin update` and the other clients keep the old copy. Run `claude plugin validate . --strict` before you push.

## License
[MIT](LICENSE)
