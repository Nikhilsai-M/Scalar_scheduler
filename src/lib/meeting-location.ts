export const MEETING_LOCATION_TYPES = [
  "GOOGLE_MEET",
  "ZOOM",
  "MICROSOFT_TEAMS",
  "PHONE_CALL",
  "IN_PERSON",
  "CUSTOM",
] as const;

export type MeetingLocationType = (typeof MEETING_LOCATION_TYPES)[number];

export const MEETING_LOCATION_OPTIONS: Array<{
  value: MeetingLocationType;
  label: string;
  placeholder: string;
  helperText: string;
}> = [
  {
    value: "GOOGLE_MEET",
    label: "Google Meet",
    placeholder: "Optional Google Meet link",
    helperText: "Invitees will know this meeting happens on Google Meet.",
  },
  {
    value: "ZOOM",
    label: "Zoom",
    placeholder: "Optional Zoom link",
    helperText: "Invitees will know this meeting happens on Zoom.",
  },
  {
    value: "MICROSOFT_TEAMS",
    label: "Microsoft Teams",
    placeholder: "Optional Teams link",
    helperText: "Invitees will know this meeting happens on Microsoft Teams.",
  },
  {
    value: "PHONE_CALL",
    label: "Phone call",
    placeholder: "Phone number or call instructions",
    helperText: "Share the number or instructions people should use to join.",
  },
  {
    value: "IN_PERSON",
    label: "In person",
    placeholder: "Office address or venue details",
    helperText: "Share the address or meeting point for the event.",
  },
  {
    value: "CUSTOM",
    label: "Custom",
    placeholder: "Location details",
    helperText: "Use this for any other meeting location or joining method.",
  },
];

const LOCATION_LABELS: Record<MeetingLocationType, string> = Object.fromEntries(
  MEETING_LOCATION_OPTIONS.map((option) => [option.value, option.label]),
) as Record<MeetingLocationType, string>;

export function isMeetingLocationType(value: string): value is MeetingLocationType {
  return MEETING_LOCATION_TYPES.includes(value as MeetingLocationType);
}

export function getMeetingLocationLabel(value: string | null | undefined) {
  if (!value || !isMeetingLocationType(value)) {
    return "Google Meet";
  }

  return LOCATION_LABELS[value];
}

export function getMeetingLocationPlaceholder(value: string | null | undefined) {
  return (
    MEETING_LOCATION_OPTIONS.find((option) => option.value === value)?.placeholder ?? "Location details"
  );
}

export function getMeetingLocationHelperText(value: string | null | undefined) {
  return (
    MEETING_LOCATION_OPTIONS.find((option) => option.value === value)?.helperText ??
    "Share any details invitees need to join or arrive at the meeting."
  );
}

export function requiresMeetingLocationValue(value: string | null | undefined) {
  return value === "PHONE_CALL" || value === "IN_PERSON" || value === "CUSTOM";
}

export function getMeetingLocationSummary(value: string | null | undefined, details?: string | null) {
  const label = getMeetingLocationLabel(value);
  const trimmedDetails = details?.trim();

  return trimmedDetails ? `${label} - ${trimmedDetails}` : label;
}
