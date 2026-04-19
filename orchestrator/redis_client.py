import redis.asyncio as aioredis

_redis = None

async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = await aioredis.from_url("redis://localhost:6379", decode_responses=True)
    return _redis