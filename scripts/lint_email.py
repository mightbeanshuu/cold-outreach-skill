#!/usr/bin/env python3
"""Check drafts before sending. Exit 1 if any FAIL.
usage: lint_email.py <round_dir | email.txt> [--workspace WS]"""
import re, sys
from common import ws_arg, load_profile, parse_email, email_files, read_log, excluded, is_generic

ws, argv = ws_arg(sys.argv[1:])
if not argv:
    sys.exit(__doc__)
prof = load_profile(ws)
pitch, ident, links = prof["pitch"], prof["identity"], prof["links"]
resumes = {k: v for k, v in prof.get("resumes", {}).items() if v}
sent = {r["email"].strip().lower() for r in read_log(ws) if r.get("email")}
excl = excluded(ws)
allowed_status = {"PUBLISHED-JD", "PUBLISHED-SITE", "PUBLISHED-PKG", "GH-ORG", "GH-MEMBER", "COMMIT-VERIFIED",
                  "PUBLISHED", "PAID-REVEAL"}
bad = 0
for f in email_files(argv[0]):
    e = parse_email(f)
    fails, warns = [], []
    body, slug = e["body"], f.parent.name
    words = len(body.split("Resume:")[0].split())
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[a-z]{2,}", e["to"] or "", re.I): fails.append(f"bad TO {e['to']!r}")
    if e["to"].lower() in sent: fails.append("address already in SEND-LOG")
    if slug.lower() in excl: warns.append("slug is in EXCLUDE.txt (ok only for a -2 second contact)")
    if e["status"] not in allowed_status: fails.append(f"TO has no allowed STATUS ({e['status'] or 'none'})")
    if e["status"] == "PAID-REVEAL":
        if not prof.get("tools", {}).get("paid_contact_tools"): fails.append("paid-reveal address but paid tools not opted in")
        else: warns.append("paid-reveal address: highest bounce risk")
    if not e["subject"]: fails.append("no SUBJECT")
    if not (pitch["word_min"] - 15 <= words <= pitch["word_max"] + 20):
        (fails if not (pitch["word_min"] - 30 <= words <= pitch["word_max"] + 40) else warns).append(f"{words} words")
    for b in pitch.get("banned", []):
        if b.lower() in body.lower(): fails.append(f"banned phrase {b!r}")
    if re.search(r"[{<]\s*(first|name|role|company|link|resume|todo|tbd)\b[^}>]*[}>]|XXXX|TODO|TBD", body, re.I):
        fails.append("unfilled placeholder")
    if not re.search(r"^Resume:\s*https?://\S+", body, re.M): fails.append("no 'Resume: <link>' line")
    elif resumes and not any(v.split("?")[0] in body for v in resumes.values()):
        fails.append("resume link is not one of profile [resumes]")
    if links.get("github") and links["github"] not in body: warns.append("GitHub link missing")
    if ident["name"] not in body.split("Resume:")[-1]: fails.append("signature missing name")
    if not re.match(r"\s*(Hi|Hello|Dear)\b", body): warns.append("no greeting")
    if e["tier"] == "ta" and re.search(r"\b(Lua|Redis|gRPC|Kubernetes|Helm|operator|sharding|HMAC|eBPF|goroutine)\b", body):
        warns.append("TA/HR email contains jargon")
    if is_generic(e["to"]) and e["tier"] in ("founder", "eng"): warns.append("generic inbox but TIER is founder/eng")
    if re.search(r"\bI have (also )?applied\b", body, re.I): warns.append("claims an application: confirm it happened")
    if len(body) > 1800: warns.append(f"body {len(body)} chars (keep < 1800)")
    tag = "FAIL" if fails else ("WARN" if warns else "ok")
    bad += bool(fails)
    print(f"{tag:4} {slug:28} {e['to']:38} {words:3}w  " + "; ".join(fails + warns))
sys.exit(1 if bad else 0)
