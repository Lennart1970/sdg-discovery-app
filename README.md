# SDG Challenge Discovery Platform

A full-stack application for discovering affordable technology solutions for sustainable development challenges.

## Overview

This platform helps users:
1. **Extract** solution-free sustainability challenges from SDG documents
2. **Discover** plausible technology pathways under €10,000 budget constraint
3. **Explore** existing, widely available technology classes (not products)

## Architecture

### Stack
- **Frontend**: React 19 + Tailwind CSS 4 + tRPC
- **Backend**: Express 4 + tRPC 11
- **Database**: MySQL/TiDB (Supabase compatible)
- **Auth**: Manus OAuth
- **LLM**: OpenAI GPT-4o-mini with structured outputs
- **Deployment**: Manus Platform (built-in hosting)

### Two-Agent System

**1. Challenge Extractor Agent**
- Analyzes SDG documents to extract solution-free challenges
- Filters out marketing, proposals, and vaporware
- Scores challenges for clarity and actionability (confidence ≥60%)
- Identifies SDG goals, geography, target groups, and sectors

**2. Technology Discovery Agent**
- Discovers plausible technology pathways for challenges
- Enforces €10,000 budget constraint
- Reasons from functions → principles → technology classes
- Focuses on existing, widely available technology
- Outputs 2-3 paths with cost bands, feasibility, and risks

### Database Schema

- `users` - User accounts and authentication
- `organizations` - SDG organizations (UN, MDB, EU, governments, NGOs, corporates)
- `source_feeds` - Document sources and feeds
- `challenges` - Extracted sustainability challenges
- `tech_discovery_runs` - Technology discovery executions
- `tech_paths` - Discovered technology pathways

## Setup

### Prerequisites
- Node.js 22+
- pnpm 10+
- MySQL/TiDB database (or Supabase)

### Installation

```bash
# Install dependencies
pnpm install

# Configure environment variables
cp .env.example .env
# Edit .env with your database URL and OpenAI API key

# Push database schema
pnpm db:push

# Seed database with 18 organizations and source feeds
pnpm exec tsx server/seed.ts

# Start development server
pnpm dev
```

### Environment Variables

Required:
- `DATABASE_URL` - MySQL/TiDB connection string
- `BUILT_IN_FORGE_API_KEY` - OpenAI API key (provided by Manus platform)
- `JWT_SECRET` - Session cookie signing secret
- `VITE_APP_ID` - Manus OAuth application ID
- `OAUTH_SERVER_URL` - Manus OAuth backend URL
- `VITE_OAUTH_PORTAL_URL` - Manus login portal URL

## Usage

### 1. Extract Challenges

Navigate to `/extract` and paste SDG document text. The Challenge Extractor Agent will:
- Identify solution-free challenges
- Extract metadata (SDG goals, geography, sectors)
- Score each challenge for confidence
- Save challenges with confidence ≥60%

### 2. Discover Technology Paths

Click on any challenge to view details, then click "Discover Technology Paths". The Technology Discovery Agent will:
- Analyze the challenge statement
- Identify core functions and underlying principles
- Discover 2-3 plausible technology pathways
- Provide cost bands, feasibility explanations, and risks

### 3. Explore Results

Browse all challenges on the homepage (`/`) and click through to see discovered technology paths.

## Testing

```bash
# Run all tests
pnpm test

# Tests include:
# - tRPC procedure tests
# - Agent integration tests
# - End-to-end challenge extraction
# - End-to-end technology discovery
```

## Structured Logging

All LLM interactions are logged in JSON format for auditability:

```json
{
  "timestamp": "2026-01-11T06:30:00.000Z",
  "agent": "technology_discovery",
  "operation": "discover_paths",
  "userId": 1,
  "challengeId": 14,
  "model": "gpt-4o-mini",
  "rawPrompt": "SYSTEM:\n...\n\nUSER:\n...",
  "rawResponse": "{...}",
  "status": "success",
  "metadata": { "pathCount": 3 }
}
```

## Key Features

✅ **Constraint-Driven Discovery** - €10k budget enforced  
✅ **Structured Outputs** - Guaranteed JSON schema from LLM  
✅ **No Brands/SKUs** - Technology classes only  
✅ **Full Auditability** - Raw prompts and responses logged  
✅ **Type-Safe** - End-to-end type safety with tRPC  
✅ **Tested** - 6/6 tests passing  

## Philosophy

> "Given this problem and these constraints — what is already possible?"

This is a **directional intelligence system**, not a product recommendation engine. It reveals possibilities through constraint-driven reasoning, focusing on:
- Problems first (solution-free challenges)
- Existing technology (widely available)
- Human-scale solutions (€10k constraint)
- Technology classes (not specific products)

## Contributing

See `todo.md` for planned features and improvements.

## License

MIT
