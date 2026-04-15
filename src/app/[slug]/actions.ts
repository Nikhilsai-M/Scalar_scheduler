"use server";

import { sendBookingEmails } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { MEETING_STATUS } from "@/lib/meeting-status";
import { doesBufferedMeetingOverlap } from "@/lib/scheduling";
import { addMinutes } from "date-fns";
import { revalidatePath } from "next/cache";

export async function bookMeeting(data: {
  eventTypeId: string;
  inviteeName: string;
  inviteeEmail: string;
  startTime: Date;
  endTime: Date;
  rescheduleMeetingId?: string;
  answers?: {
    questionId?: string;
    label: string;
    type: string;
    value: string;
  }[];
}) {
  const inviteeName = data.inviteeName.trim();
  const inviteeEmail = data.inviteeEmail.trim().toLowerCase();

  if (!inviteeName || !inviteeEmail) {
    return { success: false, error: "Name and email are required." };
  }

  if (data.endTime <= data.startTime) {
    return { success: false, error: "Invalid meeting time selected." };
  }

  const answers = data.answers ?? [];

  let emailPayload:
    | {
        hostEmail: string;
        hostName: string;
        inviteeEmail: string;
        inviteeName: string;
        eventTitle: string;
        startTime: Date;
        endTime: Date;
        timeZone: string;
      }
    | null = null;

  try {
    await prisma.$transaction(async (tx) => {
      const eventType = await tx.eventType.findUnique({
        where: { id: data.eventTypeId },
        include: {
          schedule: true,
          user: {
            include: {
              schedules: {
                where: { isDefault: true },
                take: 1,
              },
            },
          },
        },
      });

      if (!eventType || !eventType.isActive) {
        throw new Error("This event type is no longer available.");
      }

      const existingMeeting = await tx.meeting.findFirst({
        where: {
          eventType: { userId: eventType.userId },
          status: MEETING_STATUS.SCHEDULED,
          startTime: { lt: addMinutes(data.endTime, eventType.bufferAfterMinutes) },
          endTime: { gt: addMinutes(data.startTime, -eventType.bufferBeforeMinutes) },
          ...(data.rescheduleMeetingId ? { id: { not: data.rescheduleMeetingId } } : {}),
        },
        select: {
          startTime: true,
          endTime: true,
          bufferBeforeMinutes: true,
          bufferAfterMinutes: true,
        },
      });

      if (
        existingMeeting &&
        doesBufferedMeetingOverlap(
          data.startTime,
          eventType.duration,
          eventType.bufferBeforeMinutes,
          eventType.bufferAfterMinutes,
          [existingMeeting],
        )
      ) {
        throw new Error("This time slot is no longer available. Please select another time.");
      }

      const schedule = eventType.schedule ?? eventType.user.schedules[0];

      const createdMeeting = await tx.meeting.create({
        data: {
          eventTypeId: data.eventTypeId,
          inviteeName,
          inviteeEmail,
          startTime: data.startTime,
          endTime: data.endTime,
          status: MEETING_STATUS.SCHEDULED,
          hostNameSnapshot: eventType.user.name,
          eventTitleSnapshot: eventType.title,
          scheduleTimeZone: schedule?.timeZone ?? eventType.user.timeZone,
          durationMinutes: eventType.duration,
          bufferBeforeMinutes: eventType.bufferBeforeMinutes,
          bufferAfterMinutes: eventType.bufferAfterMinutes,
          rescheduledFromId: data.rescheduleMeetingId ?? null,
        },
      });

      if (answers.length > 0) {
        await tx.meetingAnswer.createMany({
          data: answers
            .filter((answer) => answer.value.trim())
            .map((answer) => ({
              meetingId: createdMeeting.id,
              questionId: answer.questionId ?? null,
              questionLabel: answer.label,
              questionType: answer.type,
              value: answer.value.trim(),
            })),
        });
      }

      if (data.rescheduleMeetingId) {
        await tx.meeting.update({
          where: { id: data.rescheduleMeetingId },
          data: {
            status: MEETING_STATUS.CANCELED,
            canceledAt: new Date(),
          },
        });
      }

      emailPayload = {
        hostEmail: eventType.user.email,
        hostName: eventType.user.name,
        inviteeEmail,
        inviteeName,
        eventTitle: eventType.title,
        startTime: data.startTime,
        endTime: data.endTime,
        timeZone: schedule?.timeZone ?? eventType.user.timeZone,
      };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to book meeting.";
    return { success: false, error: message };
  }

  let warning: string | undefined;
  if (emailPayload) {
    try {
      await sendBookingEmails(emailPayload);
    } catch (error) {
      warning =
        error instanceof Error
          ? `Meeting booked, but email could not be sent: ${error.message}`
          : "Meeting booked, but email could not be sent.";
    }
  }

  revalidatePath("/meetings");
  revalidatePath("/dashboard");
  return { success: true, warning };
}
