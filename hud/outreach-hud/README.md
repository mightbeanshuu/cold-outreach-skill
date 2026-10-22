# outreach-hud

A live side panel for the cold-outreach skill, drawn beside the Claude Code chat in Synapse's palette.
It refreshes every 3 seconds from the workspace (`$OUTREACH_WS`, default `~/Documents/cold-email`) and shows:

- today's new emails against your daily range, with the minimum marked on the bar;
- bounces against the kill switch;
- follow-ups sent today and FU1/FU2 due;
- the last 7 days (new and follow-ups, bounces);
- the newest round's pass / fail / reveal / apply counts and its top fail reason;
- all-time sends, bounce rate, replies and follow-ups.

It opens by itself when the cold-outreach skill loads, or with `/outreach`.

Run Claude Code with it loaded:

```sh
claude --plugin-dir ~/.claude/skills/cold-outreach/hud/outreach-hud
```

It docks beside the chat in the fullscreen terminal layout from 110 columns wide, and sits above the prompt on narrower windows.
It only reads files. Test: `claude plugin test hud/outreach-hud`.
