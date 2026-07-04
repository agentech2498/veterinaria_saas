import httpx
import asyncio

async def main():
    url = "http://localhost:8080/webhook/find/ibera"
    # Assuming standard apikey or from env
    headers = {"apikey": "280185xEnEizE41"}  # The one in .env
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers)
            print(f"Status: {resp.status_code}")
            print(f"Response: {resp.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
