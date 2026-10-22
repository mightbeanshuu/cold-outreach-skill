# cold-outreach

A Claude Code skill that runs a careful cold-email job search for students and new grads, aimed at startups.

It covers the whole loop:
1. Intake.
2. Research agents that find live roles with pay evidence.
3. Verified contacts only.
4. Tailored pitches, checked by a linter.
5. Sending from your own Gmail through Claude in Chrome.
6. Bounce checks with a kill switch.
7. Logging.
8. Reply triage and in-thread follow-ups.

## Install

```sh
git clone git@github.com:<you>/cold-outreach-skill.git ~/.claude/skills/cold-outreach
mkdir -p ~/Documents/cold-email
cp ~/.claude/skills/cold-outreach/assets/profile.example.toml ~/Documents/cold-email/profile.toml
cp ~/.claude/skills/cold-outreach/assets/SEND-LOG.header.csv ~/Documents/cold-email/SEND-LOG.csv
touch ~/Documents/cold-email/EXCLUDE.txt
```

Fill in `profile.toml`. `references/intake.md` explains every field. Or just tell Claude "set up cold outreach for me" and it will ask for what's missing.

You need:
- Python 3.11 or newer (the scripts use only the standard library).
- The `gh` CLI, for checking contacts against GitHub.
- The Claude in Chrome extension connected to your browser, with your sending Gmail signed in.

## Use

Talk to Claude normally, for example:
- "do a round on hiredoor, remote is fine"
- "send the drafts"
- "check bounces and replies"
- "send FU1s"

## What it won't do

- Guess addresses or SMTP-probe them.
- Send above the daily cap or after the bounce kill switch trips.
- Type your passwords.
- Write the "in your own words" answers for you.

Your `profile.toml`, SEND-LOG and drafts live in your workspace, outside this repo.

## Layout

```
SKILL.md                      workflow + hard rules (loaded when the skill triggers)
references/                   intake, targeting, contacts, pitch, sending-chrome, followups, research-spec-template
scripts/                      mkurl, lint_email, dedupe, log_sent, mark_outcome, stats, check_links, ats_scan,
                              build_fu_queue, mkfu, mkjs (+ js/ send, bounce scan, follow-up runner)
assets/                       profile.example.toml, SEND-LOG.header.csv
```
