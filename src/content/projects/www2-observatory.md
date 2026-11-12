---
name: www2-observatory
summary: "Reads one small site's existing access logs and shows who visits, how they found it and what they probe. It adds no script, cookie or pixel to the site, and keeps no raw IP addresses."
stack: Python, TypeScript, Go
state: private dashboard
status: "read-only"
order: 3
repo: https://github.com/subculture-collective/www2-observatory
---

The other half of Deadweb Relay. Visitors never send it a request: it only reads the logs the web server already writes.

The code is public. The dashboard is not.
