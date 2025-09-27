import asyncio
import httpx
from bs4 import BeautifulSoup
from urllib.parse import urlparse
from . import string_exceptions
from . import scouter_funcs
import re

# Scrape a single thread page and return its parsed HTML
async def scrape_replays(client, thread_url):
    try:
        headers = {"User-Agent": "Mozilla/5.0 (compatible; ScraperBot/1.0)"}
        response = await client.get(thread_url, headers=headers)
        response.raise_for_status()
        return BeautifulSoup(response.text, "html.parser")
    except:
        return None  # always return something
    
# Find all replay links inside a parsed HTML page
def find_replays(html, tier=None):
    replays = []
    for a in html.find_all("a", href=True):
        href = a["href"].strip()
        parsed_link = urlparse(href)

        if parsed_link.netloc == "replay.pokemonshowdown.com":
            if tier is None or tier in parsed_link.path:
                replays.append(href)

    return replays

def scrape_replay(replay: dict, url):
    # Extract players
    players = [
        string_exceptions.clean_name(p)
        for p in replay['players']
    ]

    if re.search(string_exceptions.unsupported_formats, replay.get('format').lower()):
        return None, None #skip pre gen5 formats

    # Clean up battle log
    log = [
        line.replace(": split up a bar", "")
        for line in replay['log'].split('\n')
        if not line.startswith(string_exceptions.skip_prefixes)
        and "|t:|" not in line
        and "|upkeep" not in line
        and line != "|"
    ]

    # Extract mons
    players_dict = {players[0]: [], players[1]: [], "replay": replay['id']}

    for line in log:
        if line.startswith("|poke|p1|"):
            players_dict[players[0]].append(
                string_exceptions.clean_mon_name(
                    line[len("|poke|p1|"):].split(", ")[0]
                    .replace("|item", "").replace("|", "")
                )
            )
        elif line.startswith("|poke|p2|"):
            players_dict[players[1]].append(
                string_exceptions.clean_mon_name(
                    line[len("|poke|p2|"):].split(", ")[0]
                    .replace("|item", "").replace("|", "")
                )
            )
    
    return players_dict, url

# Orchestrator: scrape multiple threads and gather replay links
async def master_scraper_process(data):
    tier = data['tier'] if data['tier'] != '' else None
    sites = set(site.strip() for site in data["message"].split("\n"))

    async with httpx.AsyncClient() as client:
        sites_tasks = [scrape_replays(client, site) for site in sites]
        sites_html_list = await asyncio.gather(*sites_tasks, return_exceptions=True)
    
    # Keep only valid HTML objects
    valid_html = [
        site
        for site in sites_html_list 
        if site
    ]

    # Use valid_html only
    all_links = []
    for html in valid_html:
        try:
            all_links.extend(find_replays(html, tier=tier))
        except Exception as e:
            print(f"[Scrape error caught find_replays] {e}")

    # Normalize all collected replay links
    cleaned = set(
        scouter_funcs.normalize_url(url) 
        for url in all_links 
        if url
    )

    # Fetch replays concurrently
    fetched_replays, urls = await scouter_funcs.fetch_replays(cleaned)

    # Filter out errors here too
    valid_replays = []
    cleaned_urls = []

    print(f"fetched_replays: {len(fetched_replays)}")
    for replay, url in zip(fetched_replays, urls):
        try:
            if isinstance(replay, Exception):
                print(f"[Scrape error caught 2] {replay}")
                continue
            elif replay:
                valid_replays.append(replay)
                cleaned_urls.append(url)
        except Exception as e:
            print(f"valid replays error: {e}")
    print(f"valid replays: {len(valid_replays)}")

    # Only parse valid replays
    scraped_replays = []
    for replay, url in zip(valid_replays, cleaned_urls):
        if not replay:
            continue
        result, valid_url = scrape_replay(replay, url)
        if not result:
            continue
        result['replay'] = valid_url.replace('.json', '')
        if result is not None:
            scraped_replays.append(result)

    print(f"num replays successfully scraped: {len(scraped_replays)}")

    return scraped_replays
