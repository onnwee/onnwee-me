---
title: What your phone writes into a photo
date: 2026-10-19
summary: The device, time and place a phone records in every photo, and how to strip it.
tags: [privacy]
sample: true
---

A phone photo usually carries the device model, the lens, the time it was taken and, if location is on, GPS coordinates. Video files carry similar tags.

Check a file before you post it:

```sh
exiftool -a -G1 photo.jpg
```

Remove everything:

```sh
exiftool -all= photo.jpg
```
