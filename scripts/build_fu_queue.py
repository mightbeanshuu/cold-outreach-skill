#!/usr/bin/env python3
"""Build a follow-up queue from SEND-LOG.
usage: build_fu_queue.py --stage fu1|fu2 [--due YYYY-MM-DD] [--window DAYS] [--include-generic] [--workspace WS]
--window (default 10): only rows whose due date is within DAYS before --due; older misses need a human look.
Writes <ws>/followups/<today>-<stage>/queue.json and prints what was skipped and why."""
import datetime as dt, json, re, sys
from collections import Counter
from common import ws_arg, load_profile, read_log, is_generic

ws, argv = ws_arg(sys.argv[1:])
if "--stage" not in argv:
    sys.exit(__doc__)
stage = argv[argv.index("--stage") + 1].lower()
due = argv[argv.index("--due") + 1] if "--due" in argv else dt.date.today().isoformat()
prof, rows = load_profile(ws), read_log(ws)
skip_generic = prof["followup"].get("skip_generic_inboxes", True) and "--include-generic" not in argv
live = {x.lower() for x in prof["targets"].get("live_threads", []) + prof["targets"].get("never_contact", [])}
col = "followup1_due" if stage == "fu1" else "followup2_due"
win = int(argv[argv.index("--window") + 1]) if "--window" in argv else 10
floor = (dt.date.fromisoformat(due) - dt.timedelta(days=win)).isoformat()
queue, why, seen = [], Counter(), set()
for r in rows:
    o, em = r["outcome"].upper(), r["email"].strip().lower()
    if not r[col] or r[col] > due: continue
    if r[col] < floor: why[f"due before {floor} (outside window)"] += 1; continue
    if em in seen: why["duplicate address"] += 1; continue
    if "BOUNCE" in o or "REJECT" in o: why["bounced"] += 1; continue
    if r["reply"].strip(): why["has reply"] += 1; continue
    if any(r["company"].lower().startswith(x) for x in live): why["live/never list"] += 1; continue
    if stage.upper() in o: why["already sent this stage"] += 1; continue
    if stage == "fu2" and "FU1" not in o: why["no FU1 yet"] += 1; continue
    if skip_generic and is_generic(em): why["generic inbox"] += 1; continue
    m = re.match(r"(?:Re:\s*)?Application for (.+?) \|", r["subject"])
    role = m.group(1) if m else "role I wrote about"
    queue.append({"slug": r["company"], "to": em, "subject": r["subject"], "role": role, "sent": r["date_sent"]})
    seen.add(em)
out = ws / "followups" / f"{dt.date.today().isoformat()}-{stage}"
out.mkdir(parents=True, exist_ok=True)
(out / "queue.json").write_text(json.dumps(queue, indent=1))
print(f"{len(queue)} queued -> {out/'queue.json'}")
for k, v in why.most_common():
    print(f"  skipped {v:4}  {k}")
