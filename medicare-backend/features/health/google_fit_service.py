import logging
from datetime import datetime, timezone, time
import httpx
from typing import Optional, Dict

logger = logging.getLogger(__name__)

GOOGLE_FIT_REST_URL = "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate"

async def fetch_real_data(access_token: str) -> Optional[Dict[str, float]]:
    """
    Fetch aggregated steps, sleep, and heart rate for today using Google Fit API.
    Handles partial or empty data gracefully.
    """
    if not access_token:
        return None
        
    # Calculate timestamps (from midnight today to now)
    now = datetime.now(timezone.utc)
    start_of_day = datetime.combine(now.date(), time.min).replace(tzinfo=timezone.utc)
    
    start_time_millis = int(start_of_day.timestamp() * 1000)
    end_time_millis = int(now.timestamp() * 1000)
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "aggregateBy": [
            {
                "dataTypeName": "com.google.step_count.delta",
                "dataSourceId": "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps"
            },
            {
                "dataTypeName": "com.google.heart_rate.bpm"
            },
            {
                "dataTypeName": "com.google.sleep.segment"
            }
        ],
        "bucketByTime": {
            "durationMillis": end_time_millis - start_time_millis
        },
        "startTimeMillis": start_time_millis,
        "endTimeMillis": end_time_millis
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(GOOGLE_FIT_REST_URL, headers=headers, json=payload)
            
        if response.status_code != 200:
            logger.error(f"Google Fit API Error: {response.status_code} - {response.text}")
            return None
            
        return _parse_fit_data(response.json())
        
    except Exception as e:
        logger.error(f"Exception while fetching Google Fit data: {e}")
        return None

def _parse_fit_data(data: dict) -> Dict[str, float]:
    """Parse the aggregate dataset response into simple float values."""
    parsed = {}
    
    buckets = data.get("bucket", [])
    if not buckets:
        return parsed
        
    # We bucketed by the entire day duration, so there should only be one bucket
    bucket = buckets[0]
    datasets = bucket.get("dataset", [])
    
    for dataset in datasets:
        points = dataset.get("point", [])
        if not points:
            continue
            
        for point in points:
            data_type_name = point.get("dataTypeName", "")
            values = point.get("value", [])
            
            if not values:
                continue
                
            val = values[0]
            
            if data_type_name == "com.google.step_count.delta":
                # Steps are typically int values
                parsed["steps"] = val.get("intVal", 0)
                
            elif data_type_name == "com.google.heart_rate.bpm":
                # Aggregate heart rate usually returns average as fpVal
                parsed["heart_rate"] = int(val.get("fpVal", 0))
                
            elif data_type_name == "com.google.sleep.segment":
                # Sleep segment values: we want duration. Wait, we aggregated.
                # Actually, sleep segment doesn't aggregate cleanly by time bucket into a single 'duration' sum automatically unless you use the sleep summary type.
                # Let's extract duration by summing up the segments (or just read the sleep summary if we were using it).
                # But to keep it simple with this aggregate, we'll try to get it.
                # Since 'com.google.sleep.segment' might return multiple points or an aggregated sum if we used bucketBySession.
                # If we get points, we should calculate the difference.
                pass
                
    # Manual sleep sum since the aggregate might return multiple points inside the dataset
    sleep_dataset = next((ds for ds in datasets if ds.get("dataSourceId", "").endswith("sleep.segment")), None)
    if sleep_dataset and sleep_dataset.get("point"):
        total_sleep_ms = 0
        for p in sleep_dataset.get("point"):
            # A sleep segment point has a start and end time
            start = int(p.get("startTimeNanos", 0))
            end = int(p.get("endTimeNanos", 0))
            if start and end:
                total_sleep_ms += (end - start) / 1_000_000 # Convert nanos to millis
        
        # Convert millis to hours
        if total_sleep_ms > 0:
            parsed["sleep_hours"] = round(total_sleep_ms / (1000 * 60 * 60), 1)

    return parsed
