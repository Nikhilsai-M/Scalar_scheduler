"use server";

import { prisma } from "@/lib/prisma";
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
