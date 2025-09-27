import numpy as np
import re
from . import string_exceptions
from . import player_class
import traceback
import httpx
import asyncio
from collections import Counter
import re
import time


def convert(obj):
    if isinstance(obj, dict):
        return {k: convert(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert(x) for x in obj]
    elif isinstance(obj, (np.integer, np.int32, np.int64)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float32, np.float64)):
        return float(obj)
    else:
        return obj 

"""Replay URL handling"""
def normalize_url(url: str) -> str | None:
    url = url.strip()
    if not url:
        return None
    url = url.split("?", 1)[0].strip()
    return url if url.endswith(".json") else f"{url}.json"

# New helper functions
async def get_replay(client, replay_url: str):
    # Send async GET request for replay data
    r = await client.get(replay_url)
    r.raise_for_status()
    return r.json()

async def fetch_replays(cleaned, max_concurrency=50):
    # Semaphore to limit how many requests run at the same time
    sem = asyncio.Semaphore(max_concurrency)

    # Reuse a single HTTP client for all requests
    async with httpx.AsyncClient() as client:

        # Wrapper to ensure the semaphore is respected for each request
        async def sem_get_replay(url):
            async with sem:  # Wait if too many requests are running
                try:
                    # Return both replay data and the url it came from
                    data = await get_replay(client, url)
                    return data, url
                except Exception as e:  # catch any error
                    print(f"Error fetching {url}: {e}")
                    return None

        # Create a list of tasks for all URLs
        tasks = [asyncio.create_task(sem_get_replay(u)) for u in cleaned if u]

        results = []
        # Gather results as tasks complete
        for task in asyncio.as_completed(tasks):
            result = await task
            if result is not None:
                results.append(result)  # each result is (data, url)

        # Split results into two parallel lists: replays and urls
        replays, urls = zip(*results) if results else ([], [])

        # Return as two separate arrays
        return list(replays), list(urls)
#########################

def parse_replay(replay: dict, player_names: list[str]):
    # Extract players
    players = [
        string_exceptions.clean_name(p)
        for p in replay['players']
    ]
    if not any(p in player_names for p in players):
        #print(f'skipping due to player not in replays {players}, {player_names}')
        return "E"

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
    players_dict = {players[0]: [], players[1]: []}

    for line in log:
        if line.startswith("|poke|p1|"):
            players_dict[players[0]].append(
                line[len("|poke|p1|"):].split(", ")[0]
                .replace("|item", "").replace("|", "")
            )
        elif line.startswith("|poke|p2|"):
            players_dict[players[1]].append(
                line[len("|poke|p2|"):].split(", ")[0]
                .replace("|item", "").replace("|", "")
            )

    for k, v in players_dict.items():
        if k.lower() in player_names:
            return v

    return "E"
        
def handle_team_typings(teams, dex):
    team_typings = []
    for team in teams:
        try:
            typings = []
            for t in team:
                name = t.lower().replace('-', "").replace(" ", "").replace(":", "")
                if 'florges' in name:
                    name = 'florges'
                typings.append(dex[name]["types"])

            team_typings.append(typings)
        except KeyError as e:
            print(f"Pokemon error: Missing key {e} (team skipped) -> {team}")
            print(f"Full error: {repr(e)}")
            traceback.print_exc()

    # Flatten the list of lists into one list
    team_typings = np.array([typing for team in team_typings for t in team for typing in t])
    t_values, t_counts = np.unique(team_typings, return_counts=True)

    # Build list of [type, count, proportion]
    type_counts = [
        [ 
            t, # typing
            int(c), # number used
            round(c / len(teams) * 100, 2) # % of all teams
        ]  
        for t, c in zip(t_values.tolist(), t_counts.tolist())
    ]

    # Sort by count descending
    type_counts = sorted(type_counts, key=lambda x: x[1], reverse=True)

    return type_counts

async def scout_player(data, dex):
    replays = data.get("message", "")
    name_list = re.split(r", |\n", data.get("names"))
    player = player_class.Player([string_exceptions.clean_name(name) for name in name_list])

    # Organize info
    replay_links = set(replays.split("\n"))

    # Clean URLs before fetch
    cleaned_urls = []
    for url in replay_links:
        if url.strip() == "":
            continue
        url = url.split("?", 1)[0].strip()
        if not url.endswith(".json"):
            url += ".json"
        cleaned_urls.append(url)


    # 1. Normalize URLs (generator expression)
    cleaned = (normalize_url(url) for url in replay_links)

    # 2. Fetch all replays at once using the helper
    fetched_replays, fetched_urls = await fetch_replays(cleaned)

    # Sync parse
    results = [parse_replay(r, player.names) for r in fetched_replays]

    player.teams = [team for team in results if team != "E"]

    # Handle all teams for player
    cache = {}  # dictionary to store already-cleaned mon names (avoid recomputing)

    # Rebuild player.teams with cleaned names
    player.teams = [
        [
            # - If 't' is already in cache, return cached cleaned name
            # - Otherwise, call clean_mon_name(t), store it in cache, then return it
            cache.setdefault(t, string_exceptions.clean_mon_name(t))
            for t in team
        ]
        for team in player.teams
    ]

    # Convert list-of-lists of teams into a NumPy array for efficient vectorized operations
    teams = np.array(player.teams)

    # Flatten to 1D array of all mons across all teams
    # np.ravel() is like flatten(), but it avoids making a copy if not needed (faster, less memory)
    flattened_teams = teams.ravel()

    # Get unique mons and their counts in one vectorized call
    values, counts = np.unique(flattened_teams, return_counts=True)

    mons_dictionary = {
        val: {
            "count": int(cnt),
            "proportion": round(float(cnt / len(teams)) * 100, 2) # decimal proportion
        }
        for val, cnt in zip(values, counts)
    }

    type_counts = handle_team_typings(player.teams, dex)

    #Clean up NP
    clean_dict = convert(mons_dictionary)

    return player.teams, clean_dict, type_counts, fetched_urls