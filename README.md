# cold-outreach

A Claude Code skill that runs a careful cold-email job search for students and new grads, aimed at startups.

It's generic: everything about you lives in your own `profile.toml` and your own GitHub.

Each company goes through seven gates, cheapest first, and only companies that pass all of them get an email:

| Gate | Check |
|---|---|
| G1 Live role | 0-1 yr, posted in the last ~60 days, or a founder asking for engineers |
| G2 Company validation | scam signals (registry holds, no MX, pay-to-join, "for our client", copied JDs) and a funding class with evidence: YC / VC / angel / bootstrapped |
| G3 Pay bar | stipend or CTC at or above your bar, with a link; unknown pay only for YC/VC |
| G4 Contact | published site/JD → GitHub org, members, commits → ContactOut / SignalHire in your Chrome (opt-in, founders/CTOs only) |
| G5 Best-fit project | your own repos ranked against the company's stack |
| G6 Unrejectable pitch | an 8-point test: specific hook, best-fit proof, numbers, risk removed, one easy ask |
| G7 Tailored resume | one page per company, leading with the best-fit project, uploaded with a verified public link |

Then it sends from your **college Gmail** through Claude in Chrome, checks bounces against a kill switch, logs everything, triages replies and sends in-thread follow-ups.

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
- Python 3.11 or newer (the scripts use only the standard library), plus `curl`, `whois`, `dig`.
- The `gh` CLI, for contacts and for scanning your repos.
- Google Chrome (headless PDF rendering of tailored resumes) and `gcloud` with Drive access for uploading them.
- The Claude in Chrome extension connected to your browser, with your **college** Gmail signed in (and ContactOut / SignalHire, if you opt in).

## Use

Ready-to-paste prompts for setup, a full round, YC-only rounds, reveals, sending and follow-ups are in [PROMPTS.md](PROMPTS.md). Or talk to Claude normally, for example:
- "do a round on hiredoor, remote is fine"
- "send the drafts"
- "check bounces and replies"
- "send FU1s"

## What it won't do

- Guess addresses or SMTP-probe them.
- Email a company that failed validation, or send from a non-college address.
- Add anything to your resume or pitch that you didn't give it.
- Send above the daily cap or after the bounce kill switch trips.
- Type your passwords.
- Write the "in your own words" answers for you.

Your `profile.toml`, SEND-LOG and drafts live in your workspace, outside this repo.

## Layout

```
SKILL.md                      workflow + hard rules (loaded when the skill triggers)
PROMPTS.md                    copy-paste prompts for every stage
references/                   intake, targeting, validation, contacts, pitch, tailored-resume, sending-chrome,
                              followups, research-spec-template
scripts/                      check_company, github_projects, render_resume, upload_resume, mkurl, lint_email,
                              dedupe, log_sent, mark_outcome, stats, check_links, ats_scan, build_fu_queue, mkfu,
                              mkjs (+ js/ send, bounce scan, follow-up runner)
assets/                       profile.example.toml, SEND-LOG.header.csv
```
