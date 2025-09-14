# 🔌 API Reference

## Overview

The Sakinah API follows RESTful conventions with Islamic-centered design principles. All endpoints require authentication except for public content.

**Base URL**: `https://your-domain.com/api`

## Authentication

All protected endpoints require a Bearer token from Supabase Auth:

```bash
Authorization: Bearer <supabase_jwt_token>
```

### Getting a Token
```typescript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

## Core Endpoints

### Health Check

#### GET /health
Check API availability.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## Tazkiyah System

### Get Plan Suggestion

#### POST /tazkiyah/suggest
Get AI-powered spiritual plan suggestions without creating a plan.

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request**:
```json
{
  "mode": "takhliyah", // or "tahliyah"
  "input": "anger"
}
```

**Response**:
```json
{
  "suggestion": {
    "kind": "takhliyah",
    "target": "anger",
    "microHabits": [
      {
        "title": "Make istighfar 10 times when feeling angry",
        "schedule": "daily",
        "target": 1
      },
      {
        "title": "Recite Surah Al-Fatiha with contemplation",
        "schedule": "daily",
        "target": 1
      }
    ],
    "relatedContent": [
      {
        "id": "uuid-here",
        "type": "hadith",
        "text": "The strong is not the one who overcomes people...",
        "ref": "Bukhari",
        "tags": ["anger", "self-control"]
      }
    ]
  }
}
```

### Create Plan

#### POST /tazkiyah/create
Create and save a spiritual development plan.

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request**:
```json
{
  "mode": "takhliyah",
  "input": "anger"
}
```

**Response**:
```json
{
  "plan": {
    "id": "uuid-here",
    "userId": "uuid-here",
    "kind": "takhliyah",
    "target": "anger",
    "microHabits": [...],
    "contentIds": ["uuid1", "uuid2"],
    "status": "active",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

## Plans Management

### Get Active Plans

#### GET /plans/active
Retrieve user's active spiritual plans.

**Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "plans": [
    {
      "id": "uuid-here",
      "kind": "takhliyah",
      "target": "anger",
      "microHabits": [...],
      "status": "active",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Archive Plan

#### PATCH /plans/:id/archive
Archive a completed or unwanted plan.

**Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true
}
```

---

## Habit Tracking

### Get User Habits

#### GET /habits
Retrieve all habits for the authenticated user.

**Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "habits": [
    {
      "id": "uuid-here",
      "title": "Make istighfar 10 times after each prayer",
      "streakCount": 7,
      "lastCompletedOn": "2024-01-15",
      "plan": {
        "target": "anger",
        "kind": "takhliyah"
      }
    }
  ]
}
```

### Toggle Habit Completion

#### POST /habits/:id/toggle
Mark a habit as completed or incomplete for today.

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request**:
```json
{
  "completed": true
}
```

**Response**:
```json
{
  "streakCount": 8,
  "khayrPointsEarned": 15,
  "newAchievements": ["week_streak"]
}
```

---

## Self-Reflection (Muhasabah)

### Get Check-ins

#### GET /checkins
Retrieve recent check-in entries.

**Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:
- `limit` (optional): Number of entries to return (default: 7)

**Response**:
```json
{
  "checkins": [
    {
      "id": "uuid-here",
      "date": "2024-01-15",
      "mood": 1,
      "intention": "Focus on patience with family",
      "reflection": "Struggled with patience during rush hour...",
      "createdAt": "2024-01-15T18:00:00Z"
    }
  ]
}
```

### Create Check-in

#### POST /checkins
Create a new daily check-in entry.

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request**:
```json
{
  "mood": 1,
  "intention": "Focus on gratitude today",
  "reflection": "Alhamdulillah for another day..."
}
```

**Response**:
```json
{
  "checkin": {
    "id": "uuid-here",
    "date": "2024-01-15",
    "mood": 1,
    "intention": "Focus on gratitude today",
    "reflection": "Alhamdulillah for another day...",
    "createdAt": "2024-01-15T18:00:00Z"
  }
}
```

---

## Spiritual Journal

### Get Journal Entries

#### GET /journals
Retrieve user's journal entries.

**Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:
- `limit` (optional): Number of entries to return (default: 20)

**Response**:
```json
{
  "entries": [
    {
      "id": "uuid-here",
      "content": "Today I reflected on Surah Al-Fatiha...",
      "tags": ["quran", "reflection", "fatiha"],
      "createdAt": "2024-01-15T19:00:00Z"
    }
  ]
}
```

### Create Journal Entry

#### POST /journals
Create a new journal entry.

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request**:
```json
{
  "content": "Today I reflected on the meaning of patience...",
  "tags": ["patience", "reflection", "sabr"]
}
```

**Response**:
```json
{
  "entry": {
    "id": "uuid-here",
    "content": "Today I reflected on the meaning of patience...",
    "tags": ["patience", "reflection", "sabr"],
    "createdAt": "2024-01-15T19:00:00Z"
  }
}
```

---

## Social Circles

### Get User Circles

#### GET /circles
Retrieve circles the user is a member of.

**Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "circles": [
    {
      "id": "uuid-here",
      "name": "Fajr Warriors",
      "description": "Supporting each other in consistent Fajr prayer",
      "memberCount": 5,
      "maxMembers": 7,
      "isAnonymous": false,
      "sharedGoal": "Pray Fajr consistently for 30 days",
      "role": "creator"
    }
  ]
}
```

### Create Circle

#### POST /circles
Create a new spiritual circle.

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request**:
```json
{
  "name": "Patience Builders",
  "description": "Learning sabr together",
  "maxMembers": 5,
  "isAnonymous": false,
  "sharedGoal": "Practice patience in daily interactions"
}
```

**Response**:
```json
{
  "circle": {
    "id": "uuid-here",
    "name": "Patience Builders",
    "description": "Learning sabr together",
    "maxMembers": 5,
    "isAnonymous": false,
    "sharedGoal": "Practice patience in daily interactions",
    "status": "active",
    "createdAt": "2024-01-15T20:00:00Z"
  }
}
```

### Join Circle

#### POST /circles/join
Join an existing circle.

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request**:
```json
{
  "circleId": "uuid-here"
}
```

**Response**:
```json
{
  "success": true
}
```

### Get Circle Encouragements

#### GET /circles/:id/encouragements
Get messages within a circle.

**Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "encouragements": [
    {
      "id": "uuid-here",
      "message": "May Allah grant us all patience in our trials",
      "type": "dua",
      "fromUserId": "uuid-here",
      "createdAt": "2024-01-15T21:00:00Z"
    }
  ]
}
```

### Send Encouragement

#### POST /circles/:id/encouragements
Send a message to circle members.

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request**:
```json
{
  "message": "Remember, Allah is with the patient ones",
  "type": "encouragement",
  "toUserId": "uuid-here" // optional, for targeted message
}
```

**Response**:
```json
{
  "encouragement": {
    "id": "uuid-here",
    "message": "Remember, Allah is with the patient ones",
    "type": "encouragement",
    "fromUserId": "uuid-here",
    "toUserId": "uuid-here",
    "createdAt": "2024-01-15T21:30:00Z"
  }
}
```

---

## Gamification & Stats

### Get User Stats

#### GET /stats
Retrieve user's spiritual progress statistics.

**Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "stats": {
    "userId": "uuid-here",
    "totalKhayrPoints": 1250,
    "currentStreak": 15,
    "longestStreak": 28,
    "habitsCompleted": 125,
    "plansCompleted": 2,
    "level": 2,
    "achievements": ["first_habit", "week_streak", "first_plan"],
    "lastUpdated": "2024-01-15T22:00:00Z"
  },
  "achievements": [
    {
      "id": "first_habit",
      "title": "First Step",
      "description": "Complete your first habit",
      "icon": "🌱",
      "khayrReward": 50,
      "condition": {
        "type": "habits_completed",
        "target": 1
      }
    }
  ],
  "userAchievements": ["first_habit", "week_streak", "first_plan"]
}
```

### Get Leaderboard (Optional)

#### GET /stats/leaderboard
Get top users by Khayr points (if enabled).

**Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:
- `limit` (optional): Number of users to return (default: 10)

**Response**:
```json
{
  "leaderboard": [
    {
      "userId": "uuid-here",
      "totalKhayrPoints": 2500,
      "level": 3,
      "displayName": "Anonymous Muslim" // or actual name if not anonymous
    }
  ]
}
```

---

## Content Management

### Get Islamic Content

#### GET /content
Retrieve curated Islamic content (public endpoint).

**Query Parameters**:
- `tags` (optional): Comma-separated tags (e.g., "patience,sabr")
- `type` (optional): Content type ("ayah", "hadith", "dua", "note")
- `limit` (optional): Number of items to return (default: 10)

**Response**:
```json
{
  "items": [
    {
      "id": "uuid-here",
      "type": "ayah",
      "text": "And give good tidings to the patient",
      "ref": "Surah Al-Baqarah 2:155",
      "tags": ["patience", "sabr", "trials"],
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

## AI Assistance

### Get Spiritual Explanation

#### POST /ai/explain
Get AI explanation for spiritual struggles (optional feature).

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request**:
```json
{
  "struggle": "I feel overwhelmed with anger when people are unjust"
}
```

**Response**:
```json
{
  "guidance": "Anger in the face of injustice is natural, but Islam teaches us to channel it constructively...",
  "refs": [
    "Surah Ash-Shura 42:40",
    "Bukhari - Hadith on controlling anger"
  ]
}
```

---

## Error Handling

### Standard Error Response
```json
{
  "error": "Error message here",
  "code": "ERROR_CODE",
  "details": "Additional details if available"
}
```

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

### Rate Limiting

- **General endpoints**: 100 requests per 15 minutes
- **AI endpoints**: 20 requests per 15 minutes
- Rate limit headers included in responses:
  ```
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 95
  X-RateLimit-Reset: 1642252800
  ```

## API Client Examples

### JavaScript/TypeScript
```typescript
const api = {
  // Create authenticated API call
  call: async (endpoint: string, options: RequestInit = {}) => {
    const token = await getSupabaseToken();

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    return response.json();
  },

  // Create a habit completion
  toggleHabit: (habitId: string, completed: boolean) =>
    api.call(`/habits/${habitId}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ completed })
    })
};
```

### curl Examples
```bash
# Get user habits
curl -X GET "https://api.sakinah.app/habits" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Create check-in
curl -X POST "https://api.sakinah.app/checkins" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mood": 1, "intention": "Focus on gratitude"}'

# Get Islamic content
curl -X GET "https://api.sakinah.app/content?tags=patience&type=ayah&limit=5"
```

---

This API is designed with Islamic values in mind, emphasizing privacy, spiritual benefit, and authentic Islamic guidance. All endpoints support the user's journey toward spiritual purification and closeness to Allah.