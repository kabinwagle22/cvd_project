# CVD-AI Backend API Documentation

## Base URL
```
http://127.0.0.1:5001
```

## Authentication
Most endpoints require JWT token. Include in headers:
```
Authorization: Bearer <token>
```

---

## Endpoints

### **Auth Endpoints**

#### `POST /register`
Register a new user.

**Rate Limit**: 5 per minute

**Request Body**:
```json
{
  "username": "string (min 3 chars)",
  "email": "string (valid email)",
  "password": "string (min 6 chars)"
}
```

**Response (201)**:
```json
{
  "success": true,
  "data": {
    "token": "jwt_token",
    "username": "string"
  }
}
```

**Error Response (400/409)**:
```json
{
  "success": false,
  "error": "error message"
}
```

---

#### `POST /login`
Login existing user.

**Rate Limit**: 10 per minute

**Request Body**:
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "token": "jwt_token",
    "username": "string"
  }
}
```

---

### **Prediction Endpoints**

#### `POST /predict`
Predict cardiovascular risk based on 13 health features.

**Authentication**: Required (JWT)

**Request Body**:
```json
{
  "features": [
    age,              // 0: 1-120
    sex,              // 1: 0=Female, 1=Male
    chest_pain,       // 2: 0-3
    rest_bp,          // 3: 60-250 mmHg
    cholesterol,      // 4: 100-600 mg/dl
    fasting_bs,       // 5: 0-1
    rest_ecg,         // 6: 0-2 (optional)
    max_hr,           // 7: 50-220 bpm (optional)
    exercise_angina,  // 8: 0-1 (optional)
    st_depression,    // 9: 0-10 (optional)
    st_slope,         // 10: 0-2 (optional)
    major_vessels,    // 11: 0-4 (optional)
    thalassemia       // 12: 1-3 (optional)
  ]
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "status": "High Risk" | "Low Risk",
    "risk_score": 45.67,
    "recommendation": "string"
  }
}
```

**Error Response (400/500)**:
```json
{
  "success": false,
  "error": "Cholesterol must be between 100 and 600"
}
```

---

#### `GET /history`
Get user's assessment history.

**Authentication**: Required (JWT)

**Response (200)**:
```json
{
  "success": true,
  "data": [
    {
      "risk_score": 45.67,
      "status": "Low Risk",
      "timestamp": "2026-05-01 14:30",
      "features_json": "[22,0,0,110,170,0,...]"
    }
  ]
}
```

---

### **Profile Endpoints**

#### `PUT /api/profile`
Update user profile (name/email).

**Authentication**: Required (JWT)

**Request Body**:
```json
{
  "name": "string (min 3 chars)" // optional
  "email": "string (valid email)" // optional
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "message": "Profile updated successfully",
    "username": "string"
  }
}
```

---

#### `POST /change-password`
Change user password.

**Authentication**: Required (JWT)

**Request Body**:
```json
{
  "current_password": "string",
  "new_password": "string (min 6 chars)"
}
```

**Notes**:
- Password updates are only allowed once every 15 days.
- If the limit is reached, the response will include an error with the remaining wait time.

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "msg": "Password updated successfully"
  }
}
```

---

### **Chatbot Endpoints**

#### `POST /api/chatbot`
Get AI clinical analysis based on latest assessment.

**Authentication**: Required (JWT)

**Request Body**:
```json
{
  "message": "string (user question)"
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "response": "string (AI response)"
  }
}
```

**Error Response (500)**:
```json
{
  "success": false,
  "error": "API Key is missing"
}
```

---

## Response Format

All endpoints follow this standardized format:

### Success Response
```json
{
  "success": true,
  "data": { /* endpoint-specific data */ }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Descriptive error message"
}
```

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created (registration) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid token) |
| 404 | Not Found |
| 429 | Too Many Requests (rate limit exceeded) |
| 500 | Server Error |
| 504 | Gateway Timeout (AI service timeout) |

---

## Rate Limiting

- **Global**: 200 requests/day, 50 requests/hour
- **Registration**: 5 requests/minute
- **Login**: 10 requests/minute

When rate limit is exceeded, server responds with 429 status.

---

## Feature Ranges

| Feature | Index | Min | Max | Type |
|---------|-------|-----|-----|------|
| Age | 0 | 1 | 120 | Required |
| Sex | 1 | 0 | 1 | Required |
| Chest Pain Type | 2 | 0 | 3 | Required |
| Resting BP | 3 | 60 | 250 | Required |
| Cholesterol | 4 | 100 | 600 | Required |
| Fasting Blood Sugar | 5 | 0 | 1 | Required |
| Resting ECG | 6 | 0 | 2 | Optional |
| Max Heart Rate | 7 | 50 | 220 | Optional |
| Exercise Angina | 8 | 0 | 1 | Optional |
| ST Depression | 9 | 0 | 10 | Optional |
| ST Slope | 10 | 0 | 2 | Optional |
| Major Vessels | 11 | 0 | 4 | Optional |
| Thalassemia | 12 | 1 | 3 | Optional |

---

## Examples

### Example: Predict Risk

```bash
curl -X POST http://127.0.0.1:5001/predict \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "features": [45, 1, 1, 130, 250, 0, 0, 150, 0, 0, 2, 0, 3]
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "status": "High Risk",
    "risk_score": 68.45,
    "recommendation": "Moderate risk. Schedule a preventive screening with your doctor."
  }
}
```

---

## Error Handling

Always check the `success` field:

```javascript
fetch('/api/predict', {...})
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      console.log(data.data); // Access response data
    } else {
      console.error(data.error); // Handle error
    }
  });
```

---

## Security Notes

- All passwords are hashed with bcrypt
- JWTs expire based on Flask-JWT configuration
- CORS allows only localhost:5173 for development
- Sensitive operations require authentication
- Input validation on all endpoints
- Rate limiting protects against brute force

---

## Logging

- **Application logs**: `logs/cvd_app.log`
- **Error logs**: `logs/cvd_errors.log`
- Logs rotate at 10MB with 10 backup files
- All requests and errors are logged

