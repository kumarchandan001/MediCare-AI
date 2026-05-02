import asyncio
from core.database import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text('SELECT error_message FROM google_fit_syncs ORDER BY started_at DESC LIMIT 1;'))
        print("ERROR_MESSAGE:", res.scalar())

if __name__ == "__main__":
    asyncio.run(main())
