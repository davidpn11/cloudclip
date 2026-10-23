---
name: review
description: Review a video or image in the browser with comments tied to a moment and, optionally, a marked area (box or point), then apply those comments as edits with ffmpeg. Use when the user wants to review, give feedback on, annotate, or edit a video or image file (mp4, mov, webm, png, jpg and similar), or mentions CloudClip.
---

# CloudClip review

The user watches the video, or looks at the image, in a local web page. They pause, can drag a box or click a spot on the frame, and type a comment. You then turn those comments into ffmpeg edits.

The folder that holds this file also holds `server.py`, which uses only the Python standard library, and `app/`, the review page. In Claude Code, that folder is `${CLAUDE_PLUGIN_ROOT}/skills/review`.

## 1. Check tools and inspect the media
- Check that `python3`, `ffmpeg` and `ffprobe` exist with `command -v`. If one is missing, stop and tell the user how to install it. On macOS that's `brew install ffmpeg`, on Debian or Ubuntu `sudo apt install ffmpeg python3`, and on Windows `winget install ffmpeg`.
- Run `ffprobe -v error -show_entries format=duration:stream=codec_type,codec_name,width,height,r_frame_rate -of compact "<media>"` and note the duration, resolution and codecs. For an image, only the resolution matters.

## 2. Start the review server
Save the comments outside the user's project and outside this skill folder. Use your scratch directory if you have one, and `${TMPDIR:-/tmp}` if you don't.

```bash
python3 "<skill folder>/server.py" "<media>" "<scratch>/cloudclip-<media-name>.json"
```

Run it in the background. The first line it prints is the URL, for example `http://127.0.0.1:53817/?src=/media/talk.mp4`. The OS picks a free port, and the server listens on 127.0.0.1 only. If the JSON file already exists, the page loads the user's earlier comments so they can pick up where they left off.

## 3. Open the page and explain it
In the Claude Code desktop app, open the URL in the built-in browser pane with `preview_start`. In a terminal, run `open "<url>"` on macOS, `xdg-open "<url>"` on Linux, or `start "" "<url>"` on Windows. Other agents can use whatever they have for opening a URL.

Tell the user how the page works:
- C pauses and opens a comment. While it's open, they can drag on the frame to mark an area or click to mark a spot, then type.
- Enter saves, Shift+Enter adds a new line, and Esc cancels.
- Space plays or pauses, and the left and right arrows jump 5 seconds. Clicking a comment jumps to it and shows its mark. The ✕ button deletes it.
- Comments save as they go. They should say "done" in the chat when they finish.

## 4. Read the comments
When the user says they're done, read the JSON file. It holds a list. Times are in seconds. Coordinates are in the media's source pixels, measured from the top-left corner, at the resolution ffprobe reports.

```json
[
  {"time": 72.4, "timestamp": "1:12.4", "text": "blur this logo", "box": {"x": 1190, "y": 86, "w": 384, "h": 108}},
  {"time": 80.0, "timestamp": "1:20.0", "text": "this number is wrong", "point": {"x": 640, "y": 300}},
  {"time": 95.2, "timestamp": "1:35.2", "text": "cut from here to 1:50"}
]
```
Image comments have no `time` or `timestamp`.

## 5. Look at every marked comment
For each comment with a `box` or `point`, grab that frame with the mark drawn on it and look at the image, so you know what the user pointed at.

```bash
ffmpeg -v error -y -ss <time> -i "<media>" -frames:v 1 -vf "drawbox=x=<x>:y=<y>:w=<w>:h=<h>:color=red:t=4" "<scratch>/mark-<n>.png"
```
For a point, draw a 24 by 24 box centered on it (`x-12`, `y-12`, `w=24`, `h=24`). For an image, leave out `-ss`.

