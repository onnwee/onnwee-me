---
name: headcount
summary: "Follows Twitch's top 200 channels and scores each stream, from 0 to 100, for the patterns that view-bots, follow-bots and chat-bots leave. A high score is a pattern, not proof."
stack: Go
state: live, scores provisional
status: "top 200"
order: 4
repo: https://github.com/subculture-collective/headcount
url: https://headcount.subcult.tv/
---

It samples viewers, followers and chat once a channel reaches the top 200, and scores each stream when it ends. Collection began in October 2026 and the detector's weights are set by hand, so the numbers still move.
