import asyncio
from core.database import AsyncSessionLocal
from sqlalchemy import text

async def alter():
    async with AsyncSessionLocal() as db:
        await db.execute(text("ALTER TABLE users ADD COLUMN profile_picture_url VARCHAR(500);"))
        await db.commit()
        print("Column added.")

if __name__ == "__main__":
    asyncio.run(alter())
