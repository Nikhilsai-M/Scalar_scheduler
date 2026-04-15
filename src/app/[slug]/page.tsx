import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { MEETING_STATUS } from "@/lib/meeting-status";
import { notFound } from "next/navigation";
import BookingFlow from "./BookingFlow";
import styles from "./page.module.css";
import { Clock, Video, Globe, ArrowRight } from "lucide-react";
import { getMeetingLocationSummary } from "@/lib/meeting-location";

export default async function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  const eventType = await prisma.eventType.findUnique({
    where: { urlSlug: slug },
    include: {
      schedule: {
        include: { availabilities: true, dateOverrides: true }
      },
      inviteeQuestions: {
        orderBy: { sortOrder: "asc" },
      },
      user: {
        include: {
          schedules: {
            include: { availabilities: true, dateOverrides: true },
            orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }]
          }
        }
      }
    }
  });

  if (!eventType) return notFound();

  // Get the default schedule (assuming user has one)
  const schedule = eventType.schedule ?? eventType.user.schedules[0];
  if (!schedule) return <div>User has no availability schedule set.</div>;

  // Fetch upcoming meetings to exclude occupied slots
  const upcomingMeetings = await prisma.meeting.findMany({
    where: {
      eventType: { userId: eventType.userId },
      status: MEETING_STATUS.SCHEDULED,
      startTime: { gte: new Date() }
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
            <span className={styles.hostLabel}>Hosted by {eventType.user.name}</span>
            <Link href="/dashboard" className={styles.headerCta}>
              Open workspace <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.leftPanel}>
            <div className={styles.hostName}>{eventType.user.name}</div>
            <h1 className={styles.eventTitle}>{eventType.title}</h1>
            <div className={styles.badgeRow}>
              <span className={styles.typeBadge}>One-on-one</span>
              <span className={styles.typeBadge}>Instant confirmation</span>
            </div>
            <div className={styles.eventMeta}>
              <Clock size={16} /> {eventType.duration} min
            </div>
            <div className={styles.eventMeta}>
              <Globe size={16} /> {schedule.timeZone}
            </div>
            <div className={styles.eventMeta}>
              <Video size={16} /> {getMeetingLocationSummary(eventType.meetingLocationType, eventType.meetingLocationValue)}
            </div>
            {eventType.description && (
              <div className={styles.description}>
                {eventType.description}
              </div>
            )}
          </div>
          <div className={styles.rightPanel}>
            <BookingFlow 
              eventType={eventType} 
              schedule={schedule}
              meetings={upcomingMeetings}
              inviteeQuestions={eventType.inviteeQuestions}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
