def calculate_cost(total_embeddings: int) -> dict:
    total_cpu   = total_embeddings * 0.05        # ~50ms per embedding
    cost_usd    = round(total_cpu * 0.002, 4)
    aws_usd     = round((total_cpu / 3600) * 0.096 + total_embeddings * 0.0001, 4)
    savings_pct = round((1 - cost_usd / max(aws_usd, 0.0001)) * 100)
    return {
        "cost_usd":           cost_usd,
        "aws_equivalent_usd": aws_usd,
        "savings_pct":        savings_pct
    }