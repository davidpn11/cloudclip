# Changelog

## 0.3.0 (2026-11-24)

### Added
- Review HTML presentations, including decks that are one big file. The deck runs live in the review page, and each comment records the element under the mark so the agent can find it in the source.
- Review PowerPoint files (`.pptx`, `.ppt`). Each comment carries its slide number. This needs LibreOffice and poppler, which are not bundled: the agent offers to install them only when a PowerPoint review needs them.
- Review a folder of PNG slides, such as one exported from PowerPoint or Keynote.
- Server tests: `python3 -m unittest discover tests`.

### Security
- An HTML deck runs on its own port, so its scripts can't read or change your comments, end the review, or fetch the files next to the deck.

## 0.2.0 (2026-11-18)

### Added
- A **Finished** button that closes the review and returns to the agent.
- A **Copy** button on the Agent view JSON.

### Fixed
- The skill finds its own files when it is installed outside the plugin.

### Security
- The server checks the Host and Origin of each request.

## 0.1.0 (2026-10-26)

First packaged version: review a video or image in the browser, mark a moment or an area, and have the agent apply the comments with ffmpeg.
