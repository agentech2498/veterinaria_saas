import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from src.main import app
from src.core.security import admin_required
from src.models.models import User, Organization
from sqlalchemy import select
from src.core.database import AsyncSessionLocal

def test_endpoints():
    print("Testing /finance endpoints via TestClient...")
    
    # Override dependency to simulate a logged-in admin user
    # We will use username "admin" or get a real username from DB
    async def override_admin_required():
        async with AsyncSessionLocal() as session:
            # Get the first org user
            res = await session.execute(select(User).limit(1))
            user = res.scalar()
            if not user:
                return "admin" # fallback
            return user.username

    app.dependency_overrides[admin_required] = override_admin_required
    
    client = TestClient(app)
    
    # 1. Test /finance/metrics
    print("\nTesting GET /finance/metrics...")
    res = client.get("/finance/metrics?period=month")
    print(f"Status: {res.status_code}")
    print(f"JSON: {res.json()}")
    
    # 2. Test /finance/tickets
    print("\nTesting GET /finance/tickets...")
    res2 = client.get("/finance/tickets")
    print(f"Status: {res2.status_code}")
    print(f"JSON: {res2.json()}")
    
    # 3. Test /finance/ticket/{id}/pdf
    tickets = res2.json()
    if tickets:
        t_id = tickets[0]['id']
        print(f"\nTesting GET /finance/ticket/{t_id}/pdf...")
        res3 = client.get(f"/finance/ticket/{t_id}/pdf")
        print(f"Status: {res3.status_code}")
        print(f"Content-Type: {res3.headers.get('content-type')}")
        print(f"Content-Disposition: {res3.headers.get('content-disposition')}")
        print(f"File Size: {len(res3.content)} bytes")
    
    print("\nTests completed.")

if __name__ == "__main__":
    test_endpoints()
