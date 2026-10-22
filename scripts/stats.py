#!/usr/bin/env python3
"""Today's (or --date) send count, bounce rate vs the kill switch, cap left, and follow-ups due.
usage: stats.py [--date YYYY-MM-DD] [--workspace WS]"""
import datetime as dt, sys
from common import ws_arg, load_profile, read_log

ws, argv = ws_arg(sys.argv[1:])
d = argv[argv.index("--date") + 1] if "--date" in argv else dt.date.today().isoformat()
prof, rows = load_profile(ws), read_log(ws)
s = prof["sending"]
day = [r for r in rows if r["date_sent"] == d]
bounced = [r for r in day if "BOUNCE" in r["outcome"].upper() or "REJECT" in r["outcome"].upper()]
pct = 100 * len(bounced) / len(day) if day else 0.0
print(f"{d}: sent {len(day)}, bounced {len(bounced)} ({pct:.1f}%), cap left {max(0, s['daily_cap'] - len(day))}")
for r in bounced:
    print("   bounced:", r["company"], r["email"])
if pct > s["bounce_stop_pct"]:
    print(f"KILL SWITCH: {pct:.1f}% > {s['bounce_stop_pct']}%. Stop new cold sends today.")
allb = [r for r in rows if "BOUNCE" in r["outcome"].upper()]
print(f"all time: {len(rows)} sent, {len(allb)} bounced ({100*len(allb)/max(1,len(rows)):.1f}%), "
      f"{sum(1 for r in rows if r['reply'].strip())} with a reply")
for k, lab in (("followup1_due", "FU1"), ("followup2_due", "FU2")):
    due = [r for r in rows if r[k] and r[k] <= d and lab not in r["outcome"].upper()
           and not r["reply"].strip() and "BOUNCE" not in r["outcome"].upper()]
    print(f"{lab} due by {d}: {len(due)}")
