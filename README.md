# Scalar Scheduler

A full-stack scheduling platform inspired by Calendly's core UI and UX.

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19
- **Backend:** Next.js Server Actions
- **Database:** Prisma ORM with SQLite for local development, easily swappable to PostgreSQL
- **Styling:** Vanilla CSS with CSS Modules
- **Icons:** `lucide-react`
- **Email:** SMTP via `nodemailer`
- **Date Management:** `date-fns`

## Features Implemented

1. **Event Types Management**: Create, edit, delete, and share event types with unique public links.
2. **Availability Settings**: Configure weekly working hours, multiple time ranges, and timezone.
3. **Public Booking Flow**:
   - Month calendar with available dates
   - Dynamic time slot generation from saved availability
   - Double-booking prevention
   - Invitee name and email capture
   - Booking confirmation state
   - Real SMTP booking emails to the invitee and host inbox
4. **Meetings Dashboard**:
   - Upcoming and past meetings
   - Cancellation flow
   - Real SMTP cancellation emails to the invitee and host inbox

## Setup Instructions

### 1. Requirements

- Node.js 18+
- NPM

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="file:./dev.db"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
MAIL_FROM="Scalar Scheduler <your-email@gmail.com>"
MAIL_TO="your-email@gmail.com"
```

Notes:
- `MAIL_TO` is optional. If omitted, host/admin notifications go to the host user email stored in the database.
- For Gmail, use a Google App Password instead of your normal account password.
- To use PostgreSQL later, change the Prisma datasource provider and replace `DATABASE_URL`.

### 3. Install Dependencies

```bash
npm install
```

### 4. Database Initialization

```bash
npx prisma db push
npx prisma generate
node prisma/seed.js
```

### 5. Start Development Server

```bash
npm run dev
```

Navigate to `http://localhost:3000`.

## Email Flow

- When someone books a meeting, the app sends:
  - a confirmation email to the invitee
  - a notification email to your inbox
- When a meeting is canceled from the admin side, the app sends:
  - a cancellation email to the invitee
  - a cancellation update to your inbox

## Assumptions

- A default user is treated as logged in for the admin side.
- SMTP credentials are provided through environment variables.
- SQLite is used locally for easy setup; PostgreSQL is the recommended production target.
