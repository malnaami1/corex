import math

def cosine_similarity(a: list, b: list) -> float:
    dot   = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x ** 2 for x in a))
    mag_b = math.sqrt(sum(x ** 2 for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)

def verify_honeypot(got: list, expected: list, threshold: float = 0.98) -> bool:
    if len(got) != len(expected):
        return False
    return all(cosine_similarity(g, e) >= threshold for g, e in zip(got, expected))