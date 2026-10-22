# Finding an address that delivers

Every TO line records its evidence:
`TO: <address>   (STATUS: <TYPE>, <source url or gh evidence>, <date seen>)`

## The ladder (best first)

| Status | What counts | Observed risk |
|---|---|---|
| `PUBLISHED-JD` | A job description, hiredoor, Wellfound or LinkedIn post saying "send your resume to X", with the URL | Low when the post is recent (under ~30 days). A *personal* address in an older post goes stale when that person leaves: two of these bounced in one round. |
| `PUBLISHED-SITE` | careers@ / hr@ / talent@ / hiring@, or a founder's address that literally appears on the live company site (home, /careers, /about, /contact, /team) | Low. careers@ and hr@ are safest. jobs@ and tech@ are often internal Google Groups that reject outside mail. |
| `PUBLISHED-PKG` | Author email on the company's own npm / PyPI / crates package | Low to medium |
| `GH-ORG` | `gh api orgs/<org> --jq .email` | Medium. Sometimes an unmonitored or dead inbox (dev@ bounced once). |
| `GH-MEMBER` | `gh api orgs/<org>/public_members`, then `gh api users/<login> --jq .email` | Medium. Often a personal Gmail, which is fine if it's public on their profile. |
| `COMMIT-VERIFIED` | `gh api -X GET search/commits -f q="author-email:<exact>"` shows commits **in the company's own org**, **within the last 6 months** (60 days is better), and the address is first-name or first.last style at the company domain | Medium. Commits don't prove the mailbox is alive. Git-only aliases like `name95xyz@` bounced. |

Not allowed:
- SMTP/RCPT probing.
- Guessing an address from the company's pattern. About half of the TA pattern guesses bounced.
- Addresses an LLM or chatbot listed. In one run, 39 of 40 were invented.
- Data-broker reveals, unless the user opted in under `tools.paid_contact_tools`. If they did, mark them `STATUS: PAID-REVEAL` and treat them as the riskiest tier, because their TA/HR hits bounced repeatedly.

## How to look

```sh
# 1. Site scrape (works for server-rendered sites; JS-heavy sites return nothing)
for p in "" careers about contact team jobs; do curl -sL -m 12 -A 'Mozilla/5.0' "https://$DOMAIN/$p"; done \
  | grep -Eio '[a-z0-9._%+-]+@'"${DOMAIN//./\\.}" | sort | uniq -c | sort -rn

# 2. GitHub org email, then public members
gh api orgs/$ORG --jq '.email, .blog'
gh api orgs/$ORG/public_members --jq '.[].login' | while read u; do gh api users/$u --jq '[.login,.name,.email]|@tsv'; done

# 3. Who commits from the company domain (gives people + convention + recency)
gh api "repos/$ORG/$REPO/commits?per_page=100" \
  --jq '.[] | [.commit.author.email, .commit.author.name, .commit.author.date] | @tsv' | grep "@$DOMAIN" | sort | uniq -c | sort -rn

# 4. Verify one exact address
gh api -X GET search/commits -f q="author-email:$EMAIL" --jq '.total_count, (.items[0:3][] | [.repository.full_name, .commit.author.date] | @tsv)'
```
The GitHub search API needs about 2.5 seconds between calls, or it hits its rate limit.

## Who to pick at a company
1. A founder or CTO at a company of 5 to 50 people. They read their own mail.
2. The engineering lead or hiring manager named on the job description.
3. careers@ or hr@ from the live site, which gets the no-jargon pitch.
4. TA or recruiters, last.

Contact **one person per company per round**. A second person is fine in a later round if they're a different verified person. Their email must not repeat the first pitch, and it should say so plainly ("I have also written to <name>; apologies if this reaches you twice"). Name the folder `<slug>-2`.

## When an address bounces
- Mark it in SEND-LOG with `scripts/mark_outcome.py` and add the slug to EXCLUDE.
- Look for a *published* alternative before trying again. An out-of-office or bounce message sometimes names the right person.
- Add the lesson to the round's TSV, for example "JD personal email, 4 months old, bounced", so the next spec can tighten the rule.
