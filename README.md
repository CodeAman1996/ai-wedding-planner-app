# AI Wedding Planner Backend

Node.js + TypeScript backend for an AI-powered wedding planning app focused on pre-wedding location discovery. The system stores user onboarding data, offers preloaded vibe suggestions from the database, uses an LLM to convert vibes into structured search intent, queries OpenStreetMap-based services for real places, and saves planning memory in PostgreSQL as a lightweight knowledge base.

## Current setup

This project is currently intended to run with:

- PostgreSQL locally on your machine through your existing pgAdmin/PostgreSQL server
- Redis in Docker
- Node.js backend locally
- Gemini as the primary LLM
- Nominatim + Overpass as the free location-data stack

That means:

- Postgres is not expected to run in Docker for your current workflow
- Redis can run in Docker on `localhost:6379`
- The app connects to both through `.env`
- no Google Maps billing is required

## Stack

- Node.js + Express
- TypeScript
- PostgreSQL + Prisma
- Redis caching with in-memory fallback
- Nominatim for geocoding
- Overpass API for POI and place discovery
- LLM abstraction with `Gemini`, `Ollama`, or `mock`
- Pino structured logging

## Core idea

The backend works in this order:

1. Onboard the couple and store profile details.
2. Fetch available vibes from the database for autosuggestion.
3. Accept selected vibes and optional free-text preferences.
4. Retrieve relevant memory from a PostgreSQL knowledge base.
5. Send the vibe + memory context to the LLM.
6. Convert that into structured location intent.
7. Geocode the requested city with Nominatim.
8. Search nearby vibe-matching places with Overpass.
9. Rank the places based on vibe fit and available OSM signals.
10. Save the outcome back into the knowledge base for future recommendations.

## Knowledge base design

This project uses a simple RAG-style memory system without a vector database.

Main models:

- `User`
- `CoupleProfile`
- `VibeOption`
- `KnowledgeDocument`
- `KnowledgeChunk`

How it works:

- onboarding creates or updates the user and profile
- profile details are saved as a knowledge document
- recommendation results are also saved as knowledge documents
- each document is split into text chunks
- retrieval is done with keyword and text matching inside PostgreSQL

This gives you memory and reuse of prior context without introducing embeddings yet.

## API endpoints

- `GET /health`
- `GET /api/v1/vibes`
- `POST /api/v1/vibes/seed`
- `POST /api/v1/users/onboard`
- `GET /api/v1/users/:userId/knowledge`
- `POST /api/v1/recommendations/locations`

## Environment setup

Create `.env` in the project root.

Example:

```env
NODE_ENV=development
PORT=4000

DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/ai_wedding_planner?schema=public
REDIS_URL=redis://localhost:6379

GEMINI_API_KEY=your_gemini_api_key
OLLAMA_BASE_URL=http://127.0.0.1:11434
LLM_PROVIDER=gemini
LLM_MODEL=gemini-2.5-flash-lite

NOMINATIM_BASE_URL=https://nominatim.openstreetmap.org
OVERPASS_API_URL=https://overpass-api.de/api/interpreter
OSM_USER_AGENT=ai-wedding-planner/0.1 (contact: your-email@example.com)

CACHE_TTL_SECONDS=3600
BASE_SEARCH_RADIUS_KM=25
EXPANDED_SEARCH_RADIUS_KM=80
MAX_LOCATION_RESULTS=12
```

## Local PostgreSQL setup

You are using PostgreSQL locally through pgAdmin, which is perfectly fine.

Requirements:

- PostgreSQL server running on your machine
- database `ai_wedding_planner` already created
- correct username/password in `DATABASE_URL`

pgAdmin is only the UI. Prisma connects to the actual PostgreSQL server using the connection string in `.env`.

Typical local values:

- host: `localhost`
- port: `5432`
- database: `ai_wedding_planner`
- user: usually `postgres`

## Redis setup with Docker

Run Redis in Docker:

```powershell
docker run -d --name ai-wedding-redis -p 6379:6379 redis:7-alpine
```

Useful Redis Docker commands:

```powershell
docker ps
docker stop ai-wedding-redis
docker start ai-wedding-redis
docker rm -f ai-wedding-redis
```

If Redis is not available, the app still works in development because it falls back to in-memory caching.

Redis is disabled by default right now through:

```env
ENABLE_REDIS=false
```

When you want to enable it later, set:

```env
ENABLE_REDIS=true
REDIS_URL=redis://localhost:6379
```

## Install and run

From the project folder:

