#!/usr/bin/env python3
"""Best-effort official-source monitor for the Barcelona visit.
A page fetch is not proof of safety. Fail closed when too few sources respond.
"""
import json, re, html
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
from html.parser import HTMLParser

SOURCES = [
    ("TMB service notices", "https://www.tmb.cat/en/barcelona-transport/service-notices", True),
    ("AMB mobility notices", "https://www.ambmobilitat.cat/", True),
    ("Rodalies de Catalunya", "https://rodalies.gencat.cat/en/inici/index.html", True),
    ("Generalitat de Catalunya news", "https://web.gencat.cat/en/actualitat/", True),
    ("Barcelona city news", "https://www.barcelona.cat/infobarcelona/en/", True),
    ("Mossos d'Esquadra press room", "https://mossos.gencat.cat/en/els_mossos_desquadra/sala_de_premsa/", True),
    ("Catalan Civil Protection", "https://interior.gencat.cat/ca/arees_dactuacio/proteccio_civil/", True),
    ("Barcelona tourism safety", "https://www.barcelonaturisme.com/wv3/en/page/37/safety.html", False),
    ("UK FCDO Spain safety advice", "https://www.gov.uk/foreign-travel-advice/spain/safety-and-security", False),
    ("Australia Smartraveller Spain", "https://www.smartraveller.gov.au/destinations/europe/spain", False),
    ("US State Department Spain advisory", "https://travel.state.gov/en/international-travel/travel-advisories/spain.html", False),
]
EVENT = re.compile(r"demonstrat|manifestaci|protest|strike|huelga|vaga|mobilis|mobiliz|riot|unrest|disturbance|looting|fire|public order|road closure|street closure|diversion|desviament|desvío|service disruption|transport disruption|interrupci|corte de tráfico|tall de trànsit|alteració|alteracion|police operation|police alert|incid[eè]ncia", re.I)
DATE = re.compile(r"2026[-/. ]10[-/. ](?:28|29|30)|(?:28|29|30)[ ./-](?:10|oct(?:ober|ubre)?)(?:[ ./-]2026)?|oct(?:ober|ubre)?\s+(?:28|29|30)(?:st|nd|rd|th)?(?:,?\s+2026)?|today|tonight|this morning|this afternoon|hoy|avui|mañana|demà", re.I)
RELEVANCE = re.compile(r"barcelona|catalu(?:n|ñ)a|rodalies|renfe|metro|tmb|gothic quarter|gòtic|g[oó]tico|plaça|plaza|passeig|sagrada|ciutadella|airport|aeroport|aeropuerto|train|rail|bus|tram|transport", re.I)

class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__(); self.parts=[]; self.skip=0
    def handle_starttag(self, tag, attrs):
        if tag in ("script","style","noscript","svg"): self.skip += 1
    def handle_endtag(self, tag):
        if tag in ("script","style","noscript","svg") and self.skip: self.skip -= 1
    def handle_data(self, data):
        if not self.skip: self.parts.append(data)

def fetch(source):
    name, url, is_operational = source
    try:
        req = Request(url, headers={"User-Agent":"BarcelonaVisitSafetyCheck/1.0 (official-source monitoring; contact: site owner)"})
        with urlopen(req, timeout=18) as resp:
            raw = resp.read(1_500_000).decode("utf-8", "replace")
            status = getattr(resp, "status", 200)
        parser = TextExtractor(); parser.feed(raw)
        text = re.sub(r"\s+", " ", html.unescape(" ".join(parser.parts)))
        hits = []
        if is_operational:
            for match in EVENT.finditer(text):
                start, end = max(0, match.start()-350), min(len(text), match.end()+650)
                snippet = text[start:end]
                if DATE.search(snippet) and RELEVANCE.search(snippet):
                    clean = snippet.strip()
                    if clean not in hits: hits.append(clean[:650])
                    if len(hits) >= 3: break
        return {"name":name,"url":url,"ok":200 <= status < 400,"hits":hits,"checked_at":datetime.now(timezone.utc).isoformat()}
    except Exception as e:
        return {"name":name,"url":url,"ok":False,"hits":[],"error":type(e).__name__,"checked_at":datetime.now(timezone.utc).isoformat()}

def main():
    now = datetime.now(timezone.utc)
    results = [fetch(s) for s in SOURCES]
    operational = [r for r in results if next((s[2] for s in SOURCES if s[0] == r["name"]), False)]
    ok_count = sum(1 for r in results if r["ok"])
    hits = [dict(source=r["name"], url=r["url"], snippet=h) for r in operational for h in r["hits"]]
    if len(hits):
        status = "alert"
        headline = "Verified source reports a potentially relevant disruption."
        action = "Open the cited official notice and check the affected route before travelling; avoid any active demonstration or police cordon."
    elif ok_count < 7 or sum(1 for r in operational if r["ok"]) < 4:
        status = "unavailable"
        headline = "Unable to verify current conditions."
        action = "Check official transport and police advisories directly before travelling; do not treat this status as an all-clear."
    else:
        status = "clear"
        headline = "No verified disruptions. Proceed with optimistic caution."
        action = "Avoid demonstrations and follow police instructions. Check local transport notices before each major journey."
    output = {
        "title":"Live Security Update",
        "status":status,
        "headline":headline,
        "action":action,
        "checked_at":now.isoformat(),
        "checked_at_local":now.astimezone().strftime("%d %b %Y, %H:%M UTC"),
        "sources_ok":ok_count,
        "sources_total":len(SOURCES),
        "sources":results,
        "alerts":hits,
        "disclaimer":"Automated page scanning can miss new or poorly indexed reports. This is not an emergency alert service; follow official instructions."
    }
    with open("security-status.json","w",encoding="utf-8") as f:
        json.dump(output,f,ensure_ascii=False,indent=2)
        f.write("\n")
    print(f"Status={status}; {ok_count}/{len(SOURCES)} sources reachable; {len(hits)} potential alert snippets.")
    if status == "unavailable":
        raise SystemExit("Too few sources responded; status deliberately remains unavailable.")

if __name__ == "__main__":
    main()
