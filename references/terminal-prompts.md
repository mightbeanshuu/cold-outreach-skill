# Asking the user: every question goes through the terminal

All questions in this skill are asked **inside Claude Code** with the `AskUserQuestion` tool, so the user answers in the terminal with arrow keys. Never ask them to edit files, run a wizard or open a web page to answer.

How to ask:
- Up to 4 questions per call, 2 to 4 options each. The recommended option goes first, with "(Recommended)" at the end of its label.
- The user can always pick "Other" and type. Use that for free-text facts (name, links, numbers) instead of a separate chat message.
- **Look before you ask.** Fill what you can from the conversation, memory, the existing profile.toml, the resume and their GitHub. Offer a found value as an option ("Use btech123@nitt.edu") rather than asking from scratch.
- Skip a question when the user's own message already answered it.
- After each call, write the answers into `<workspace>/profile.toml` straight away, so an interrupted setup isn't lost.
- Then print a short recap of what was saved.

---

## A. Setup (first run, or when a profile field is missing)

Run the prerequisites check first (SKILL.md, "Prerequisites"). Then ask these calls in order, skipping anything already known.

**Call A1: who's sending** (header in brackets)
1. [Sender] "Which college (B.Tech) Gmail should send the emails?" Options: found college address (Recommended) / "Type another college address". Reject personal domains (gmail.com, outlook.com and so on) and ask again.
2. [Grad year] "When do you graduate?" Options: the found year / the next two years.
3. [Resume] "Which resume should I start from?" Options: found Drive link (Recommended) / "I'll paste a public Drive link" / "I only have a PDF: build the HTML from it".
4. [GitHub] "Your GitHub profile?" Options: found profile (Recommended) / "Type it".

**Call A2: eligibility**
1. [Experience] "What experience range may JDs ask for?" **0-3 years (Recommended)**: catches startup "1-3 yrs" roles that still hire strong freshers / 0-1 only / 0-2 / 0-5.
2. [Start] "When can you start an internship?" Now (Recommended if enrolled) / Next semester / "Full-time only, after graduation".
3. [Duration] "Any limit on internship length?" No limit / 6 months max / 3 months max.
4. [Location] "Where can you work?" India + remote (Recommended) / Remote only / My city only / Anywhere incl. relocation abroad.

**Call A3: targets and pay**
1. [Roles] multiSelect: Backend / SDE · Full-stack · AI / ML · DevOps / infra / data.
2. [Funding] "Which companies may pass validation?" Any validated startup incl. bootstrapped (Recommended, most results) / YC or VC-funded only / YC only.
3. [Pay bar] "Minimum pay?" ₹25k stipend or ₹8 LPA (Recommended: past rounds found 25+ companies per agent at this bar) / ₹40k or ₹12 LPA (strict: 2 passes in 40 checked) / ₹15k or ₹6 LPA. Adjust the currency for non-India users.
4. [Unknown pay] "Email YC/VC-funded companies that don't publish pay?" Yes (Recommended) / No.

**Call A4: contacts and sending**
1. [Fallback] "When the site and GitHub show no address, use reveal tools in Chrome?" ContactOut + SignalHire (Recommended, if you're signed in to both) / SignalHire only / ContactOut only / Free routes only.
2. [Daily cap] "Max new cold emails a day?" 40 (Recommended) / 20 / 60.
3. [Follow-ups] "Follow-ups?" FU1 on day 4 + FU2 on day 11 (Recommended) / FU1 only / None.
4. [CGPA] "Share your CGPA when a recruiter asks?" Yes: type it under Other / No.

**Call A5: proof points (the most important input)**
Draft them yourself first from the resume, memory and GitHub (`github_projects.py --refresh`), then show the draft in the terminal:
- 3 to 5 achievement bullets: plain words, a number each.
- 3 to 6 project facts: what it is, one technical detail, one number.

Then ask:
1. [Bullets] "Are all these achievement bullets true and OK to quote?" Yes, use them (Recommended) / "Edit: I'll type corrections".
2. [Projects] "Are these project facts exact?" Yes / "Edit: I'll type corrections".

Never save a bullet the user didn't confirm.

**Call A6: Chrome accounts** (only after the prerequisites pass)
1. [Gmail tab] "Is your college Gmail signed in to the connected Chrome?" "Yes, it's signed in" / "Not yet: I'll sign in now". Then check the tab title yourself.
2. [Reveal login] Ask only if reveal tools were chosen: "Signed in to ContactOut / SignalHire in that Chrome?" Both / Only one / Not yet.
3. [YC WaaS] "Signed in to YC Work at a Startup? (more YC roles)" Yes / No, skip it.

---

## B. Round brief (start of every round)
Defined in SKILL.md Step 1: experience range, funding filter, pay bar, contact fallback. One call.

## C. Decision points inside a round

| When | Header | Question | Options (recommended first) |
|---|---|---|---|
| After research, before reveals | Reveals | "N companies need a revealed contact. Spend credits?" | Top N founders/CTOs only (Recommended) / All within budget / Skip reveals |
| After `review.py` | Send | "Send these N emails from <college address>?" | Send all 8/8 GREEN (Recommended) / Also send AMBER ones / Let me edit first / Hold all |
| A draft needs the user's words | Essay | "<Company> asks '<question>'. How do you want to answer?" | "I'll type it" / Skip this company |
| Tailored resumes ready | Resumes | "Upload N tailored resumes to Drive as public links?" | Yes (Recommended) / Use my standard resume links instead |
| Kill switch trips | Bounces | "Bounce rate is X% (limit Y%). What now?" | Stop new sends today (Recommended) / Continue with published addresses only |
| Reply needs a call | Reply | "<Name> at <Co> wants a call: <times>. What should I do?" | "I'll book it: draft a reply with my slot" / Ask for other times |
| Reply below pay bar or unpaid | Reply | "<Co> offers <pay>, below your bar. Reply?" | Politely decline / Ask about PPO or pay / Ignore |
| Follow-ups due | FU | "N follow-ups are due. Send?" | Dry-run 2, then send the rest (Recommended) / Show me the list first / Not today |
| Bar or filter changed | Save | "Save <change> to your profile or this round only?" | This round only (Recommended) / Save to profile |

## D. Showing everything in the terminal
Ask nothing that the user can't judge from what's on screen. Before each decision, print what it's about:
- After each research agent finishes: `PASS n · FAIL n (top reasons) · NEED-REVEAL n · APPLY-LINK n`.
- Before the Send question: the output of `python3 scripts/review.py <round_dir>` and, if they ask, `--full` for every draft's subject and body.
- After each send batch: each recipient with ✓ sent or ✗ and the reason, then the day's totals from `stats.py`.
- End of session: the report in SKILL.md "Report format".
