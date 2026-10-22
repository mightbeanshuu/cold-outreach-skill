# Research spec template

Write `rounds/<date>-<name>/SPEC.md` from this template, filling every `{...}` from profile.toml. Quote the user's words for any override. Then give each agent the prompt at the bottom.

---

```markdown
# Round {name} ({date})

User's ask for this round: "{verbatim words}"

## Target bar (ALL must hold)
1. Company: {targets.company_bar}. Excluded: {targets.exclude_company_types}.
2. Hiring now: live role in {targets.role_types}; experience {targets.experience}; posted within ~60 days. Locations: {targets.locations}.
3. Pay: stipend >= {pay.intern_stipend_min} {pay.currency}/month OR full-time/PPO >= {pay.fulltime_min_lpa} LPA (or USD remote equivalent).
   Record evidence + URL. PAY: UNKNOWN allowed only for YC / named-VC-backed companies (record the funding evidence){if not unknown_pay_ok_if_funded: " — not allowed this round"}.
4. Contact: published or verified ONLY, per the ladder: PUBLISHED-JD, PUBLISHED-SITE, PUBLISHED-PKG, GH-ORG, GH-MEMBER, COMMIT-VERIFIED
   (own org, last 6 months, first-name or first.last style). Never guess patterns, never SMTP-probe, never use LLM-listed or data-broker addresses{paid tools note}.
   Prefer founder/CTO/eng lead; jobs@/tech@ may be internal groups, prefer careers@/hr@ or named people.
   No contact found → TSV line `APPLY-LINK <url>`, no folder.
5. Dedupe: skip any address in {workspace}/SEND-LOG.csv; any company slug in {workspace}/EXCLUDE.txt or any rounds/*/<slug> folder;
   never_contact {targets.never_contact}; live threads {targets.live_threads}. A company already in SEND-LOG is allowed only with a DIFFERENT verified person and a new pitch, folder `<slug>-2`.
   Check before writing; never overwrite another agent's folder.

## Output
PASS → `{round_dir}/<slug>/email.txt` in exactly the format of references/pitch.md (TO with STATUS + evidence, PAY, ROLE, TIER, RESUME, SUBJECT, BODY).
Every company checked → one line appended to `{round_dir}/_research_<agent>.tsv`:
`slug<TAB>company<TAB>funding<TAB>pay evidence<TAB>contact + status<TAB>PASS | FAIL <reason> | APPLY-LINK <url>`
Write each folder and TSV line as soon as it's decided.

## Pitch
{word_min}-{word_max} words, format and rules in references/pitch.md.
Intro: "I'm {name}, {intro}, writing about the <Role> role."
Hook: ONE specific, checkable line about their product/repo/JD tied to one project fact below.
Achievement bullets (pick 2-4): {hr_bullets}
Project facts you may cite (ONLY these, verbatim facts): {eng_facts}
TIER ta → no jargon. Ask: "{pitch.ask} {identity.availability}"
Tail: Resume: <link from RESUME variant: {resumes}> / GitHub: {links.github} / signature.

## Rules
Research and write files only. Do NOT open Gmail or send anything. Stop at {cap} PASS folders (your own) or when sources run dry.
Final message: PASS list (slug, company, to, status, role, pay) + APPLY-LINK list + any lessons (dead sources, bounced-looking contacts).
```

---

## Agent prompt (one per source split)

> You are a research agent for a cold-outreach round. Read `{round_dir}/SPEC.md` and follow it exactly. Your agent name is `{agent}`; your sources are: {sources}. Use web search/fetch, `curl`, and `gh` for contact verification. Write PASS folders and TSV lines incrementally. Do not open Gmail, do not send anything, do not use paid contact tools{unless opted in}. Stop at {cap} PASS.

Good source splits for 2 agents: (a) hiredoor + Wellfound + Instahyre/Cutshort, (b) YC WaaS/companies pages + ATS APIs (`scripts/ats_scan.py`) + recent funding news + company sites.
