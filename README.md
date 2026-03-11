# SyncWise AI — Beta App

Smart academic dashboard that syncs D2L Brightspace and Outlook into one interface with AI-powered task prioritization.

## What It Does

**For Students:** See all your assignments and calendar events in one dashboard. AI tells you what to work on first based on due dates, point values, and your workload.

**For Instructors:** Create assignments, edit due dates, and post content to D2L from a single interface. Every action requires confirmation before executing.

## Tech Stack

- **Framework:** Next.js (React)
- **Auth:** NextAuth.js (Microsoft Azure AD) + D2L OAuth 2.0
- **APIs:** D2L Brightspace Valence API, Microsoft Graph API
- **AI:** Claude API (Anthropic) with local scoring fallback
- **Hosting:** Vercel

## Setup

```bash
npm install
cp .env.example .env.local
# Fill in your API credentials in .env.local
npm run dev
```

Open [localhost:3000](http://localhost:3000) — runs in demo mode without credentials.

## Pages

- `/login` — CMU Microsoft + D2L sign-in
- `/dashboard` — Student view (assignments, calendar, AI suggestions)
- `/instructor` — Instructor view (create/edit assignments with confirmation)
- `/api/log` — API activity logs for IT auditing

## Environment Variables

See `.env.example` for all required credentials. You need:
- D2L OAuth client ID/secret (from CMU IT)
- Azure AD app registration (from CMU IT)
- AI API key (Anthropic or OpenAI)

## Status

Beta — awaiting API access approval from CMU IT for Spring 2026 pilot.

## Contact

Troy Fields — troysfields@gmail.com
ENTR 450 — Professor Jouflas, Colorado Mesa University
