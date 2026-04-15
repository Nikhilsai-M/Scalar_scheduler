export const MEETING_STATUS = {
  SCHEDULED: "SCHEDULED",
  CANCELED: "CANCELED",
} as const;

export type MeetingStatusValue = (typeof MEETING_STATUS)[keyof typeof MEETING_STATUS];
