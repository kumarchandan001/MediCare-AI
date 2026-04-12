# MediCare AI — REST API v1 Documentation

**Base URL**: `/api/v1`  
**Content-Type**: `application/json`  
**Authentication**: Session-based (cookie). All endpoints except `/auth/*` require login.

---

## Response Format

All V1 endpoints return a standardized JSON envelope:

### Success
```json
{
  "status": "success",
  "code": 200,
  "data": { ... },
  "meta": {
    "timestamp": "2026-04-11T12:00:00.000000+00:00",
    "version": "1.0",
    "request_id": "a1b2c3d4e5f6"
  }
}
```

### Error
```json
{
  "status": "error",
  "code": 422,
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "Missing required fields",
    "details": [{"field": "heart_rate", "message": "heart_rate is required"}]
  },
  "meta": { ... }
}
```

### Error Types
| Type | HTTP Code | Description |
|------|-----------|-------------|
| `VALIDATION_ERROR` | 422 | Request body validation failed |
| `NOT_FOUND` | 404 | Resource does not exist |
| `UNAUTHORIZED` | 401 | Not authenticated |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `API_ERROR` | 400 | General bad request |
| `SERVER_ERROR` | 500 | Internal server error |
| `METHOD_NOT_ALLOWED` | 405 | HTTP method not supported |

---

## Auth

### `GET /auth/me`
Returns the current session user. No auth required (returns 401 if not logged in).

### `POST /auth/logout`
Clears the session. Returns `{logged_out: true}`.

---

## Health

### `GET /health/summary`
Dashboard metrics: sleep, steps, water, BMI, heart rate, trends.

### `GET /health/history?range={week|month}`
Health monitoring records for the time window.

### `POST /health/vitals` → 201
Save vital signs. Auto-triggers alert generation.
```json
{"heart_rate": 72, "blood_pressure": {"systolic": 120, "diastolic": 80}, "oxygen_level": 98, "sleep_hours": 7.5}
```

### `GET /health/vitals/latest`
Today's health summary including latest vitals.

### `GET /health/bmi`
BMI history (last 20 records).

### `POST /health/bmi` → 201
Record a new BMI entry.
```json
{"height": 170, "weight": 70}
```

### `GET /health/activity?start_date=&end_date=&activity_type=`
Activity tracking records with optional filters.

### `POST /health/activity` → 201
Log an activity.
```json
{"activity_type": "Walking", "steps": 5000, "calories_burned": 200, "duration": 30}
```

### `GET /health/medications`
Active medication reminders.

### `POST /health/medications` → 201
Add a new medication reminder.
```json
{"medication_name": "Ibuprofen", "dosage": "500mg", "frequency": "daily", "reminder_time": "08:00"}
```

### `DELETE /health/medications/{id}`
Deactivate a medication reminder.

### `POST /health/medications/{id}/taken`
Record that a medication was taken.
```json
{"medication_name": "Ibuprofen", "dosage": "500mg", "status": "taken"}
```

### `GET /health/risk-score?days=7`
Composite health risk score with contributing factors.

### `GET /health/trends?days=7`
Health trend insights and analysis.

### `GET /health/daily-log?days=7`
Recent daily health logs.

### `POST /health/daily-log` → 201
Save or update today's daily health log. Also mirrors vitals to HealthMonitoring.
```json
{"sleep_hours": 7.5, "steps": 8000, "water_intake": 2.5, "mood_score": 8, "energy_level": 7}
```

### `GET /health/goals`
Active health goals.

### `POST /health/goals` → 201
Create a new health goal.
```json
{"goal_type": "sleep", "target_value": 8}
```

### `PUT /health/goals/{id}`
Update an existing health goal.
```json
{"status": "completed"}
```

---

## User

### `GET /user/profile`
Current user's profile data.

### `PUT /user/profile`
Update profile fields.
```json
{"first_name": "John", "last_name": "Doe", "gender": "Male"}
```

### `GET /user/contacts`
Emergency contacts list with count.

### `POST /user/contacts` → 201
Add an emergency contact.
```json
{"name": "Jane Doe", "phone": "1234567890", "relationship": "Spouse"}
```

### `DELETE /user/contacts/{id}`
Delete an emergency contact.

---

## Prediction

### `POST /predict`
Run AI disease prediction with XAI explanation. Auto-saves to history.
```json
{"fever": 1, "cough": 1, "headache": 1}
```

### `GET /predict/history`
Previous disease predictions for the current user.

---

## Alerts

### `GET /alerts?days=7`
Generate live alerts from current health data (not persisted).

### `GET /alerts/critical?days=7`
Only high/critical severity alerts.

### `GET /alerts/history?status=&limit=50`
Fetch persisted alerts from the database.

### `POST /alerts/generate`
Trigger alert generation AND persist to database.
```json
{"days": 7}
```

### `PATCH /alerts/{id}`
Update alert status.
```json
{"status": "acknowledged"}
```
Valid statuses: `active`, `acknowledged`, `dismissed`, `resolved`

### `DELETE /alerts/{id}`
Delete a persisted alert.

---

## Habits

### `GET /habits/tips?days=7`
AI-generated personalized habit coaching tips.

### `GET /habits/chat?limit=50`
Chatbot interaction history.

### `POST /habits/chat`
Send a message to the AI health chatbot. Response is persisted.
```json
{"message": "How can I improve my sleep?", "interaction_type": "general"}
```

---

## Admin

All admin endpoints require `is_admin=True` on the user account.

### `GET /admin/stats`
Aggregate dashboard counts (users, records, predictions, etc.).

### `GET /admin/users`
User listing with health log and medication counts.

### `GET /admin/users/{id}`
Detailed user info + latest health data.

### `DELETE /admin/users/{id}`
Delete a non-admin user account.

### `GET /admin/health-intelligence`
Global health averages and 7-day sleep trend.

### `GET /admin/ai-stats`
Prediction and chatbot usage statistics with top diseases.

### `GET /admin/emergency-overview`
Alert and contact summary with recent alerts.

### `GET /admin/system-health`
Database size, system status, and version info.

---

## CORS

All `/api/*` endpoints include CORS headers:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRFToken
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
X-API-Version: 1.0
```

## CSRF

V1 API routes are exempt from CSRF protection. Legacy `/api/*` routes still use the `X-CSRFToken` header from the global fetch interceptor.

## Backward Compatibility

All legacy endpoints (`/api/health-summary`, `/api/risk-score`, `/admin/api/stats`, etc.) remain registered and functional. The V1 layer is additive — zero breaking changes.
