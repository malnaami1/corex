from sentence_transformers import SentenceTransformer

_model = SentenceTransformer("all-MiniLM-L6-v2")
CHUNK_SIZE = 10

def shard_job(job_id: str, texts: list) -> list:
    chunks = []
    for i in range(0, len(texts), CHUNK_SIZE):
        batch     = texts[i:i + CHUNK_SIZE]
        chunk_id  = f"chunk-{i // CHUNK_SIZE}"
        is_hp     = (i // CHUNK_SIZE) % 10 == 9  # every 10th chunk is a honeypot
        hp_answer = None
        if is_hp:
            hp_answer = _model.encode(batch).tolist()
        chunks.append({
            "chunk_id":    chunk_id,
            "texts":       batch,
            "is_honeypot": is_hp,
            "hp_answer":   hp_answer
        })
    return chunks