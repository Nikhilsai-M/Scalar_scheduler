import { prisma } from "@/lib/prisma";
import AvailabilityForm from "./AvailabilityForm";

export const dynamic = "force-dynamic";

export default async function AvailabilityPage() {
  const defaultUser = await prisma.user.findFirst();
  if (!defaultUser) return <div>No user found</div>;

  let schedules = await prisma.schedule.findMany({
    where: { userId: defaultUser.id },
    include: {
      availabilities: true,
      dateOverrides: {
        orderBy: { date: "asc" },
      },
      _count: {
        select: { eventTypes: true },
      },
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  if (schedules.length === 0) {
    const schedule = await prisma.schedule.create({
      data: {
        userId: defaultUser.id,
        name: "Working Hours",
        timeZone: "UTC",
        isDefault: true,
      },
      include: {
        availabilities: true,
        dateOverrides: true,
        _count: {
          select: { eventTypes: true },
        },
      },
    });
    schedules = [schedule];
  }

  return (
    <AvailabilityForm
      userId={defaultUser.id}
      schedules={schedules.map((schedule) => ({
        id: schedule.id,
        name: schedule.name,
        timeZone: schedule.timeZone,
        isDefault: schedule.isDefault,
        eventTypeCount: schedule._count.eventTypes,
        rules: schedule.availabilities.map((availability) => ({
          id: availability.id,
          dayOfWeek: availability.dayOfWeek,
          startTime: availability.startTime,
          endTime: availability.endTime,
        })),
        overrides: schedule.dateOverrides.map((override) => ({
          id: override.id,
          date: override.date.toISOString().slice(0, 10),
          startTime: override.startTime ?? "09:00",
          endTime: override.endTime ?? "17:00",
          isUnavailable: override.isUnavailable,
        })),
      }))}
    />
  );
}