## 6. Plan, confirm, edit
1. Turn each comment into one operation from the recipes below. Many comments are relative, like "cut from here to 1:50" or "make this shorter", so read them against the comment's `time`.
2. Show the user a short numbered plan. Ask before you run it if any comment is unclear, such as "fix this", or if one time range overlaps another edit.
3. Write a new file next to the original, named `<name>.cloudclip.<ext>`. **Never overwrite the original.** Chain the operations in one filter graph when you can. Otherwise run each step on an intermediate file in your scratch directory.
4. Do region edits (blur, box, text) before cuts. Apply time-based edits from the end of the video backward, so an earlier cut doesn't shift the timestamps of later ones.
5. Run ffprobe on the result and check that the duration matches the plan. Grab a frame at each edited spot and look at it.
6. Stop the server by killing its background process, and tell the user where the new file is.

## Common edits (draft)
Each recipe ran on a test clip, but nobody has run them end to end on a real project yet. Check the output every time.

Re-encode by default with `-c:v libx264 -crf 18 -preset medium -c:a aac -b:a 192k`, so each cut lands on the commented frame. `-c copy` is much faster but can only cut at keyframes, which may be seconds away from the comment. Use it only when the user prefers speed over exact cuts. In the table, `A` and `B` are seconds, and `X`, `Y`, `W` and `H` come from `box`.

| Edit | Command |
| --- | --- |
| Cut A to B out | `ffmpeg -i in.mp4 -filter_complex "[0:v]trim=0:A,setpts=PTS-STARTPTS[v0];[0:a]atrim=0:A,asetpts=PTS-STARTPTS[a0];[0:v]trim=start=B,setpts=PTS-STARTPTS[v1];[0:a]atrim=start=B,asetpts=PTS-STARTPTS[a1];[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]" -map "[v]" -map "[a]" <encode> out.mp4` |
| Keep only A to B (trim the start or end, extract a clip) | `ffmpeg -ss A -to B -i in.mp4 <encode> out.mp4` |
| Speed up A to B by 2x | Split into three segments as in the cut recipe. Give the middle one `setpts=(PTS-STARTPTS)/2` and `atempo=2`, and use `concat=n=3`. `atempo` accepts 0.5 to 100, and you can chain it for more. |
| Blur an area from A to B | `ffmpeg -i in.mp4 -filter_complex "[0:v]crop=W:H:X:Y,boxblur=luma_radius='min(w,h)/5':chroma_radius='min(cw,ch)/5':luma_power=2[b];[0:v][b]overlay=X:Y:enable='between(t,A,B)'[v]" -map "[v]" -map 0:a -c:v libx264 -crf 18 -c:a copy out.mp4` |
| Highlight an area | `-vf "drawbox=x=X:y=Y:w=W:h=H:color=yellow@0.9:t=6:enable='between(t,A,B)'"` |
| Crop the whole video to an area | `-vf "crop=W:H:X:Y"`, plus `,scale=1920:-2` to scale it back up |
| Text overlay | `-vf "drawtext=text='Title':x=(w-tw)/2:y=h*0.1:fontsize=56:fontcolor=white:box=1:boxcolor=black@0.5:boxborderw=16:enable='between(t,A,B)'"`. This filter needs an ffmpeg built with libfreetype, so check `ffmpeg -filters \| grep drawtext` first. Homebrew's default `ffmpeg` lacks it. The `homebrew-ffmpeg/ffmpeg` tap and the static builds on ffmpeg.org usually include it. If the user can't install one, tell them and skip this edit. |
| Change volume from A to B | `ffmpeg -i in.mp4 -af "volume=2:enable='between(t,A,B)'" -c:v copy -c:a aac -b:a 192k out.mp4`, which copies the video stream as is |
| Mute A to B | The same command with `volume=0` |

Images take the same filters, without `enable=` or `-map 0:a`:
- Blur an area with `ffmpeg -i in.jpg -filter_complex "[0:v]crop=W:H:X:Y,boxblur=luma_radius='min(w,h)/5':chroma_radius='min(cw,ch)/5':luma_power=2[b];[0:v][b]overlay=X:Y" in.cloudclip.jpg`.
- Crop with `-vf "crop=W:H:X:Y"`.
- Highlight with `drawbox`, as in the table.
