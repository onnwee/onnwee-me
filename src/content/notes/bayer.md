---
title: An 8×8 Bayer matrix in three lines of GLSL
date: 2026-09-30
summary: The ordered dither behind this site's background, built up from a 2×2 matrix.
tags: [graphics, glsl]
sample: true
---

The background on this site compares each pixel's brightness against a threshold from an ordered Bayer matrix. You can build the 8×8 matrix from the 2×2 one:

```glsl
float b2(vec2 a){ a = floor(a); return fract(dot(a, vec2(.5, a.y * .75))); }
float b4(vec2 a){ return b2(.5 * a) * .25 + b2(a); }
float b8(vec2 a){ return b4(.5 * a) * .25 + b2(a); }
```
