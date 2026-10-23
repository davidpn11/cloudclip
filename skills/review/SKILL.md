---
name: review
description: Review a video or image in the browser with comments tied to a moment and, optionally, a marked area (box or point), then apply those comments as edits with ffmpeg. Use when the user wants to review, give feedback on, annotate, or edit a video or image file (mp4, mov, webm, png, jpg…), or mentions CloudClip.
---

# CloudClip review

The user watches the video (or looks at the image) in a local web page. They pause, optionally drag a box or click a spot on the frame, and type a comment. You then turn those comments into ffmpeg edits.

Everything you need is in the folder that contains this file: `server.py` (Python stdlib only) and `app/` (the page).
In Claude Code, that folder is `${CLAUDE_PLUGIN_ROOT}/skills/review`.

## 1. Check tools and inspect the media
- Check that `python3`, `ffmpeg` and `ffprobe` exist (`command -v`). If one is missing, stop and tell the user how to install it: macOS `brew install ffmpeg`, Debian/Ubuntu `sudo apt install ffmpeg python3`, Windows `winget install ffmpeg`.
- Run `ffprobe -v error -show_entries format=duration:stream=codec_type,codec_name,width,height,r_frame_rate -of compact "<media>"` and keep the duration, resolution and codecs. For an image, only the resolution matters.

## 2. Start the review server
Save the comments **outside** the user's project and outside this skill folder. Use your scratch directory if you have one, otherwise `${TMPDIR:-/tmp}`:

```bash
python3 "<skill folder>/server.py" "<media>" "<scratch>/cloudclip-<media-name>.json"
```

Run it in the background. Its first line of output is the URL, e.g. `http://127.0.0.1:53817/?src=/media/talk.mp4`. The port is a free one picked by the OS. The server binds to 127.0.0.1 only. If the JSON file already exists, the user's earlier comments load again, so they can resume.

## 3. Open the page and explain it
- **Claude Code desktop app:** open the URL in the built-in browser pane (`preview_start` with the URL).
- **Terminal:** `open "<url>"` on macOS, `xdg-open "<url>"` on Linux, `start "" "<url>"` on Windows. Any other agent: use whatever opens a URL.

Tell the user:
- **C** pauses and opens a comment. While it's open, **drag** on the frame to mark an area or **click** to mark a spot (optional), then type.
- **Enter** saves, **Shift+Enter** adds a new line, **Esc** cancels.
- **Space** plays or pauses, **← / →** jump 5s. Clicking a comment jumps to it and shows its mark. **✕** deletes.
- Comments save automatically. Say "done" here when finished.

## 4. Read the comments
Once the user says they're done, read the JSON file. It holds a list. Times are in seconds. Coordinates are in **source pixels** of the media (origin top-left, the same resolution ffprobe reports):

```json
[
  {"time": 72.4, "timestamp": "1:12.4", "text": "blur this logo", "box": {"x": 1190, "y": 86, "w": 384, "h": 108}},
  {"time": 80.0, "timestamp": "1:20.0", "text": "this number is wrong", "point": {"x": 640, "y": 300}},
  {"time": 95.2, "timestamp": "1:35.2", "text": "cut from here to 1:50"}
]
```
Image comments have no `time` or `timestamp`.

## 5. Look at every marked comment
For each comment with a `box` or `point`, grab that frame with the mark drawn on it and look at the image yourself, so you know what the user pointed at:

```bash
ffmpeg -v error -y -ss <time> -i "<media>" -frames:v 1 -vf "drawbox=x=<x>:y=<y>:w=<w>:h=<h>:color=red:t=4" "<scratch>/mark-<n>.png"
```
For a point, draw a small box around it (`x-12`, `y-12`, `w=24`, `h=24`). For an image, leave out `-ss`.

