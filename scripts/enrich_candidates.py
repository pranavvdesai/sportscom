"""Enrich candidate profiles with strengths, levels, and bullet summaries."""
from __future__ import annotations

import json
import re
from pathlib import Path

PATH = Path(__file__).resolve().parents[1] / "src" / "data" / "candidates.json"

LEVEL_PATTERNS = [
    ("International", r"\b(international|world\s*cup|olympics?|asia(?:n)?\s*(?:level|games|championship)?)\b"),
    ("National", r"\b(national|nationals|all[\s-]?india|cbse\s*nationals?)\b"),
    ("State", r"\b(state(?:[\s-]?level)?|state\s*(?:championship|tournament|team|games)|cbse\s*clusters?)\b"),
    ("Zonal / Regional", r"\b(zonal|zone|regional|inter[\s-]?zone)\b"),
    ("District", r"\b(district|inter[\s-]?district)\b"),
    ("University", r"\b(university|inter[\s-]?university|varsity)\b"),
    ("College", r"\b(college|inter[\s-]?college|undergrad)\b"),
    ("School", r"\b(school|inter[\s-]?school|cbse|clusters?)\b"),
]

SPORT_WORDS = [
    "table tennis",
    "throw ball",
    "throwball",
    "cricket",
    "football",
    "soccer",
    "badminton",
    "basketball",
    "volleyball",
    "tennis",
    "swimming",
    "athletics",
    "squash",
    "hockey",
    "kabaddi",
    "kho kho",
    "chess",
    "carrom",
    "handball",
    "rugby",
    "golf",
    "boxing",
    "wrestling",
    "running",
    "sprint",
    "relay",
    "marathon",
    "cycling",
    "skating",
    "yoga",
    "pickleball",
]

TRAIT_RULES = [
    ("Event organising", r"\b(organiz|organis|event|coordina|volunteer|manage(d|ment)?|logistics|conduct)\b"),
    ("Leadership", r"\b(captain|lead(er|ership)?|headed|president|vice[\s-]?captain)\b"),
    ("Team spirit", r"\b(team(mate|work| player)?|together|squad|collective)\b"),
    ("Participation & culture", r"\b(participat|encourag|culture|community|involve|engage|inclus)\b"),
    ("Competitive drive", r"\b(compet(e|itive|ition)|win(ning)?|championship|tournament|medal|trophy|final)\b"),
    ("Design / content", r"\b(design|canva|edit(ing|or)?|content|poster|video|capcut|premiere)\b"),
    ("Playing ability", r"\b(play(ed|ing|er)?|represented|proficien|skill(ed)?)\b"),
]


def sentences(text: str) -> list[str]:
    text = re.sub(r"\s+", " ", (text or "").strip())
    if not text:
        return []
    parts = re.split(r"(?<=[.!?])\s+|\n+|;\s*", text)
    return [p.strip(" -•\t") for p in parts if len(p.strip()) > 12]


def shorten(s: str, n: int = 140) -> str:
    s = re.sub(r"\s+", " ", s).strip()
    if len(s) <= n:
        return s
    cut = s[:n].rsplit(" ", 1)[0]
    return cut.rstrip(",;:") + "..."


