import httpx
import asyncio

async def main():
    url = "http://localhost:8080/webhook/set/ibera"
    headers = {"apikey": "280185xEnEizE41", "Content-Type": "application/json"}
    payload = {
        "webhook": {
            "enabled": True,
            "url": "http://host.docker.internal:8000/webhook/ibera",
            "byEvents": False,
            "base64": False,
            "events": [
                "MESSAGES_UPSERT",
                "MESSAGES_UPDATE"
            ]
        }
    }
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, headers=headers, json=payload)
            print(f"Status: {resp.status_code}")
            print(f"Response: {resp.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
