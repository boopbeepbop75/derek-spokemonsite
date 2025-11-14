from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import scouter_py.scouter_funcs as scouter
import scouter_py.scraper as scraper
import requests
import time
import app_hyperparameters

# run with: uvicorn app:app --reload

# Fetch pokedex at startup
DEX_URL = "https://play.pokemonshowdown.com/data/pokedex.json"
dex = {}

url = "https://play.pokemonshowdown.com/data/pokedex.json" 
dex = requests.get(url).json()

# Initialize FastAPI
app = FastAPI()

# Mount templates + static if you use them
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")

# Example webpage request
"""@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard(request: Request, user_permission: str = "guest"):
    return templates.TemplateResponse(
        "dashboard.html", 
        {"request": request, "permission": user_permission}
    )
"""

### Home page ###
@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

### Scouter page ###
@app.get("/scouter")
async def scouter_page(request: Request):
    return templates.TemplateResponse("scouter/scouter.html", {"request": request})

### Scraper page ###
@app.get("/replay_scraper")
async def scouter_page(request: Request):
    return templates.TemplateResponse("scouter/replay_scraper.html", {"request": request})

### Submit teams page ###
@app.get("/submit_teams")
async def scouter_page(request: Request):
    return templates.TemplateResponse("ml_ai/submit_teams.html", {"request": request})

### Replay handling ###
@app.post("/scout")
async def scout(request: Request):
    async with app_hyperparameters.semaphores['scouts']:
        start = time.time()
        try:
            data = await request.json()   # async request body
            teams, clean_dict, type_counts, replays, opponents, winners = await scouter.scout_player(data, dex) ### Get scout info

            elapsed = time.time() - start
            print(f"Scouting took {elapsed:.2f} seconds")

            return JSONResponse({ ### return scout info
                "teams": teams,
                "mon_info": clean_dict,
                "type_counts": type_counts,
                "replays": replays,
                "opponents": opponents,
                "winners": winners
            })

        except Exception as e:
            elapsed = time.time() - start
            print(f"Error occurred after {elapsed:.2f} seconds {e}")
            return JSONResponse({
                "error": f"An error occurred: {e}"
            })
        
### replay scraper post function ###
@app.post("/replay_scraper")
async def scout(request: Request):
    async with app_hyperparameters.semaphores['scrapes']:
        start = time.time()
        try:
            data = await request.json()

            scraped_replays = await scraper.master_scraper_process(data)

            elapsed = time.time() - start
            print(f"Scraping took {elapsed:.2f} seconds")

            return JSONResponse({
                "teams": scraped_replays,
            })
        
        except Exception as e:
            elapsed = time.time() - start
            print(f"Error occurred after {elapsed:.2f} seconds")
            print(f"Error: {e}")
            return JSONResponse({
                "error": f"An error occurred: {e}"
            })
        