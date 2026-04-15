import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { MEETING_STATUS } from "@/lib/meeting-status";
import { Calendar, Clock3, LayoutGrid, ArrowRight } from "lucide-react";
import styles from "../dashboard.module.css";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const defaultUser = await prisma.user.findFirst();

  if (!defaultUser) {
    return <div>No default user found. Please run seed script.</div>;
  }

  const [eventTypesCount, upcomingCount, pastCount, recentEventTypes] = await Promise.all([
    prisma.eventType.count({
      where: { userId: defaultUser.id },
    }),
    prisma.meeting.count({
      where: {
        eventType: { userId: defaultUser.id },
        status: MEETING_STATUS.SCHEDULED,
        startTime: { gte: new Date() },
      },
    }),
    prisma.meeting.count({
      where: {
        eventType: { userId: defaultUser.id },
        OR: [{ status: MEETING_STATUS.CANCELED }, { startTime: { lt: new Date() } }],
      },
    }),
    prisma.eventType.findMany({
      where: { userId: defaultUser.id },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <div>
          <p className={styles.kicker}>Workspace Overview</p>
          <h1 className={styles.title}>Welcome back, {defaultUser.name}</h1>
          <p className={styles.subtitle}>
            Manage event types, share polished booking links, and keep your weekly availability in sync from one place.
          </p>
        </div>
        <Link href="/event-types/new" className={styles.primaryCta}>
          Create Event Type <ArrowRight size={16} />
        </Link>
      </section>

      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <div className={styles.statHead}>
            <LayoutGrid size={16} />
            Event Types
          </div>
          <p className={styles.statValue}>{eventTypesCount}</p>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statHead}>
            <Calendar size={16} />
            Upcoming Meetings
          </div>
          <p className={styles.statValue}>{upcomingCount}</p>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statHead}>
            <Clock3 size={16} />
            Past / Canceled
          </div>
          <p className={styles.statValue}>{pastCount}</p>
        </article>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Quick Access</h2>
        </div>
        <div className={styles.quickGrid}>
          <Link href="/event-types" className={styles.quickCard}>
            <h3>Event Types</h3>
            <p>Create, edit, and share professional booking links.</p>
          </Link>
          <Link href="/availability" className={styles.quickCard}>
            <h3>Availability</h3>
            <p>Configure your timezone and weekly hours with clean scheduling controls.</p>
          </Link>
          <Link href="/meetings" className={styles.quickCard}>
            <h3>Meetings</h3>
            <p>Track upcoming and past bookings in one place.</p>
          </Link>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Recent Event Types</h2>
          <Link href="/event-types" className={styles.inlineLink}>
            View all
          </Link>
        </div>
        <div className={styles.list}>
          {recentEventTypes.length === 0 ? (
            <div className={styles.empty}>No event types yet. Create your first one.</div>
          ) : (
            recentEventTypes.map((eventType) => (
              <div key={eventType.id} className={styles.listItem}>
                <div>
                  <h3>{eventType.title}</h3>
                  <p>
                    /{eventType.urlSlug} - {eventType.duration} mins
                  </p>
                </div>
                <Link href={`/${eventType.urlSlug}`} className={styles.secondaryCta}>
                  Booking page
                </Link>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