def bulletize(text: str, max_bullets: int = 4) -> list[str]:
    sents = sentences(text)
    if not sents:
        t = (text or "").strip()
        return [shorten(t, 160)] if t else []
    scored = []
    for s in sents:
        # skip fragments that look mid-sentence
        if s and s[0].islower() and not s.lower().startswith(("i ", "i'", "we ", "my ")):
            continue
        score = 0
        low = s.lower()
        for w in [
            "represent",
            "won",
            "captain",
            "state",
            "national",
            "district",
            "college",
            "tournament",
            "medal",
            "organiz",
            "particip",
            "lead",
            "play",
            "football",
            "cricket",
            "badminton",
            "contribut",
            "culture",
            "memory",
            "want",
            "would",
            "believe",
            "mean",
        ]:
            if w in low:
                score += 2
        score += min(len(s) // 40, 3)
        scored.append((score, s))
    if not scored:
        scored = [(1, s) for s in sents]
    scored.sort(key=lambda x: -x[0])
    picked: list[str] = []
    for _, s in scored:
        if len(picked) >= max_bullets:
            break
        if any(s[:40].lower() in p.lower() or p[:40].lower() in s.lower() for p in picked):
            continue
        picked.append(shorten(s, 150))
    return picked[:max_bullets]


def extract_levels(text: str) -> list[str]:
    low = text.lower()
    found: list[str] = []
    for label, pat in LEVEL_PATTERNS:
        if re.search(pat, low, re.I) and label not in found:
            found.append(label)
    return found


def extract_sports_in_text(text: str) -> list[str]:
    low = text.lower()
    found: list[str] = []
    for s in SPORT_WORDS:
        if s in low:
            if s in ("soccer",):
                label = "Football"
            elif s == "throwball":
                label = "Throw ball"
            elif s == "table tennis":
                label = "Table Tennis"
            else:
                label = s.title()
            if label not in found:
                found.append(label)
    return found


def level_mentions(text: str) -> list[str]:
    hits: list[str] = []
    # Prefer whole sentences that talk about representation / level / wins
    for s in sentences(text):
        low = s.lower()
        if not re.search(
            r"\b(represented|national|state|district|university|college|school|cbse|clusters?|championship|tournament|medal|gold|silver|bronze|runner[\s-]?up|won|winner|captain)\b",
            low,
        ):
            continue
        if not re.search(
            r"\b(sport|cricket|football|badminton|basketball|volleyball|tennis|swimming|athletics|squash|throw|hockey|kabaddi|chess|team|game|match|tournament|championship|cluster)\b",
            low,
        ) and not re.search(r"\b(represented|medal|championship)\b", low):
            continue
        snippet = shorten(s, 130)
        if snippet.lower() not in [h.lower() for h in hits]:
            hits.append(snippet)
    return hits[:5]


def strengths(c: dict) -> list[str]:
    items: list[str] = []
    tops = sorted(c.get("topSports") or [], key=lambda x: -x["level"])
    for s in tops[:4]:
        if s["level"] >= 4:
            items.append(f"Strong at {s['sport']} (self-rated {s['level']}/5)")
        elif s["level"] == 3:
            items.append(f"Solid {s['sport']} base (self-rated 3/5)")
    blob = " ".join(
        [
            c.get("achievements") or "",
            c.get("cultureAnswer") or "",
            c.get("favoriteMemory") or "",
            c.get("otherSports") or "",
        ]
    )
    for label, pat in TRAIT_RULES:
        if re.search(pat, blob, re.I):
            if label not in items and not any(label.lower() in i.lower() for i in items):
                items.append(label)
    if c.get("vertical"):
        items.append(f"Interested in: {c['vertical']}")
    out: list[str] = []
    for i in items:
        if i not in out:
            out.append(i)
    return out[:6]


def main() -> None:
    candidates = json.loads(PATH.read_text(encoding="utf-8"))
    enriched = []
    for c in candidates:
        # drop old insight if re-running
        c = {k: v for k, v in c.items() if k != "insight"}
        parts = [
            c.get("achievements") or "",
            c.get("otherSports") or "",
            c.get("cultureAnswer") or "",
            c.get("favoriteMemory") or "",
        ]
        blob = ". ".join(p.strip().rstrip(".") for p in parts if p and str(p).strip())
        insight = {
            "goodAt": strengths(c),
            "competitionLevels": extract_levels(blob),
            "levelMentions": level_mentions(blob),
            "sportsMentioned": extract_sports_in_text(blob),
            "achievementsBullets": bulletize(c.get("achievements") or "", 4)
            if (c.get("achievements") or "").strip()
            else [],
            "sportsComBullets": bulletize(c.get("cultureAnswer") or "", 4),
            "memoryBullets": bulletize(c.get("favoriteMemory") or "", 3),
            "summary": "",
        }
        bits = []
        if insight["goodAt"]:
            bits.append(insight["goodAt"][0])
        if insight["competitionLevels"]:
            bits.append("Mentioned " + ", ".join(insight["competitionLevels"][:3]) + " level")
        elif insight["achievementsBullets"]:
            bits.append(insight["achievementsBullets"][0])
        insight["summary"] = " · ".join(bits) if bits else "Form filled; limited sports detail shared."
        c["insight"] = insight
        enriched.append(c)

    PATH.write_text(json.dumps(enriched, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"enriched {len(enriched)} candidates")
    print(json.dumps(enriched[0]["insight"], indent=2, ensure_ascii=False)[:1000])


if __name__ == "__main__":
    main()
