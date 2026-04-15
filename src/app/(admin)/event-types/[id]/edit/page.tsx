import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EditEventTypeForm from "./EditEventTypeForm";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditEventTypePage({ params }: PageProps) {
  const { id } = await params;

  const eventType = await prisma.eventType.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      urlSlug: true,
      description: true,
      duration: true,
      scheduleId: true,
      bufferBeforeMinutes: true,
      bufferAfterMinutes: true,
      userId: true,
      inviteeQuestions: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          label: true,
          type: true,
          required: true,
          placeholder: true,
        },
      },
    },
  });

  if (!eventType) {
    notFound();
  }

  const schedules = await prisma.schedule.findMany({
    where: { userId: eventType.userId },
    select: {
      id: true,
      name: true,
      isDefault: true,
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  return <EditEventTypeForm eventType={eventType} schedules={schedules} />;
}
