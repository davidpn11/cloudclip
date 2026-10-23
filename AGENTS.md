# CloudClip for any coding agent

This repo holds a skill that opens a video or image for review in the browser, then turns the reviewer's comments into ffmpeg edits.

When the user asks to review, comment on, or edit a video or image with CloudClip, follow [`skills/review/SKILL.md`](skills/review/SKILL.md). The server and the review page it needs are in `skills/review/`. It needs `python3`, `ffmpeg`, `ffprobe`, a shell, and a way to open a URL in a browser.
