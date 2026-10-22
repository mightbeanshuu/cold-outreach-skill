---
name: cold-outreach
description: End-to-end cold-email job outreach to startups for a student or new grad. Covers intake (resume links, GitHub, proof points, pay bar, target roles), research agents that find live roles with pay evidence and verified contacts, tailored pitch drafting and lint, sending from the user's own Gmail through Claude in Chrome, bounce checks with a kill switch, SEND-LOG/EXCLUDE logging, reply triage and in-thread follow-ups. Use this whenever the user asks to cold mail / email startups or founders, "mine hiredoor / YC / wellfound and send", "do another round", "send the held ones", "send follow-ups / FU1 / FU2", "check bounces or replies", "continue mailing", or sets up outreach for a new person, even if they never say "skill" or "pipeline".
---

# Cold outreach pipeline

A round goes: **intake → round spec → research → review → send → verify → log → replies → follow-ups.**
Each step has a reference file. Read the reference when you reach that step, not before.

The goal is interviews, not volume. Over many rounds the replies came from emails that had all three of these:
1. A real, live role with pay that meets the bar.
2. An address that actually delivers.
3. One line only someone who looked at the company could write.

Most rules below protect one of those three, or protect the user's sending account.

## Where things live

```
<workspace>/                    # from profile.toml [workspace].path, default ~/Documents/cold-email
  profile.toml                  # the user's facts and preferences (never committed to the skill repo)
  SEND-LOG.csv                  # one row per email sent; the source of truth for dedupe and follow-ups
  EXCLUDE.txt                   # one company slug per line; already contacted or ruled out
  rounds/<YYYY-MM-DD>-<name>/
    SPEC.md                     # the brief the research agents work from
    _research_<agent>.tsv       # one line per company checked, PASS or FAIL + reason
    <slug>/email.txt            # one folder per PASS company
    <slug>/compose_url.txt
  followups/<YYYY-MM-DD>/queue.json, results.jsonl
```

Scripts are in `scripts/` next to this file. They use only the Python standard library and read `profile.toml`.
Pass `--workspace` or set `OUTREACH_WS` if the workspace isn't the default.

## Step 0: Intake (first run, or when profile.toml is missing or stale)

Read `references/intake.md`. It lists every input, why each matters and how to check it.
Copy `assets/profile.example.toml` to `<workspace>/profile.toml` and fill it from the user's answers and from what is already in the conversation or memory.
Ask only for what you can't find. A single message with the missing items works better than a long interview.

Check these before any research:
- Each resume link opens for a logged-out visitor: `python3 scripts/check_links.py`.
- The GitHub profile exists.
- Claude in Chrome is connected to the user's own browser, and the sending Gmail account is signed in there.

Every proof point in the profile must come from the user or a document they gave you. Never invent achievements, numbers or "I have also applied" lines. A fabricated claim that a founder checks ends the conversation.

## Hard rules

These come from real failures. Each has its reason, so you can judge the edge cases.

- **Contacts must be published or verified.** That means published on the company site, in a job description, on a team page, as a GitHub org email, or a commit-verified address (see `references/contacts.md`).
  - No SMTP/RCPT probing.
  - No guessing first.last@ patterns.
  - No addresses an LLM produced.

  Why: guessed and stale addresses bounce. Above roughly 3% bounces, Gmail starts throttling the account the user needs for everything else. One LLM run invented 39 of 40 "careers@" addresses.
- **Kill switch.** Stop new cold sends for the day if:
  - the day's bounce rate goes over `sending.bounce_stop_pct`, or
  - Gmail shows any "unusual activity", limit, or warning banner, or
  - spam complaints appear.

  Tell the user. Resume the next day at lower volume with the safest contact types only.
- **Daily cap.** Send at most `sending.daily_cap` new cold emails a day (default 40). Follow-ups in existing threads are separate, but they also go in batches.
- **The user decides to send.** Draft and queue freely. Send once the user has said go for this batch, either in this request or by replying to your summary.

  If a permission prompt or the auto-mode safety classifier denies a send, stop. Tell the user what's queued and ask them to approve it or exit auto mode. Never route around a denial.
- **The user's own browser and accounts only.**
  - Never type passwords or OTPs, and never create accounts. The user signs in.
  - Check `list_connected_browsers` each session. The extension has reconnected to someone else's machine before.
