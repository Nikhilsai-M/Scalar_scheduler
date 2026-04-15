"use server";

import { sendCancellationEmails } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { MEETING_STATUS } from "@/lib/meeting-status";
import { revalidatePath } from "next/cache";

export async function cancelMeeting(id: string) {
  const meeting = await prisma.meeting.update({
    where: { id },
    data: {
      status: MEETING_STATUS.CANCELED,
      canceledAt: new Date(),
    },
    include: {
      eventType: {
        include: {
          user: true,
          schedule: true,
        },
      },
    },
  });

  let warning: string | undefined;

  try {
    await sendCancellationEmails({
      hostEmail: meeting.eventType.user.email,
      hostName: meeting.hostNameSnapshot ?? meeting.eventType.user.name,
      inviteeEmail: meeting.inviteeEmail,
      inviteeName: meeting.inviteeName,
      eventTitle: meeting.eventTitleSnapshot ?? meeting.eventType.title,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      timeZone:
        meeting.scheduleTimeZone ??
        meeting.eventType.schedule?.timeZone ??
        meeting.eventType.user.timeZone,
    });
  } catch (error) {
    warning =
      error instanceof Error
        ? `Meeting canceled, but email could not be sent: ${error.message}`
        : "Meeting canceled, but email could not be sent.";
  }

  revalidatePath("/meetings");
  revalidatePath("/dashboard");
  return { success: true, warning };
}
