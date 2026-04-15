import { prisma } from "@/lib/prisma";
import NewEventTypeForm from "./NewEventTypeForm";

export const dynamic = "force-dynamic";

export default async function NewEventTypePage() {
  const defaultUser = await prisma.user.findFirst();
  if (!defaultUser) {
    return <div>No default user found.</div>;
  }

  const schedules = await prisma.schedule.findMany({
    where: { userId: defaultUser.id },
    select: {
      id: true,
      name: true,
      isDefault: true,
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  return <NewEventTypeForm schedules={schedules} />;
}