- **Startups only.** No big tech, MNC campus inboxes, quant/HFT, IT services or agencies, staffing firms, or pay-to-intern outfits, unless the user names one. Those companies don't read cold mail. Reach them through referrals and portals.
- **Respect the lists.** Skip every company in `targets.never_contact` and `targets.live_threads`, and every company with a reply in progress. Never reuse an address already in SEND-LOG.
- **The user's own words where asked.** If a form or job description asks for an essay, a "hardest bug", or anything "in your own words", leave a placeholder and hand that part to the user.

## Step 1: Start a round

1. Create `rounds/<date>-<name>/`.
2. Write `SPEC.md` from `references/research-spec-template.md`. Fill it from `profile.toml` and apply the user's overrides for this round, such as "loosen it", "remote is fine" or "only YC". Write the overrides into the spec with the user's words quoted, so later rounds can see why the bar moved.

If the last round's yield was tiny, say so and suggest which part of the bar to loosen. `references/targeting.md` has the yield history and the sources that still have stock.

## Step 2: Research

Use at most `tools.max_agents` agents (default 2), split by source. For example, one on hiredoor and Wellfound, one on YC WaaS, ATS boards and company sites. The prompt template is in `references/research-spec-template.md`.

Agents only research and write files. They never open Gmail. Each one writes a PASS folder and its TSV line as soon as a company passes, so work survives a rate limit or crash. Agents also stop at the cap in the spec.

## Step 3: Review the drafts

For each PASS folder:

1. Run `python3 scripts/lint_email.py <round_dir>`. It checks:
   - the format, word count, banned phrases, em dashes and placeholders;
   - that a resume link and the signature are present;
   - that the address is not already in SEND-LOG.
2. Read every hook sentence and check it against its source. Agents sometimes overstate, for example "your PR" when it was an issue.
3. Match the format to the recipient (see `references/pitch.md`):
   - HR, TA and careers@ inboxes get the no-jargon achievements version.
   - Founders, CTOs and engineers can get one technical detail.
4. Run `python3 scripts/mkurl.py <round_dir>` to write each `compose_url.txt`.

Then show the user a short table: company, recipient and status, role, pay evidence, and anything held with the reason.
Also list the APPLY-LINK companies, where there is no contact and the user should apply on the portal.

## Step 4: Send

Follow `references/sending-chrome.md` exactly: account check, compose deeplink, guarded send JS, toast check, then discard the refilled compose.
`python3 scripts/mkjs.py send <email>` prints the send JS for one recipient.
Send in groups of about 4 per browser call. Never re-send after a timeout or missing toast until you have checked the Sent folder for that recipient.

## Step 5: Verify and check bounces

About 10 to 30 minutes after a batch, search the mailer-daemon messages and match each bounce to a recipient (`references/sending-chrome.md`, "Bounce check").
Run `python3 scripts/stats.py` to get the day's sent count and bounce rate against the kill switch.

## Step 6: Log

1. Run `python3 scripts/log_sent.py <round_dir> <slug> ...` right after each confirmed send. It appends to SEND-LOG with the follow-up due dates and adds the slug to EXCLUDE.
2. Run `python3 scripts/mark_outcome.py <email> "BOUNCED <date> (address not found)"` for bounces.

Save a one-line state note to memory, or tell the user, so the next session can resume.

## Step 7: Replies

Triage new replies by type (`references/followups.md`, "Reply triage"):
- **Asks for a resume, CGPA or details:** answer from the profile, in-thread.
- **Wants a call:** the user books it. Give them the link and the times.
- **Unpaid or below the bar:** ask the user.
- **Not hiring:** log the outcome.
- **Out of office:** note the return date and any other contact they gave.

Update the reply column in SEND-LOG.

## Step 8: Follow-ups

Send FU1 about `followup.fu1_after_days` days after the first email, and FU2 about `followup.fu2_after_days` days after.
Both go **in the same thread**, to named people who haven't replied.

1. `python3 scripts/build_fu_queue.py --stage fu1 --due <date>` builds the queue. It skips bounces, replies and generic inboxes.
2. `python3 scripts/mkfu.py dry|send <queue> A B` prints the in-page runner for items A to B. It re-checks each thread live before sending.
3. Always dry-run 2 items first.

The details are in `references/followups.md`.

## Report format

End each work session with a short report:
- sent today (new and follow-ups), delivered, bounced and the bounce %;
- replies, and what each needs;
- what's waiting on the user (calls to book, essays, apply-links, decisions);
- the next due dates.

Keep it short, and put names and numbers first.
