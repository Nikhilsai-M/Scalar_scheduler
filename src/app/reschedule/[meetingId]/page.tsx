import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { MEETING_STATUS } from "@/lib/meeting-status";
import { notFound } from "next/navigation";
import BookingFlow from "@/app/[slug]/BookingFlow";
import styles from "@/app/[slug]/page.module.css";
import { ArrowRight, Clock, Globe, Video } from "lucide-react";

type PageProps = {
  params: Promise<{ meetingId: string }>;
};

export default async function ReschedulePage({ params }: PageProps) {
  const { meetingId } = await params;

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      eventType: {
        include: {
          schedule: {
            include: { availabilities: true, dateOverrides: true },
          },
          inviteeQuestions: {
            orderBy: { sortOrder: "asc" },
          },
          user: {
            include: {
              schedules: {
                include: { availabilities: true, dateOverrides: true },
                orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
              },
            },
          },
        },
      },
    },
  });

  if (!meeting || meeting.status === MEETING_STATUS.CANCELED) {
    return notFound();
  }

  const schedule = meeting.eventType.schedule ?? meeting.eventType.user.schedules[0];
  if (!schedule) {
    return notFound();
  }

  const upcomingMeetings = await prisma.meeting.findMany({
    where: {
      eventType: { userId: meeting.eventType.userId },
      status: MEETING_STATUS.SCHEDULED,
      startTime: { gte: new Date() },
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      bufferBeforeMinutes: true,
      bufferAfterMinutes: true,
    },
  });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand}>
            <span className={styles.brandMark}>C</span>
            <span className={styles.brandText}>Scalar Scheduler</span>
          </Link>
          <div className={styles.headerActions}>
            <span className={styles.hostLabel}>Rescheduling with {meeting.eventType.user.name}</span>
            <Link href="/dashboard" className={styles.headerCta}>
              Open workspace <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.leftPanel}>
            <div className={styles.hostName}>{meeting.eventType.user.name}</div>
            <h1 className={styles.eventTitle}>Reschedule {meeting.eventType.title}</h1>
            <div className={styles.badgeRow}>
              <span className={styles.typeBadge}>Reschedule flow</span>
              <span className={styles.typeBadge}>Keep invitee details</span>
            </div>
            <div className={styles.eventMeta}>
              <Clock size={16} /> {meeting.eventType.duration} min
            </div>
            <div className={styles.eventMeta}>
              <Globe size={16} /> {schedule.timeZone}
            </div>
            <div className={styles.eventMeta}>
              <Video size={16} /> Web conferencing details provided upon confirmation.
            </div>
          </div>
          <div className={styles.rightPanel}>
            <BookingFlow
              eventType={meeting.eventType}
              schedule={schedule}
              meetings={upcomingMeetings}
              inviteeQuestions={meeting.eventType.inviteeQuestions}
              rescheduleMeeting={{
                id: meeting.id,
                inviteeName: meeting.inviteeName,
                inviteeEmail: meeting.inviteeEmail,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