```powershell
cd "C:\Users\Aman\Downloads\AI Wedding planner app"
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

If you make a schema change and want a named migration:

```powershell
npm run prisma:migrate -- --name your_migration_name
```

## Test the AI directly from terminal

If you want to test only the AI layer without calling the Express API routes, use:

```powershell
npm run ai:test -- --city Jaipur --vibes peaceful-green,romantic --text "We want calm hidden places with greenery"
```

This calls the LLM client directly from the terminal.

If you want to test without any external LLM call, set this in `.env` first:

```env
LLM_PROVIDER=mock
```

Then run the same command and you will get a local deterministic AI-style response with no Gemini request.

## Test the full AI + place search flow from terminal

If you want the AI and place search to work together from terminal, use:

```powershell
npm run planner:test -- --email riya@example.com --name Riya --partner Arjun --city Jaipur --vibes peaceful-green,romantic --text "We want calm hidden places with greenery"
```

This command does the full synced flow:

1. upserts the couple in PostgreSQL
2. stores profile memory in the knowledge base
3. asks the LLM to interpret the vibes
4. geocodes the city with Nominatim
5. searches places with Overpass
6. ranks places and prints the final result in terminal

## Sample API payloads

### Onboard user

```json
{
  "email": "riya@example.com",
  "firstName": "Riya",
  "partnerName": "Arjun",
  "homeCity": "Jaipur",
  "preferredBudget": "mid-range",
  "preferredRadiusKm": 40
}
```

### Recommend locations

```json
{
  "userId": "user_cuid_here",
  "city": "Jaipur",
  "selectedVibes": ["peaceful-green", "romantic"],
  "freeText": "We want calm hidden places with lots of greenery"
}
```

## Free location data stack

This project now uses free OpenStreetMap-based services instead of Google Maps APIs.

Services:

- [Nominatim search docs](https://nominatim.org/release-docs/5.0/api/Search/)
- [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/)
- [Overpass API wiki](https://wiki.openstreetmap.org/wiki/Overpass_API)

Important notes:

- the public Nominatim service has strict usage limits
- public Nominatim usage should stay below 1 request per second
- you should send a valid `User-Agent`
- you should cache results
- Overpass is better than Nominatim for category-style place discovery

That is why this backend uses:

- Nominatim for city geocoding
- Overpass for actual place search
- Redis for caching repeated requests

## LLM choice

### Best choice for this project

Use `Gemini 2.5 Flash-Lite` as the default model.

Why:

- low latency
- good structured JSON output
- good fit for classification and planning tasks
- easier hosted setup than self-hosting local models
- works well as the reasoning layer on top of OSM data

Current project default:

- `LLM_PROVIDER=gemini`
- `LLM_MODEL=gemini-2.5-flash-lite`

### Free alternatives

Hosted free option:

- [Gemini billing](https://ai.google.dev/gemini-api/docs/billing/)
- [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini quota](https://ai.google.dev/gemini-api/docs/quota)

Fully local option:

- [Gemma 3 overview](https://ai.google.dev/gemma/docs/core)
- [Gemma 3 model card](https://ai.google.dev/gemma/docs/core/model_card_3)
- [Ollama Gemma 3](https://ollama.com/library/gemma3)
- [Ollama Qwen3](https://ollama.com/library/qwen3)

Recommendation:

- use `Gemini` for the MVP
- keep `Ollama` as a local fallback if you want zero hosted model cost

## Free-friendly deployment

Recommended deployment stack:

- API on [Render free web service](https://render.com/docs/free)
- Postgres on [Neon free plan](https://neon.com/pricing)
- Redis on [Upstash free tier](https://upstash.com/docs/redis/overall/pricing)

Notes:

- Render free services can cold start after inactivity
- Neon is a better long-term free Postgres option than temporary free hosted Postgres offers
- Upstash works well for managed Redis caching in production
- public Nominatim and Overpass are okay for MVP-scale testing, but not ideal for high production volume

For your current local development flow, keep using:

- local PostgreSQL
- Docker Redis

## Suggested next features

- vendor recommendation module
- outfit and color palette suggestions
- weather-aware shoot planning
- budget-aware recommendation scoring
- wedding itinerary generation
- invitation and caption generation
- saved favorites and shortlist APIs
- city expansion and nearby-area intelligence

## Important notes

- The LLM should classify and explain, not invent real places.
- OpenStreetMap-based services are now the source of truth for actual locations in this MVP.
- Redis is for cost reduction and response speed.
- PostgreSQL is the main source of truth for users, vibes, and knowledge memory.
- The knowledge base is a good first RAG layer before introducing embeddings or vector search later.
