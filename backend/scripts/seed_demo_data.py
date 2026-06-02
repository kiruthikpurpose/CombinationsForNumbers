import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import get_settings
from app.core.security import hash_password

settings = get_settings()

DEMO_USERS = [
    {"email": "admin@reasonedai.com", "full_name": "Platform Admin", "password": "admin123!", "role": "admin", "is_superuser": True},
    {"email": "analyst@reasonedai.com", "full_name": "Sarah Chen", "password": "analyst123!", "role": "analyst"},
    {"email": "reviewer@reasonedai.com", "full_name": "James Mitchell", "password": "reviewer123!", "role": "reviewer"},
]


async def seed():
    from app.database import AsyncSessionLocal, init_db
    from app.models import User
    from sqlalchemy import select

    await init_db()
    
    async with AsyncSessionLocal() as db:
        for user_data in DEMO_USERS:
            result = await db.execute(select(User).where(User.email == user_data["email"]))
            existing = result.scalar_one_or_none()
            if not existing:
                user = User(
                    email=user_data["email"],
                    full_name=user_data["full_name"],
                    hashed_password=hash_password(user_data["password"]),
                    role=user_data["role"],
                    is_superuser=user_data.get("is_superuser", False),
                )
                db.add(user)
                print(f"Created user: {user_data['email']}")
            else:
                print(f"User already exists: {user_data['email']}")
        
        await db.commit()
        print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(seed())
