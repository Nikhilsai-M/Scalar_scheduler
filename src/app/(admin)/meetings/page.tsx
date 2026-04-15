import { prisma } from "@/lib/prisma";
import MeetingsList from "./MeetingsList";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const defaultUser = await prisma.user.findFirst();
  if (!defaultUser) return <div>No default user found.</div>;

  const meetings = await prisma.meeting.findMany({
    where: {
      eventType: { userId: defaultUser.id }
    },
    include: {
      eventType: true,
    },
    orderBy: {
      startTime: 'asc'
    }
  });

  return (
    <div>
      <MeetingsList initialMeetings={meetings} />
    </div>
  );
}
