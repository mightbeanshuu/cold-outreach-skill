#!/usr/bin/env python3
"""Print a round's review in the terminal: gate results, one row per draft, lint status, and (with --full)
every draft's subject and body. Run it before asking the user to approve a send.
usage: review.py <round_dir> [--full] [--workspace WS]"""
import collections, csv, re, subprocess, sys
from pathlib import Path
from common import ws_arg, load_profile, parse_email, email_files

ws, argv = ws_arg(sys.argv[1:])
if not argv:
    sys.exit(__doc__)
rd = Path(argv[0])
prof = load_profile(ws)
full = "--full" in argv

# Gate outcomes from the research TSVs
outcome, reasons = collections.Counter(), collections.Counter()
for t in rd.glob("_research_*.tsv"):
    for row in csv.reader(t.open(), delimiter="\t"):
        last = next((c for c in reversed(row) if c.strip()), "")
        if "NEED-REVEAL" in row:
            outcome["NEED-REVEAL"] += 1
        elif last.startswith("PASS"):
            outcome["PASS"] += 1
        elif last.startswith("APPLY-LINK"):
            outcome["APPLY-LINK"] += 1
        elif last.startswith("FAIL"):
            outcome["FAIL"] += 1
            g = re.match(r"FAIL\s+(G\d)?\s*(.*)", last)
            reasons[(g.group(1) or "") + " " + (g.group(2) or "")[:40]] += 1
print(f"Round {rd.name}  ·  sender {prof['sending']['gmail_address']}")
print("Research: " + " · ".join(f"{k} {v}" for k, v in outcome.items()) if outcome else "Research: no TSVs yet")
for r, n in reasons.most_common(5):
    print(f"  FAIL x{n}: {r.strip()}")

# Lint status per draft
lint = {}
r = subprocess.run([sys.executable, str(Path(__file__).parent / "lint_email.py"), str(rd), "--workspace", str(ws)],
                   capture_output=True, text=True)
for line in r.stdout.splitlines():
    m = re.match(r"(ok|WARN|FAIL)\s+(\S+)\s+\S+\s+\d+w\s*(.*)", line)
    if m:
        lint[m.group(2)] = (m.group(1), m.group(3))
    elif line.startswith("FAIL sender"):
        print("  " + line)


def short(s, n):
    s = re.sub(r"\s+", " ", s or "").strip()
    return s if len(s) <= n else s[:n - 1] + "…"


rows = []
for f in email_files(rd):
    e = parse_email(f)
    h = e["headers"]
    comp = h.get("COMPANY", "")
    verdict = (re.search(r"\b(GREEN|AMBER|RED)\b", comp) or [None, "?"])[1] if comp else "?"
    status = re.search(r"STATUS:\s*([A-Z-]+)", h.get("TO", ""))
    tag, why = lint.get(f.parent.name, ("?", ""))
    rows.append([f.parent.name, comp.split("|")[0].strip() or "?", verdict, e["to"], status.group(1) if status else "?",
                 short(e["role"], 24), short(e["pay"], 26), short(h.get("FIT", "").split("->")[0], 16),
                 "tailored" if e["resume"].startswith("tailored") else short(e["resume"], 8), tag, short(why, 50)])

hdr = ["slug", "funding", "verdict", "to", "status", "role", "pay", "fit", "resume", "lint", "notes"]
if rows:
    w = [max(len(str(x[i])) for x in rows + [hdr]) for i in range(len(hdr))]
    print()
    print("  ".join(h.ljust(w[i]) for i, h in enumerate(hdr)))
    print("  ".join("-" * w[i] for i in range(len(hdr))))
    for x in rows:
        print("  ".join(str(c).ljust(w[i]) for i, c in enumerate(x)))
ready = sum(1 for x in rows if x[9] in ("ok", "WARN") and x[2] == "GREEN")
print(f"\n{len(rows)} drafts · {ready} ready (lint ok + GREEN) · "
      f"{sum(1 for x in rows if x[2] == 'AMBER')} AMBER · {sum(1 for x in rows if x[9] == 'FAIL')} blocked by lint")

for t in rd.glob("_research_*.tsv"):
    links = [row for row in csv.reader(t.open(), delimiter="\t") if any(c.startswith("APPLY-LINK") for c in row)]
    for row in links:
        print(f"  apply on portal: {row[1] if len(row) > 1 else row[0]}  {next(c for c in row if c.startswith('APPLY-LINK'))[11:]}")

if full:
    for f in email_files(rd):
        e = parse_email(f)
        print(f"\n{'=' * 70}\n{f.parent.name}  →  {e['to']}\nSubject: {e['subject']}\n{'-' * 70}\n{e['body']}")
