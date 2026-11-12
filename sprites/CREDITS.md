# Sprite sources

Images were cropped, converted to grayscale and contrast-adjusted for the dither. `gas-mask.webp` and `capture.webp` are built from the edited masters in `../onnwee-assets/sources` with `pnpm sprites`.

| File | Work | Source |
|---|---|---|
| `skull-photo.webp` | Skull, 17th-century carved miniature. Public domain | The Met, https://www.metmuseum.org/art/collection/search/207770 |
| `gas-mask.webp` | American soldier in a gas mask, 1918 (detail of 111-SC-4051), cut out by the site owner, with filter canisters added in place of the breathing hose. The 1918 photo is public domain; the source of the canisters is not recorded here | US National Archives, via https://commons.wikimedia.org/wiki/File:Center_face_detail,_111-SC-4051_-_American_soldiers_equipped_with_latest_type_gas_mask._-_NARA_-_55169506_(cropped)_(cropped)_(cropped).jpg |
| `capture.webp` | Portrait photo by Björn Pierre (`OI_Nu0TQPAw`), cut out by the site owner; face-recognition overlay and slipped bands added by `scripts/build-sprites.mjs` | Unsplash, Unsplash License, https://unsplash.com/photos/OI_Nu0TQPAw |
| `bertillon-card.webp` | Alphonse Bertillon's own police identification card, 1912 (the two photographs). CC0 | https://commons.wikimedia.org/wiki/File:Bertillon,_Alphonse,_fiche_anthropom%C3%A9trique_recto-verso_-_crop.jpg |
| `bertillon-chart.webp` | *Signalement anthropométrique*, Bertillon's chart of body measurements. Public domain | https://commons.wikimedia.org/wiki/File:Bertillon_-_Signalement_Anthropometrique.png |
| `panopticon.webp` | Jeremy Bentham's Panopticon prison, plan and section, drawn by Willey Reveley in 1791, published 1843. Public domain | https://commons.wikimedia.org/wiki/File:Panopticon.jpg |
| `catrina.webp` | José Guadalupe Posada, *La Calavera Catrina*, 1913. Public domain | https://commons.wikimedia.org/wiki/File:La_Calavera_Catrina_J_Guadalupe_Posada.jpg |
| `vesalius.webp` | Skeleton contemplating a skull, from Vesalius, *De humani corporis fabrica*, 1543. Public domain | https://commons.wikimedia.org/wiki/File:Vesalius_164frc.png |
| `../media/cemetery.mp4` | *Night of the Living Dead* (George A. Romero, 1968), five shots of Barbra at the headstone in the cemetery scene (between 6:45 and 7:17 in this copy), joined into 9 seconds, greyscale and brightened so her face reads through the dither. Public domain | Internet Archive, https://archive.org/details/night-of-the-living-dead_202309 |
| `../og.png` | Link preview: a capture of this site's hero | Made for this site |

The face, the hooded pixel skull, the headstones and the cameras are drawn in code in `src/scripts/face.ts` and `src/scripts/sprites.ts`.

The engravings were inverted to white lines on black, and the black made transparent. Licences are as Wikimedia Commons stated them on 11 November 2026.

## Channel-surf clips

`../media/flare.mp4`, `crowd.mp4`, `patrol-lights.mp4`, `fire.mp4`, `radar.mp4` and `tv-wall.mp4` were cut from stock footage (448x252, 12 fps, greyscale, every frame a keyframe). The source file names follow the download patterns of Pixabay and Pexels, whose licences allow free use and editing. That was not checked against each clip's page: check before the site goes public. The source file for each clip is listed in `onnwee-assets/sources/CREDITS.md`.
