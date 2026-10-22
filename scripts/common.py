"""Shared helpers: profile loading, workspace paths, email.txt parsing, SEND-LOG access. Stdlib only."""
import csv, os, re, sys, tomllib
from pathlib import Path

LOG_FIELDS = ["date_sent", "company", "person", "email", "subject",
              "followup1_due", "followup2_due", "reply", "outcome"]
GENERIC_LOCAL = re.compile(r"^(careers?|jobs?|hr|hiring|talent|recruit\w*|hello|hi|hey|info|contact|team|work|people\w*|"
                           r"founders?|ceo|support|admin|humans?|joinus|namaste|corp|engineering|tech)(\+.*)?$", re.I)


def workspace(arg=None):
    p = arg or os.environ.get("OUTREACH_WS") or "~/Documents/cold-email"
    return Path(os.path.expanduser(p))


def load_profile(ws):
    f = ws / "profile.toml"
    if not f.exists():
        sys.exit(f"no profile at {f}: copy assets/profile.example.toml there and fill it (see references/intake.md)")
    with open(f, "rb") as fh:
        return tomllib.load(fh)


def ws_arg(argv):
    """Pop --workspace X from argv; return (workspace Path, remaining argv)."""
    argv = list(argv)
    if "--workspace" in argv:
        i = argv.index("--workspace")
        w = argv[i + 1]
        del argv[i:i + 2]
        return workspace(w), argv
    return workspace(), argv


def parse_email(path):
    t = Path(path).read_text()
    if "BODY:" not in t:
        raise ValueError(f"{path}: no BODY: line")
    head, body = t.split("BODY:", 1)
    h = {}
    for line in head.splitlines():
        m = re.match(r"^([A-Z]+):\s*(.*)$", line)
        if m:
            h[m.group(1)] = m.group(2).strip()
    to = (h.get("TO") or "").split()[0] if h.get("TO") else ""
    status = re.search(r"STATUS:\s*([A-Z-]+)", h.get("TO", ""))
    return {"to": to, "status": status.group(1) if status else "", "subject": h.get("SUBJECT", ""),
            "role": (h.get("ROLE", "").split("|")[0]).strip(), "tier": h.get("TIER", ""),
            "resume": h.get("RESUME", ""), "pay": h.get("PAY", ""), "headers": h, "body": body.strip("\n")}


def email_files(target):
    p = Path(target)
    if p.is_file():
        return [p]
    return sorted(x for x in p.glob("*/email.txt"))


def read_log(ws):
    f = ws / "SEND-LOG.csv"
    if not f.exists():
        return []
    with open(f, newline="") as fh:
        return list(csv.DictReader(fh))


def write_log(ws, rows):
    f = ws / "SEND-LOG.csv"
    with open(f, "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=LOG_FIELDS, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)


def append_log(ws, row):
    f = ws / "SEND-LOG.csv"
    new = not f.exists()
    with open(f, "a", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=LOG_FIELDS, extrasaction="ignore")
        if new:
            w.writeheader()
        w.writerow(row)


def excluded(ws):
    f = ws / "EXCLUDE.txt"
    return {l.strip().lower() for l in f.read_text().splitlines() if l.strip()} if f.exists() else set()


def is_generic(addr):
    return bool(GENERIC_LOCAL.match(addr.split("@")[0]))


def first_name(body):
    m = re.match(r"\s*(?:Hi|Hello|Dear|Hey)\s+([^,\n]+),", body)
    return m.group(1).strip() if m else ""
