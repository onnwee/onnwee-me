---
title: Scroll-scrubbed video needs every frame as a keyframe
date: 2026-11-02
summary: Why scrubbing a video backwards stutters, and the one ffmpeg flag that fixes it.
tags: [video, ffmpeg]
sample: true
---

Browsers seek to the nearest keyframe and decode forward from there. A normal export has one keyframe every few seconds, so scrubbing backwards stutters.

Re-encode with a keyframe on every frame:

```sh
ffmpeg -i in.mp4 -c:v libx264 -g 1 -crf 22 -an out.mp4
```

The file gets larger, so keep scrubbed clips short and small.
