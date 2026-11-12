---
title: Running a pastebin that cannot remember you
date: 2026-09-12
summary: A paste service with no access log and nowhere to store an IP address.
tags: [privacy, projects]
sample: true
---

ghostpaste keeps each paste for 24 hours, then a scheduled job deletes it. The web server writes no access log, and the database has no column for an IP address.
