# Scalar Scheduler

A full-stack scheduling platform inspired by Calendly’s core product flow and visual patterns. It supports event type management, timezone-aware availability, public booking pages, meeting history, cancellation, rescheduling, custom invitee questions, and configurable meeting locations such as Google Meet, Zoom, phone calls, or in-person meetings.

## Links

- Live app: `https://scalar-scheduler.vercel.app/`
- Repository: `https://github.com/Nikhilsai-M/Scalar_scheduler`

## Tech Stack

- Frontend: Next.js 16 App Router, React 19
- Backend: Next.js Server Components + Server Actions
- Database: PostgreSQL with Prisma ORM
- Styling: CSS Modules + global CSS
- Email: Nodemailer via SMTP
- Date utilities: `date-fns`
- Icons: `lucide-react`

## Current Features

- Event type management
- Create, edit, delete, and list event types
- Unique public booking URL for each event type
- Event duration, description, buffers, and meeting location
- Meeting location setup
- Google Meet, Zoom, Microsoft Teams, phone call, in-person, or custom
- Optional location details such as links, phone numbers, or addresses
- Location snapshot saved on booked meetings
- Availability management
- Weekly availability by day of week
- Multiple time intervals per day
- Multiple schedules
- Date-specific overrides
- Timezone selection
- Public booking flow
- Calendar-based date selection
- Dynamic available slot generation
- Double-booking prevention with meeting buffers
- Invitee name and email capture
- Custom invitee questions
- Booking confirmation state
- Meetings management
- Upcoming and past meeting views
- Cancel meeting flow
- Reschedule flow
- Booking and cancellation emails

## Project Structure

```text
src/app
  (admin)/
    dashboard/
    event-types/
    availability/
    meetings/
  [slug]/
  reschedule/[meetingId]/
src/lib
prisma
```

## Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://<user>:<password>@<pooled-host>/neondb?sslmode=require"
DIRECT_URL="postgresql://<user>:<password>@<direct-host>/neondb?sslmode=require"

SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
MAIL_FROM="Scalar Scheduler <your-email@gmail.com>"
MAIL_TO="your-email@gmail.com"
```

Notes:

- Use the pooled Neon connection for `DATABASE_URL`.
- Use the direct Neon connection for `DIRECT_URL`.
- `MAIL_TO` is optional. If omitted, host notifications go to the host email stored in the database.
- For Gmail, use an App Password instead of your normal password.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Generate the Prisma client:

```bash
npx prisma generate
```

3. Sync the database schema.

For a fresh database, this is the safest path for the current repo state:

```bash
npx prisma db push
```

If you already have an older database created before the meeting-location feature was added, apply the patch file too:

```bash
npx prisma db execute --file prisma/add-meeting-location.sql --schema prisma/schema.prisma
```

4. Seed sample data:

```bash
node prisma/seed.js
```

5. Start the app:

```bash
npm run dev
```

Then open `http://localhost:3000`.

## Build Checks

```bash
npm run lint
npm run build
```

## Sample Data

The seed script creates:

- A default admin user
- A default working-hours schedule
- A secondary focus-hours schedule
- Sample event types
- Sample custom invitee questions
- Sample meetings
- Sample meeting locations

## Booking and Email Flow

- Invitees book from a public event page.
- Available slots are computed from weekly rules, overrides, existing meetings, and buffers.
- A meeting snapshot stores the event title, timezone, and meeting location at booking time.
- Booking emails are sent to the invitee and host.
- Cancellation emails are sent when the host cancels from the admin side.

## Assumptions

- No auth is required; the app assumes a default admin user is already “logged in”.
- Meeting location is informational only.
  The app does not create real Zoom or Google Meet rooms automatically.
- SMTP is optional for local development, but booking/cancellation email delivery requires valid SMTP credentials.

## Notes About Schema Sync

This repo currently includes:

- the latest Prisma schema in `prisma/schema.prisma`
- a manual SQL patch for meeting-location fields in `prisma/add-meeting-location.sql`

If your deployed or local database was created before the meeting-location feature, run the SQL patch once against that database to avoid `P2022` missing-column errors.

## Known Flow Checks

These were reviewed while updating the project:

- Public booking pages now revalidate after booking and cancellation so availability stays in sync.
- Meeting location is preserved on booked meetings via snapshot fields.
- Rescheduled bookings exclude the original meeting from overlap checks before creating the replacement booking.

Residual risk:

- Because the latest database update is stored as a manual SQL patch instead of a tracked Prisma migration folder, new environments must follow the schema-sync steps above carefully.
