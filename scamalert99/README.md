# ScamShield AI

ScamShield AI is a full-stack Next.js 15 application for detecting scams in messages, URLs, screenshots, and chat conversations using Google's Gemini API and MongoDB.

## Features

- Message scam detection for SMS, email, WhatsApp, and chat text
- URL risk analysis for phishing, fake domains, typosquatting, and suspicious keywords
- Screenshot analysis using Gemini Vision for fake bank messages, OTP scams, lottery scams, job scams, and fake offers
- AI Scam Coach with explanations, manipulation techniques, safety steps, and reporting suggestions
- MongoDB-backed scam report database
- Analytics dashboard with totals, high-risk alerts, category charts, and risk distribution
- Dark cybersecurity dashboard UI with responsive layouts, loading states, errors, and toast notifications
- Server-side validation, sanitization, rate limiting, and security headers

## Tech Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS
- Node.js API routes
- MongoDB native driver
- Google Gemini API
- Recharts, Lucide icons, Sonner toasts

## Folder Structure

```txt
app/
  api/
    analyze/
      message/route.ts
      screenshot/route.ts
      url/route.ts
    reports/
      [id]/route.ts
      route.ts
  globals.css
  layout.tsx
  page.tsx
components/
  ScamDashboard.tsx
lib/
  gemini.ts
  mongodb.ts
  rate-limit.ts
  reports.ts
  sanitize.ts
  types.ts
  utils.ts
middleware.ts
```

## Environment Variables

Create `.env.local` from `.env.example`:

```bash
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/scamshield_ai
MONGODB_DB=scamshield_ai
```

`GEMINI_MODEL` is optional. The app defaults to `gemini-3.5-flash` and falls back to compatible Flash models if Google returns a model availability error.

## Run Locally

```bash
pnpm install
pnpm dev
```

If you prefer npm, `npm install` and `npm run dev` also work with the same scripts.

Open [http://localhost:3000](http://localhost:3000).

## API Endpoints

### `POST /api/analyze/message`

```json
{
  "content": "Urgent: your bank account will be blocked. Send OTP now."
}
```

### `POST /api/analyze/url`

```json
{
  "url": "https://example.com"
}
```

### `POST /api/analyze/screenshot`

Send `multipart/form-data`:

- `image`: PNG, JPEG, or WebP screenshot, max 5MB
- `context`: optional text context

### `GET /api/reports`

Returns recent reports plus aggregate dashboard stats.

### `POST /api/reports`

Creates a manual report.

### `GET /api/reports/[id]`

Returns one report by MongoDB ObjectId.

## Gemini Prompt Contract

The reusable Gemini service in `lib/gemini.ts` asks Gemini to return only valid JSON:

```json
{
  "scamScore": 0,
  "riskLevel": "Low",
  "category": "",
  "redFlags": [],
  "explanation": "",
  "recommendation": "",
  "coach": {
    "manipulationTechniques": [],
    "safetySteps": [],
    "reportingSuggestions": []
  }
}
```

## Production Notes

- Replace the in-memory rate limiter with Redis, Upstash, or a gateway-level limiter for multi-instance deployments.
- Store only the minimum report content needed for your use case and apply retention policies for sensitive user submissions.
- Keep `GEMINI_API_KEY` and `MONGODB_URI` server-side only. They are never exposed to the browser.
- Add authentication before exposing report history in a public or multi-tenant deployment.
