# CloudClip ffmpeg recipes

Read this when you turn review comments into edits (step 6 of `SKILL.md`).

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
