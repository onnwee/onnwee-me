---
name: arkhiv
summary: "An archive engine for scanned print. It fetches chosen documents, keeps the original files with their hashes, and serves a catalog with search, an on-site reader and downloads."
stack: Go, PostgreSQL, React
state: running three archives
status: "originals kept"
order: 11
downstream:
  - name: Anarchist Archive
    summary: Zines and pamphlets on mutual aid, abolition, ecology, work and anarchist thought.
    url: https://anarchist-archive.subcult.tv
    repo: https://github.com/subculture-collective/arkhiv-anarchist
  - name: Riot Grrrl Zine Archive
    summary: "Girl Germs, VOOP, Drop Babies and other feminist punk zines, each with its original scan."
    url: https://riot-grrrl.subcult.tv/
    repo: https://github.com/subculture-collective/arkhiv-riot-grrrl
  - name: Chicago Labor Archive
    summary: A reading room for the labor and radical press of Chicago and the Calumet region, with text search.
    url: https://cla.subcult.tv/
    repo: https://github.com/subculture-collective/chicago-labor-archive
---

Every document keeps its original file, where it came from and a note on rights. Nothing new is published until someone has reviewed it. The operator's side is a command-line tool that acquires files in batches that can be resumed, extracts text and covers, and backs up and restores the catalog.

The engine's own repository is private. The archives built on it are public, and the rights to the documents they hold are mostly unknown: none of them grants a licence to reuse the documents.
