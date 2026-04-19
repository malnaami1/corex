# worker-client/executor.py
from sentence_transformers import SentenceTransformer
import time

print("Loading model...")
model = SentenceTransformer("all-MiniLM-L6-v2")
print("✓ Model loaded")

def execute_embedding(texts: list[str]) -> tuple[list, float]:
    start = time.time()
    embeddings = model.encode(texts).tolist()
    cpu_seconds = time.time() - start
    return embeddings, cpu_seconds

# Quick test — run this file directly to verify:
if __name__ == "__main__":
    embs, t = execute_embedding(["hello world", "test sentence"])
    print(f"✓ Embeddings shape: {len(embs)} x {len(embs[0])}")
    print(f"✓ Took {t:.2f}s")
    # Should print: 2 x 384, ~0.1s