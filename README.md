# Sarafti

Know before you dine.

Sarafti is a public, community-driven web app that aggregates structured negative dining experience trends. It is designed as a neutral, data-driven signal tool, not a harassment platform.

## 1) Architecture Summary

- Frontend: Next.js App Router, TypeScript strict mode, TailwindCSS (class-based dark mode), Recharts.
- Backend: Next.js Route Handlers (Node runtime), Prisma ORM, PostgreSQL, NextAuth (Google OAuth only).
- Access model:
  - Public read: browse/search/filter/statistics are fully public.
  - Auth required for write actions: submit feedback, edit/delete own submission, create restaurant, report content, admin dashboard.
- Moderation and safety:
  - OpenAI moderation for free text fields.
  - Submission status lifecycle: `PENDING -> APPROVED/REJECTED`.
  - Only approved submissions influence restaurant score.
  - In-memory IP/user rate limiting as baseline anti-abuse control.

## 2) Folder Structure

```text
.
├── prisma
│   ├── schema.prisma
│   └── seed.ts
├── src
│   ├── app
│   │   ├── admin/page.tsx
│   │   ├── api
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── submissions/route.ts
│   │   │   ├── restaurants/route.ts
│   │   │   ├── reports/route.ts
│   │   │   ├── owner-claims/route.ts
│   │   │   └── admin/...
│   │   ├── restaurants/[id]/page.tsx
│   │   ├── restaurants/new/page.tsx
│   │   ├── submit/[restaurantId]/page.tsx
│   │   ├── report/page.tsx
│   │   ├── owner-claim/page.tsx
│   │   ├── terms/page.tsx
│   │   ├── privacy/page.tsx
│   │   ├── guidelines/page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components
│   │   ├── admin/admin-dashboard-client.tsx
│   │   ├── charts/restaurant-charts.tsx
│   │   ├── forms/*.tsx
│   │   ├── navbar.tsx
│   │   ├── providers.tsx
│   │   ├── theme-provider.tsx
│   │   └── theme-toggle.tsx
│   ├── lib
│   │   ├── auth.ts
│   │   ├── authz.ts
│   │   ├── constants.ts
│   │   ├── moderation.ts
│   │   ├── prisma.ts
│   │   ├── rate-limit.ts
│   │   ├── score.ts
│   │   ├── utils.ts
│   │   └── validation.ts
│   ├── middleware.ts
│   └── types/next-auth.d.ts
├── .env.example
├── package.json
└── README.md
```

## 3) Prisma Schema

Core models included:
- `User`
- `Restaurant` (`@@unique([name, city])`)
- `Submission` (`@@unique([userId, restaurantId])`, status: `PENDING | APPROVED | REJECTED`)
- `Report`
- `ModerationLog`
- `OwnerClaim`

NextAuth support models:
- `Account`
- `Session`
- `VerificationToken`

See full schema in [`/Users/tamiradler/dev/sarafti/prisma/schema.prisma`](/Users/tamiradler/dev/sarafti/prisma/schema.prisma).

## 4) Google OAuth Setup (NextAuth)

1. Create Google OAuth credentials in Google Cloud Console.
2. Add authorized redirect URI:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://<your-vercel-domain>/api/auth/callback/google`
3. Set env vars:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
4. Run app and sign in using Google.

Write actions require authenticated + verified email.

## 5) Public Browse Pages

- `/`: public browse, search, filters, card stats (Sarafti Score, submissions, top issues).
- `/restaurants/[id]`: public detail page with:
  - Community Negative Rate
  - Reason distribution chart
  - Rating average
  - Trend over time chart

## 6) Protected Write Routes

Protected by auth checks (and middleware for pages):
- `POST /api/submissions`
- `DELETE /api/submissions`
- `POST /api/restaurants`
- `POST /api/reports`
- `POST /api/admin/submissions/:id/approve`
- `POST /api/admin/submissions/:id/reject`
- `POST /api/admin/submissions/:id/soft-delete`
- `POST /api/admin/restaurants/:id/soft-delete`
- `POST /api/admin/users/:id/shadow-ban`
- `GET /api/admin/spikes`

`/api/owner-claims` is public to allow owner dispute/correction requests.

## 7) Theme System

- Tailwind `darkMode: "class"`
- CSS variable design tokens implemented in `globals.css`.
- Theme toggle (sun/moon) in navbar.
- Defaults to system preference.
- User choice persisted in `localStorage` under `sarafti-theme`.
- Recharts colors use CSS variables (`var(--accent)`, `var(--accent2)`) and adapt automatically.

## 8) Moderation Integration

Free-text content is moderated using OpenAI Moderation API (`omni-moderation-latest`) in `src/lib/moderation.ts`.

Moderated fields:
- Submission `comment`
- Submission `otherReason`
- Report text
- Owner claim message

Logs are stored in `ModerationLog` for admin review.

## 9) Score Calculation Service

Implemented in `src/lib/score.ts`.

Bayesian-adjusted trend score:
- Base rate from structured negative signals and optional rating signal.
- Prior smoothing to avoid low-sample volatility.
- Confidence factor increases with unique reporter count.

Outputs:
- `saraftiScore` (0-100)
- `communityNegativeRate` (0-1)
- `totalSubmissions`
- `averageRating`
- `topIssues`

Recalculated whenever admin approves/rejects/soft-deletes approved submissions.

## 10) Admin Dashboard

Page: `/admin` (Google login + admin role)

Includes:
- Pending submission approvals/rejections
- Soft-delete submissions
- Soft-delete restaurants
- Flagged moderation logs
- Suspicious account detection (high 7-day submission volume)
- Shadow ban toggle
- Abnormal spike detection (last 14 days)

## 11) Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env file and populate values:
   ```bash
   cp .env.example .env
   ```
3. Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```
4. Run migrations:
   ```bash
   npm run prisma:migrate -- --name init
   ```
5. Seed sample data:
   ```bash
   npm run prisma:seed
   ```
6. Start dev server:
   ```bash
   npm run dev
   ```

## 12) Prisma Migration Notes

Development:
```bash
npm run prisma:migrate -- --name <migration_name>
```

Production/Vercel:
```bash
npm run prisma:deploy
```

## 13) Vercel Deployment

1. Push project to GitHub.
2. Import repository in Vercel.
3. Configure environment variables from `.env.example`.
4. Provision PostgreSQL and set `DATABASE_URL`.
5. Set build command: `npm run build`.
6. Add post-deploy migration step:
   - `npm run prisma:deploy`

## Legal Disclaimer

Aggregated community opinions. Not verified factual claims.
