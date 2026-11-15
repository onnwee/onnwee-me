---
name: dither
summary: "The renderer behind this site. A WebGL shader for images and video, using ordered dithering and one accent color."
stack: WebGL2
state: part of this site
status: "8×8 bayer"
order: 1
repo: https://github.com/subculture-collective/dither
---

The stage draws everything in grays onto a hidden canvas, and one fragment shader turns that into black, white and a spot color through an 8×8 Bayer matrix. [How this site works](/colophon/) has the details.

Load your own photo or video from the first window on the home page to see it through the same shader. A version that stands on its own is planned; its repository is a placeholder for now.
