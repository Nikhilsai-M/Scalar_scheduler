import { prisma } from "@/lib/prisma";
import EventTypeList from "../EventTypeList";

export const dynamic = "force-dynamic";

export default async function EventTypesPage() {
  const defaultUser = await prisma.user.findFirst();

  if (!defaultUser) {
    return <div>No default user found. Please run seed script.</div>;
  }

  const eventTypes = await prisma.eventType.findMany({
    where: { userId: defaultUser.id },
    orderBy: { createdAt: "desc" },
  });

  return <EventTypeList eventTypes={eventTypes} />;
}