## 6. Plan, confirm, edit
1. Turn each comment into one operation from the recipes below. Many comments are relative ("cut from here to 1:50", "make this shorter"), so resolve them against the comment's `time`.
2. Show the user a short numbered plan. **Ask before running it** if any comment is ambiguous, for example "fix this" or a time range that overlaps another edit.
3. Write a **new** file next to the original, `<name>.cloudclip.<ext>`. **Never overwrite the original.** Chain the operations in one filter graph when you can; otherwise run steps on intermediate files in your scratch directory.
4. Apply time-based edits in order from the **end** of the video to the start, so earlier cuts don't shift later timestamps. Do region edits (blur, box, text) before cuts.
5. Run ffprobe on the result and check the duration matches the plan. Grab a frame at each edited spot and look at it.
6. Stop the server (kill the background process) and tell the user where the new file is.

## Common edits (draft)
These recipes are a starting point and haven't been tested end to end on real projects yet. Check the output each time.

**Re-encode by default** (`-c:v libx264 -crf 18 -preset medium -c:a aac -b:a 192k`), so cuts land exactly on the commented frame. `-c copy` is much faster but can only cut at keyframes, which may be seconds away. Use it only when the user prefers speed over exact cuts. `A`/`B` are seconds, and `X:Y` and `W:H` come from `box`.

| Edit | Command |
| --- | --- |
| Cut A–B out | `ffmpeg -i in.mp4 -filter_complex "[0:v]trim=0:A,setpts=PTS-STARTPTS[v0];[0:a]atrim=0:A,asetpts=PTS-STARTPTS[a0];[0:v]trim=start=B,setpts=PTS-STARTPTS[v1];[0:a]atrim=start=B,asetpts=PTS-STARTPTS[a1];[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]" -map "[v]" -map "[a]" <encode> out.mp4` |
| Keep only A–B (trim start/end, extract a clip) | `ffmpeg -ss A -to B -i in.mp4 <encode> out.mp4` |
| Speed up A–B 2× | Split into three segments as in "cut", then for the middle one use `setpts=(PTS-STARTPTS)/2` and `atempo=2`, and `concat=n=3`. `atempo` takes 0.5–100; chain it for more. |
| Blur an area during A–B | `ffmpeg -i in.mp4 -filter_complex "[0:v]crop=W:H:X:Y,boxblur=luma_radius='min(w,h)/5':chroma_radius='min(cw,ch)/5':luma_power=2[b];[0:v][b]overlay=X:Y:enable='between(t,A,B)'[v]" -map "[v]" -map 0:a -c:v libx264 -crf 18 -c:a copy out.mp4` |
| Highlight an area | `-vf "drawbox=x=X:y=Y:w=W:h=H:color=yellow@0.9:t=6:enable='between(t,A,B)'"` |
| Crop the whole video to an area | `-vf "crop=W:H:X:Y"` (add `,scale=1920:-2` to scale back up) |
| Text overlay | `-vf "drawtext=text='Title':x=(w-tw)/2:y=h*0.1:fontsize=56:fontcolor=white:box=1:boxcolor=black@0.5:boxborderw=16:enable='between(t,A,B)'"`. This needs an ffmpeg built with libfreetype: check `ffmpeg -filters \| grep drawtext`. Some builds, including Homebrew's default `ffmpeg`, don't have it. The `homebrew-ffmpeg/ffmpeg` tap or a static build from ffmpeg.org usually does. If the user can't install one, tell them and skip the edit. |
| Volume during A–B | `ffmpeg -i in.mp4 -af "volume=2:enable='between(t,A,B)'" -c:v copy -c:a aac -b:a 192k out.mp4` (the video stream is copied untouched) |
| Mute A–B | the same, with `volume=0` |

**Images:** use the same filters on the image without `enable=` or `-map 0:a`. For example, blur: `ffmpeg -i in.jpg -filter_complex "[0:v]crop=W:H:X:Y,boxblur=...[b];[0:v][b]overlay=X:Y" in.cloudclip.jpg`. Crop: `-vf "crop=W:H:X:Y"`. Highlight: `drawbox`.
