# SortAi — Smart Link Spaces

<div align="center">

**Your AI-Powered Link Intelligence Hub**

Paste any link. SortAi classifies, summarizes, and organizes it into smart spaces — powered by Gemini AI.

</div>

---

## What is SortAi?

SortAi solves the problem of saved links getting lost across Instagram, YouTube, TikTok, Facebook, and the web. It's a UI-first chat interface where you:

1. **Paste a link** into a chat-style input
2. **Gemini AI analyzes** the content automatically
3. **Smart classification** assigns it to a space (Career, Study, Fashion, Fitness, Tech, Entertainment, Life, Other)
4. **Rich metadata** is generated: title, description, tags, reason to save
5. **Browse & search** your organized links anytime

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                  │
│  Vite + TypeScript + Tailwind CSS + Firebase Auth   │
│  Port: 5173                                         │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP + Firebase ID Token
                       ▼
┌─────────────────────────────────────────────────────┐
│                  Backend (Express)                    │
│  Node.js + TypeScript + Firebase Admin               │
│  Port: 8080                                          │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  Scraper     │  │  YouTube API │  │ Gemini AI  │ │
│  │  (cheerio)   │  │  (v3)        │  │ (Flash)    │ │
│  └─────────────┘  └──────────────┘  └────────────┘ │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              Cloud Firestore                         │
│  users/{userId}/links/{linkId}                       │
└─────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer       | Technology                                      |
| ----------- | ----------------------------------------------- |
| Frontend    | React 19, TypeScript, Vite 6, Tailwind CSS 3    |
| Backend     | Node.js, Express, TypeScript                     |
| AI          | Google Gemini (gemini-2.0-flash)                 |
| Auth        | Firebase Authentication (Google Sign-In)         |
| Database    | Cloud Firestore                                  |
| Icons       | Lucide React                                     |
| Scraping    | axios + cheerio                                  |
| YouTube     | YouTube Data API v3                              |
| Deployment  | Docker, Cloud Run, Firebase Hosting              |

---

## Environment Variables

### Frontend (`frontend/.env`)

| Variable                           | Description                     |
| ---------------------------------- | ------------------------------- |
| `VITE_FIREBASE_API_KEY`            | Firebase API key                |
| `VITE_FIREBASE_AUTH_DOMAIN`        | Firebase auth domain            |
| `VITE_FIREBASE_PROJECT_ID`         | Firebase project ID             |
| `VITE_FIREBASE_STORAGE_BUCKET`     | Firebase storage bucket         |
| `VITE_FIREBASE_MESSAGING_SENDER_ID`| Firebase messaging sender ID    |
| `VITE_FIREBASE_APP_ID`             | Firebase app ID                 |
| `VITE_API_URL`                     | Backend API URL (default: `http://localhost:8080`) |

### Backend (`backend/.env`)

| Variable                           | Description                                   |
| ---------------------------------- | --------------------------------------------- |
| `GEMINI_API_KEY`                   | Google Gemini API key                         |
| `YOUTUBE_API_KEY`                  | YouTube Data API v3 key                       |
| `GOOGLE_APPLICATION_CREDENTIALS`   | Path to Firebase service account JSON file    |
| `PORT`                             | Server port (default: `8080`)                 |

---

## Local Setup

### Prerequisites

- Node.js 20+
- npm 10+
- A Firebase project with Authentication (Google provider) and Firestore enabled
- A Gemini API key
- A YouTube Data API v3 key
- (Optional) Docker and Docker Compose

### 1. Clone / navigate to the project

```bash
cd "SORT AI"
```

### 2. Set up environment files

Copy the example env files and fill in your values:

```bash
# Frontend
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your Firebase config

# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys and service account path
```

### 3. Firebase Service Account (for backend)

