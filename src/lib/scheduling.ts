import { addMinutes, format, getDay, parse, startOfDay } from "date-fns";

export type AvailabilityInterval = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type ScheduleOverride = {
  date: string | Date;
  startTime: string | null;
  endTime: string | null;
  isUnavailable: boolean;
};

export type BufferedMeeting = {
  startTime: string | Date;
  endTime: string | Date;
  bufferBeforeMinutes?: number | null;
  bufferAfterMinutes?: number | null;
};

function getDateKey(date: Date) {
  return format(startOfDay(date), "yyyy-MM-dd");
}

export function getIntervalsForDate(
  date: Date,
  availabilities: AvailabilityInterval[],
  overrides: ScheduleOverride[],
) {
  const dateKey = getDateKey(date);
  const matchingOverrides = overrides.filter((override) => getDateKey(new Date(override.date)) === dateKey);

  if (matchingOverrides.some((override) => override.isUnavailable)) {
    return [];
  }

  const overrideIntervals = matchingOverrides
    .filter((override) => override.startTime && override.endTime)
    .map((override) => ({
      startTime: override.startTime as string,
      endTime: override.endTime as string,
    }));

  if (overrideIntervals.length > 0) {
    return overrideIntervals;
  }

  const dayOfWeek = getDay(date);
  return availabilities
    .filter((rule) => rule.dayOfWeek === dayOfWeek)
    .map((rule) => ({ startTime: rule.startTime, endTime: rule.endTime }));
}

export function doesBufferedMeetingOverlap(
  slotStart: Date,
  durationMinutes: number,
  bufferBeforeMinutes: number,
  bufferAfterMinutes: number,
  meetings: BufferedMeeting[],
) {
  const slotEnd = addMinutes(slotStart, durationMinutes);
  const effectiveSlotStart = addMinutes(slotStart, -bufferBeforeMinutes);
  const effectiveSlotEnd = addMinutes(slotEnd, bufferAfterMinutes);

  return meetings.some((meeting) => {
    const meetingStart = new Date(meeting.startTime);
    const meetingEnd = new Date(meeting.endTime);
    const effectiveMeetingStart = addMinutes(meetingStart, -(meeting.bufferBeforeMinutes ?? 0));
    const effectiveMeetingEnd = addMinutes(meetingEnd, meeting.bufferAfterMinutes ?? 0);

    return effectiveSlotStart < effectiveMeetingEnd && effectiveSlotEnd > effectiveMeetingStart;
  });
}

export function getAvailableSlotsForDate(params: {
  date: Date;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  availabilities: AvailabilityInterval[];
  overrides: ScheduleOverride[];
  meetings: BufferedMeeting[];
}) {
  const intervals = getIntervalsForDate(params.date, params.availabilities, params.overrides);
  if (intervals.length === 0) {
    return [];
  }

  const now = new Date();
  const slots: Date[] = [];

  for (const interval of intervals) {
    const start = parse(interval.startTime, "HH:mm", params.date);
    const end = parse(interval.endTime, "HH:mm", params.date);

    let current = start;
    while (current < end) {
      const slotEnd = addMinutes(current, params.durationMinutes);
      if (slotEnd <= end) {
        const overlaps = doesBufferedMeetingOverlap(
          current,
          params.durationMinutes,
          params.bufferBeforeMinutes,
          params.bufferAfterMinutes,
          params.meetings,
        );

        if (!overlaps && current > now) {
          slots.push(current);
        }
      }

      current = addMinutes(current, Math.min(30, params.durationMinutes));
    }
  }

  return slots.filter((slot, index, self) => index === self.findIndex((candidate) => candidate.getTime() === slot.getTime()));
}
