# CloudClip for any coding agent

This repo holds a skill that opens a video, image or presentation (PowerPoint or HTML) for review in the browser, then turns the reviewer's comments into edits.

When the user asks to review, comment on, or edit a video, image or presentation with CloudClip, follow [`skills/cloudclip-review/SKILL.md`](skills/cloudclip-review/SKILL.md). The server and the review page it needs are in `skills/cloudclip-review/`. It needs `python3`, a shell, and a way to open a URL in a browser. Video and images also need `ffmpeg` and `ffprobe`, and PowerPoint needs LibreOffice and poppler.
