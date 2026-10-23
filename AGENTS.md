# CloudClip for any coding agent

This repo is a portable skill for reviewing a video or image and turning the reviewer's comments into ffmpeg edits.

When the user asks to review, comment on, or edit a video or image with CloudClip, follow
[`skills/review/SKILL.md`](skills/review/SKILL.md). Everything it needs (the server and the review page) is in `skills/review/`.
It needs only `python3`, `ffmpeg`, `ffprobe`, a shell, and a way to open a URL in a browser.
