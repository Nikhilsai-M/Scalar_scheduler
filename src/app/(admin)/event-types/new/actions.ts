"use server";

import { prisma } from "@/lib/prisma";
import { isMeetingLocationType, requiresMeetingLocationValue } from "@/lib/meeting-location";
import { revalidatePath } from "next/cache";

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createEventType(data: {
  title: string;
  urlSlug: string;
  description: string;
  duration: number;
  scheduleId: string;
  meetingLocationType: string;
  meetingLocationValue: string;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  inviteeQuestions: {
    label: string;
    type: string;
    required: boolean;
    placeholder: string;
  }[];
}) {
  if (!data.title.trim()) {
    throw new Error("Event name is required.");
  }

  const normalizedSlug = normalizeSlug(data.urlSlug);
  if (!normalizedSlug) {
    throw new Error("Event link must contain letters or numbers.");
  }

  if (data.duration <= 0) {
    throw new Error("Duration must be greater than zero.");
  }

  if (data.bufferBeforeMinutes < 0 || data.bufferAfterMinutes < 0) {
    throw new Error("Buffer times cannot be negative.");
  }

  if (!isMeetingLocationType(data.meetingLocationType)) {
    throw new Error("Please choose a valid meeting location.");
  }

  if (requiresMeetingLocationValue(data.meetingLocationType) && !data.meetingLocationValue.trim()) {
    throw new Error("Please add meeting location details for this location type.");
  }

  const defaultUser = await prisma.user.findFirst();
  if (!defaultUser) throw new Error("No default user found");

  const schedule = await prisma.schedule.findFirst({
    where: {
      id: data.scheduleId,
      userId: defaultUser.id,
    },
  });

  if (!schedule) {
    throw new Error("Please choose a valid schedule.");
  }

  await prisma.eventType.create({
    data: {
      title: data.title.trim(),
      urlSlug: normalizedSlug,
      description: data.description.trim() || null,
      duration: data.duration,
      userId: defaultUser.id,
      scheduleId: schedule.id,
      meetingLocationType: data.meetingLocationType,
      meetingLocationValue: data.meetingLocationValue.trim() || null,
      isActive: true,
      bufferBeforeMinutes: data.bufferBeforeMinutes,
      bufferAfterMinutes: data.bufferAfterMinutes,
      inviteeQuestions: {
        create: data.inviteeQuestions
          .filter((question) => question.label.trim())
          .map((question, index) => ({
            label: question.label.trim(),
            type: question.type,
            required: question.required,
            placeholder: question.placeholder.trim() || null,
            sortOrder: index,
          })),
      },
    }
  });

  revalidatePath("/event-types");
  revalidatePath("/dashboard");
  revalidatePath("/");
  revalidatePath(`/${normalizedSlug}`);
}
