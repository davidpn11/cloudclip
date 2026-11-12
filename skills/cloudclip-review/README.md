# CloudClip review

Comment on a video like a doc, and your agent makes the edits.

Open a video or image in a local review page. Pause, drag a box or click a spot, and type what should change. When you click **Finished**, your agent gets every comment with its timestamp and pixel coordinates, looks at each marked frame, and applies the edits with ffmpeg. It writes a new `<name>.cloudclip.<ext>` file and leaves the original alone.

Live demo: https://cloudclip.davidpn.com/ · Source: https://github.com/davidpn11/cloudclip

## Requirements
- `python3`, which comes with macOS and most Linux distributions
- `ffmpeg` and `ffprobe`, from `brew install ffmpeg`, `sudo apt install ffmpeg`, or `winget install ffmpeg`

## Install
Unzip so that this folder sits in your agent's skills directory, for example `~/.claude/skills/cloudclip-review/` for Claude Code. Then ask your agent "Review ~/Videos/launch.mp4 with CloudClip".

## Using the review page
| Key | Action |
| --- | --- |
| C | Pause and open a comment. While it's open, drag on the frame to mark an area or click to mark a spot. Marking is optional. |
| Enter, Shift+Enter, Esc | Save, add a new line, cancel |
| Space, ← and → | Play or pause, jump 5 seconds |

Click a comment to jump to it and see its mark. Open "Agent view" to see or copy the JSON your agent reads. Click **Finished · return to agent** when you're done.

## Privacy and safety
The server in `server.py` uses only the Python standard library. It listens on 127.0.0.1, rejects requests from other sites, and makes no outside connections. Your media and comments stay on your machine. The skill runs only `python3`, `ffmpeg` and `ffprobe`, and installs nothing.

## Files
- `SKILL.md`: the steps the agent follows
- `server.py`: serves the page and the media, and saves comments
- `app/`: the review page
- `references/ffmpeg-recipes.md`: the ffmpeg commands for each kind of edit

MIT licensed.
