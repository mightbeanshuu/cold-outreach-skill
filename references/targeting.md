# Targeting: which companies and roles pass

## The bar (all four must hold; the values come from profile.toml)
1. **Company:** a genuine product startup that passes `targets.company_bar`, and not in `targets.exclude_company_types`.
   - For funding, look for YC on ycombinator.com/companies, or a VC round on Tracxn, Crunchbase, Inc42 or YourStory.
   - For staff count, use LinkedIn or the team page.
2. **Hiring now:** a live role matching `targets.role_types` and `targets.experience`, posted in the last ~60 days, or a founder post asking for engineers. Record the URL and the posted date. A role that requires 2+ years is a FAIL, even if the company is great.
3. **Pay evidence:**
   - Pass at a stipend of at least `pay.intern_stipend_min`, or a full-time / PPO offer of at least `pay.fulltime_min_lpa`, or the USD equivalent for remote roles.
   - Evidence sources: the job description, YC WaaS or Wellfound salary bands, Instahyre or Cutshort bands, Glassdoor or AmbitionBox intern stipends, LeetCode or Reddit comp posts.
   - With no evidence, write `PAY: UNKNOWN` and allow it only if `pay.unknown_pay_ok_if_funded` and the company is YC- or named-VC-backed. Otherwise it's a FAIL.
4. **Contact:** an address on the ladder in `contacts.md`.
   - If there's none, write the company to the TSV as `APPLY-LINK <url>` with no folder, so the user can apply on the portal.

## Sources, and what each is good for

| Source | How | Notes |
|---|---|---|
| hiredoor.com | Browse listings or scrape job pages | Job posts often contain a "send resume to" address. The best PUBLISHED-JD yield so far: 25 passes from one sweep. |
| YC Work at a Startup | workatastartup.com; the user must be logged in | Filter by India / remote and new grad / intern. Also check ycombinator.com/companies/<slug>/jobs. |
| Wellfound | wellfound.com/jobs | It shows salary bands, which are good pay evidence. |
| Instahyre, Cutshort | Search intern / SDE-1 | Their bands are pay evidence. |
| ATS public APIs | `python3 scripts/ats_scan.py slug1,slug2,...` | Lever, Greenhouse and Ashby. Fast for confirming live junior roles at a known list of companies. |
| Company careers pages | curl + grep | Most JS-heavy sites return nothing to curl. Use the browser or skip them. |
| GitHub orgs | `gh api search/users -f q="type:org location:<city> followers:>10"` | Mostly agencies and colleges, so filter hard. Useful for finding the org email. |
| LinkedIn "send your resume" posts | Search posts | Low value: mostly tiny or unpaid companies. |
| Funding news (Inc42, YourStory, Entrackr) | Recent seed / Series A | Funded but often no junior posting yet. Pitch a "6-month intern / new grad" role to the founder. |

## What earlier rounds taught (use it to set expectations)
- Strict bar (₹40k stipend and ₹12 LPA, YC / Seed-to-B only): one agent checked 40 companies and found 2 passes. The pool was effectively empty within a week.
- Loosened bar (₹25k or ₹8 LPA, any product startup, remote OK): a hiredoor sweep found 25 passes and a remote sweep 10.
- Funded Indian startups mostly post 2+ year roles. Their fresher hiring runs through campus drives, so the campus placement office is the better route there.
- Of 79 "speculative" emails to companies without a live posting, very few got replies. Emails tied to a live role did much better.
- Kill rule: 0 or 1 replies in 30 sends means change the targeting or the hook, not the volume.

## Dedupe (do it before writing a folder)
`python3 scripts/dedupe.py --email <addr> --company <slug-or-domain>` checks SEND-LOG and EXCLUDE.
- Never reuse an address.
- A company that's already in the log is OK only with a different verified person and a new pitch, in a folder named `<slug>-2`.
- Skip every slug folder already in any `rounds/*/` and every slug in `live_threads` / `never_contact`.
- Before sending to a company emailed weeks ago, also search Gmail Sent for `to:<domain>`. Early rows sometimes had blank dates.
