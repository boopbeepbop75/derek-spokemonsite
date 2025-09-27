import asyncio

semaphores = {
    "scouts": asyncio.Semaphore(5),
    "scrapes": asyncio.Semaphore(3),
    "other": asyncio.Semaphore(10),
}