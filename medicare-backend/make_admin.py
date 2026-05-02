import asyncio
from sqlalchemy import text
from core.database import AsyncSessionLocal

async def make_admin():
    async with AsyncSessionLocal() as db:
        await db.execute(text("UPDATE users SET is_admin = True WHERE email = 'chandankr.62096@gmail.com'"))
        await db.commit()
        print("User made admin successfully!")

if __name__ == "__main__":
    asyncio.run(make_admin())
