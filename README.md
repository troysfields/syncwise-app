# CMU AI Calendar by SyncWise AI

**AI-powered academic dashboard that syncs D2L Brightspace assignments and Outlook calendar events into one smart interface.**

CMU AI Calendar is a productivity tool built for students and instructors at Colorado Mesa University. Students see all their deadlines in one place with AI-powered prioritization and an AI chatbot assistant. Instructors can view submissions, manage due dates, and post announcements from a single dashboard. Currently in consent-based beta (students provide their D2L iCal feed URL), with full D2L Valence API integration as the end goal once IT grants access.

## Features

- **D2L Brightspace Integration** — Automatically pulls assignments, due dates, and grades via OAuth 2.0
- **Outlook Calendar Sync** — Imports classes, meetings, and events from your university Outlook calendar and auto-syncs new due dates
- **AI Prioritization** — Ranks tasks by due date, point value, and workload so you know what to tackle first
- **Email Suggested Events** — Scans your Outlook inbox for group projects, campus events, office hours, and more. Accept, dismiss, or snooze suggestions with one click.
- **Smart Notifications** — Events happening in <24 hours get urgency flags and auto-sort to the top so you never miss time-sensitive stuff
- **Calendar Views** — Day, Week, and Month views with color-coded events and clickable navigation
- **Instructor Dashboard** — Full instructor suite: calendar views, all D2L item types, submission rate bars, grading alerts, needs attention queue, announcement composer, student view calendar, manual events
- **Error Detection & Alerts** — Three-tier system: student-friendly toasts, admin health dashboard, and Claude-readable error reports for fast debugging
- **Feedback System** — Always-available feedback panel with checkboxes, fill-in-the-blank prompts, and admin dashboard for aggregated results
- **Full D2L Content** — Pulls all item types: assignments, quizzes, discussions, announcements, content modules, checklists, and syllabus documents
- **Item Controls** — Mark complete, remove from calendar, manually adjust dates. Auto-adds items with due dates; confirm/deny for items without
- **Needs Attention** — Smart list highlighting unsubmitted items due soon, unread announcements, new grades, and items needing action
- **Grade Alerts** — Card-style notifications when new grades are posted with percentage and point breakdown
- **Course Progress** — Per-course completion tracking with visual progress bars
- **Sidebar Navigation** — Collapsible sidebar with role-based sections, mobile responsive
- **Dark Mode** — System-aware light/dark theme toggle
- **Notification System** — Browser push + in-app bell center with customizable preferences: per-type controls, timing, quiet hours, per-course overrides, preset profiles
- **Manual Calendar Entries** — Create personal study blocks, reminders, meetings, and events with repeat options
- **Focus Mode** — Strips dashboard to just today's tasks and needs attention items
- **Export My Week** — Quick copy of weekly schedule to clipboard
- **Analytics Telemetry** — Redis-backed tracking of all AI usage, token costs, feature adoption, auth events, errors. 90-day retention with admin dashboard.
- **Accessibility** — Keyboard navigation, screen readers, focus indicators, reduced motion, high contrast
- **Rate Limiting & Cost Control** — Per-student rate limits with auto Sonnet→Haiku model switching, global daily token budget, admin usage dashboard
- **AI Chatbot** — 7 capabilities: platform help, issue reporting, workload check, email drafts, feedback, study planning, quick actions. Powered by Claude Haiku 4.5.
- **Persistent Accounts** — Email/password signup with Upstash Redis, HMAC-signed session cookies, security email alerts via Resend
- **Security Hardened** — HMAC-signed httpOnly cookies, CSP/HSTS/CORS headers, per-route rate limiting, 8-char password minimum, admin auth via headers only, fail-closed admin access
- **FERPA Compliant** — Individual consent, read-only student access, Redis-backed audit logging, privacy policy page at /privacy

## Security

CMU AI Calendar follows security best practices for handling student data:

- All secrets stored in Vercel environment variables — never committed to code
- HMAC-SHA256 signed httpOnly cookies with 30-day expiry and timing-safe comparison
- All 19 API routes require authentication via requireAuth middleware
- Admin endpoints use x-admin-secret header authentication (fail-closed if not configured)
- Per-route rate limiting: AI routes (20/min chat, 10/min prioritize), auth (10/min), forgot-pw (3/min)
- CSP, HSTS, CORS whitelist, Permissions-Policy, X-Frame-Options headers
- 8-128 character password enforcement
- Security email alerts via Resend for new signups, failed logins, password resets
- Redis-backed analytics tracks all interactions for audit compliance
- Privacy policy hosted at /privacy
- Full FERPA compliance with individual consent and read-only student access

## Tech Stack

- **Frontend/Backend:** Next.js 16 (React 19), Turbopack builds
- **Database:** Upstash Redis (free tier, persistent accounts, analytics, security logs)
- **Auth:** HMAC-SHA256 signed httpOnly cookies (30-day expiry)
- **AI:** Claude API (Anthropic) — Haiku 4.5 for chatbot/prioritization
- **Email:** Resend (transactional — signup alerts, security notifications, password reset)
- **Hosting:** Vercel (free tier, auto-deploys from GitHub)
- **Data Sources (beta):** D2L iCal feeds, instructor PDF/DOCX uploads, Claude AI
- **Data Sources (end goal):** Full D2L Valence API + Microsoft Graph API

## Live Site

[syncwise-app.vercel.app](https://syncwise-app.vercel.app)

## Local Development

```bash
git clone https://github.com/troysfields/syncwise-app.git
cd syncwise-app
npm install
cp .env.example .env.local
# Fill in your API credentials in .env.local
npm run dev
```

Open [localhost:3000](http://localhost:3000) — runs in demo mode without credentials.

## Status

Consent-based beta is live and pulling real D2L data via iCal feeds. AI chatbot and prioritization verified working in production. Full D2L Valence API access remains the end goal — the iCal feed approach is a stepping stone to demonstrate the product works safely before IT grants full API access. Beta pilot planned for Spring 2026 at Colorado Mesa University with one ENTR 450 class section (~30 students, 1 instructor).

## Contact

Troy Fields — [troysfields@gmail.com](mailto:troysfields@gmail.com)
ENTR 450 — Professor Jouflas, Colorado Mesa University