1. Go to [Firebase Console](https://console.firebase.google.com) → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save the JSON file somewhere secure
4. Set `GOOGLE_APPLICATION_CREDENTIALS` in `backend/.env` to the absolute path of this file

### 4. Deploy Firestore Security Rules

```bash
# Install Firebase CLI if needed
npm install -g firebase-tools

# Login and deploy rules
firebase login
firebase use sortai-c4f60
firebase deploy --only firestore:rules
```

---

## Running Locally

### Option A: Without Docker (recommended for development)

**Terminal 1 — Backend:**
```bash
cd backend
npm install
npm run dev
```
The backend will start on `http://localhost:8080`.

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm run dev
```
The frontend will start on `http://localhost:5173`.

### Option B: With Docker Compose

```bash
docker-compose up --build
```

This starts both services. Frontend at `http://localhost:5173`, backend at `http://localhost:8080`.

---

## Firestore Data Model

```
users/
  {userId}/
    links/
      {linkId}/
        url: string
        source: "youtube" | "instagram" | "tiktok" | "facebook" | "web" | "other"
        space: "Career" | "Study" | "Fashion" | "Fitness" | "Tech" | "Entertainment" | "Life" | "Other"
        title: string
        shortDescription: string
        tags: string[]
        reasonToSave: string
        confidence: "high" | "medium" | "low"
        imageUrl: string | null
        thumbnailUrl: string | null
        createdAt: Timestamp
```

---

## How Gemini Classification Works

1. When a link is submitted, the backend first extracts metadata:
   - **YouTube links**: Uses the YouTube Data API v3 to get title, description, thumbnail, and channel info
   - **All other links**: Uses axios + cheerio to parse JSON-LD, OpenGraph, Twitter Card, and standard HTML meta tags

2. The normalized metadata is sent to Gemini (`gemini-2.0-flash`) with a structured prompt asking it to:
   - Classify the content into one of 8 spaces
   - Generate a clean title
   - Write a 2-3 sentence description
   - Create relevant tags
   - Explain why it's worth saving
   - Rate its confidence level

3. Gemini returns structured JSON which is validated and stored in Firestore.

---

## API Endpoints

### `POST /api/links`
Save and classify a new link.

**Body:**
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

**Response (201):**
```json
{
  "id": "abc123",
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "source": "youtube",
  "space": "Entertainment",
  "title": "Rick Astley - Never Gonna Give You Up",
  "shortDescription": "The iconic 1987 music video...",
  "tags": ["music", "80s", "pop"],
  "reasonToSave": "Classic music video...",
  "confidence": "high",
  "thumbnailUrl": "https://i.ytimg.com/vi/...",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### `GET /api/links?space=Tech&q=react`
Get saved links with optional space filter and text search.

### `GET /api/spaces-summary`
Get link counts per space.

---

## Current Limitations

- **Instagram / TikTok / Facebook**: These platforms actively block scraping. The app uses generic HTML metadata extraction which may return limited information. The Gemini classification will still work based on available URL patterns and any metadata that can be extracted.
- **YouTube**: Uses the official YouTube Data API v3 for reliable metadata extraction.
- **Rate Limiting**: No rate limiting is implemented on the API yet.
- **Pagination**: Link fetching currently returns all links per space without pagination.
- **Real-time updates**: The app polls for data rather than using Firestore real-time listeners.

---

## Deployment

### Frontend → Firebase Hosting (or App Hosting)

```bash
cd frontend
npm run build

# Using Firebase CLI
firebase init hosting
# Set public directory to "dist"
firebase deploy --only hosting
```

### Backend → Google Cloud Run

```bash
cd backend

# Build and push Docker image
gcloud builds submit --tag gcr.io/sortai-c4f60/sortai-backend

# Deploy to Cloud Run
gcloud run deploy sortai-backend \
  --image gcr.io/sortai-c4f60/sortai-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "GEMINI_API_KEY=your-key,YOUTUBE_API_KEY=your-key"
```

After deployment, update `VITE_API_URL` in the frontend to point to the Cloud Run URL.

---

## Security Notes

- Firestore rules enforce that users can only read/write their own data
- The backend verifies Firebase ID tokens on authenticated endpoints
- API keys are stored in environment variables, never hardcoded
- For production, add rate limiting, input sanitization, and CORS restrictions
- Consider adding Content Security Policy headers

---

## License

MIT
