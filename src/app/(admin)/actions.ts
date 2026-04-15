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

function validateEventTypeInput(data: { title: string; urlSlug: string; duration: number }) {
  if (!data.title.trim()) {
    throw new Error("Event name is required.");
  }

  const slug = normalizeSlug(data.urlSlug);
  if (!slug) {
    throw new Error("Event link must contain letters or numbers.");
  }

  if (data.duration <= 0) {
    throw new Error("Duration must be greater than zero.");
  }

  return slug;
}

export async function deleteEventType(id: string) {
  const existingEventType = await prisma.eventType.findUnique({
    where: { id },
    select: { urlSlug: true },
  });

  await prisma.eventType.delete({
    where: { id }
  });

  if (existingEventType) {
    revalidatePath(`/${existingEventType.urlSlug}`);
  }

  revalidatePath("/event-types");
  revalidatePath("/dashboard");
  revalidatePath("/");
}

export async function updateEventType(data: {
  id: string;
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
    id?: string;
    label: string;
    type: string;
    required: boolean;
    placeholder: string;
  }[];
}) {
  const normalizedSlug = validateEventTypeInput(data);
  const existingEventType = await prisma.eventType.findUnique({
    where: { id: data.id },
    select: { urlSlug: true, userId: true },
  });

  if (!existingEventType) {
    throw new Error("Event type not found.");
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

  const schedule = await prisma.schedule.findFirst({
    where: {
      id: data.scheduleId,
      userId: existingEventType.userId,
    },
    select: { id: true },
  });

  if (!schedule) {
    throw new Error("Please choose a valid schedule.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.eventType.update({
      where: { id: data.id },
      data: {
        title: data.title.trim(),
        urlSlug: normalizedSlug,
        description: data.description.trim() || null,
        duration: data.duration,
        scheduleId: schedule.id,
        meetingLocationType: data.meetingLocationType,
        meetingLocationValue: data.meetingLocationValue.trim() || null,
        bufferBeforeMinutes: data.bufferBeforeMinutes,
        bufferAfterMinutes: data.bufferAfterMinutes,
      },
    });

    await tx.inviteeQuestion.deleteMany({
      where: { eventTypeId: data.id },
    });

    if (data.inviteeQuestions.length > 0) {
      await tx.inviteeQuestion.createMany({
        data: data.inviteeQuestions
          .filter((question) => question.label.trim())
          .map((question, index) => ({
            eventTypeId: data.id,
            label: question.label.trim(),
            type: question.type,
            required: question.required,
            placeholder: question.placeholder.trim() || null,
            sortOrder: index,
          })),
      });
    }
  });

  revalidatePath("/event-types");
  revalidatePath("/dashboard");
  revalidatePath("/");
  if (existingEventType) {
    revalidatePath(`/${existingEventType.urlSlug}`);
  }
  revalidatePath(`/${normalizedSlug}`);
}
