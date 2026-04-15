ALTER TABLE "EventType"
ADD COLUMN "meetingLocationType" TEXT NOT NULL DEFAULT 'GOOGLE_MEET',
ADD COLUMN "meetingLocationValue" TEXT;

ALTER TABLE "Meeting"
ADD COLUMN "meetingLocationTypeSnapshot" TEXT,
ADD COLUMN "meetingLocationValueSnapshot" TEXT;
