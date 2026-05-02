import asyncio
import httpx
from core.database import AsyncSessionLocal
from sqlalchemy import select
from features.auth.models import User
from features.google_fit.service import get_valid_access_token
from features.google_fit.sync_engine import ALL_DATA_TYPES

async def check_api():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).where(User.id == 3))
        user = res.scalar_one_or_none()
        token = await get_valid_access_token(db, user.id)
        
        from datetime import datetime, timezone, timedelta
        end_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
        start_ms = int((datetime.now(timezone.utc) - timedelta(days=1)).timestamp() * 1000)
        
        async with httpx.AsyncClient() as client:
            for dt in ALL_DATA_TYPES:
                body = {
                    "aggregateBy": [{"dataTypeName": dt}],
                    "bucketByTime": {"durationMillis": 86400000},
                    "startTimeMillis": start_ms,
                    "endTimeMillis": end_ms,
                }
                resp = await client.post(
                    "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
                    json=body,
                    headers={"Authorization": f"Bearer {token}"}
                )
                print(f"{dt}: {resp.status_code}")
                if resp.status_code != 200:
                    print("  ->", resp.text)

if __name__ == "__main__":
    asyncio.run(check_api())
