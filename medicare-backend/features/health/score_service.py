def calculate_health_score(steps: int, sleep_hours: float, heart_rate: int) -> dict:
    """
    Calculate an overall health score (0-100) based on smartwatch data.
    
    Logic:
    * steps < 5000 -> penalty
    * sleep < 6 -> penalty
    * out of bounds heart rate -> penalty
    """
    score = 100
    
    # Steps
    if steps < 5000:
        score -= 20
    elif steps >= 10000:
        score += 10
        
    # Sleep
    if sleep_hours < 6:
        score -= 20
    elif sleep_hours >= 7.5:
        score += 10
        
    # Heart Rate (Resting bounds roughly 50-100)
    if heart_rate > 0:
        if heart_rate < 50 or heart_rate > 100:
            score -= 10
            
    # Cap between 0 and 100
    score = max(0, min(100, score))
    
    # Determine status label
    status = "good"
    if score < 50:
        status = "poor"
    elif score < 80:
        status = "moderate"
        
    return {
        "score": score,
        "status": status
    }
