import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CalendarCheck2, Clock3, Layers3, ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const defaultUser = await prisma.user.findFirst();
  const eventTypes = defaultUser
    ? await prisma.eventType.findMany({
        where: { userId: defaultUser.id, isActive: true },
        orderBy: { createdAt: "asc" },
        take: 3,
      })
    : [];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.logoGroup}>
          <span className={styles.logo}>C</span>
          <span className={styles.logoText}>Scalar Scheduler</span>
        </Link>
        <div className={styles.headerActions}>
          <Link href="/dashboard" className={styles.secondaryLink}>
            Dashboard
          </Link>
          <Link href="/event-types" className={styles.primaryLink}>
            Open workspace
          </Link>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>Scheduling for modern teams</span>
            <h1 className={styles.heroTitle}>A polished booking experience for hosts and invitees.</h1>
            <p className={styles.heroText}>
              Scalar Scheduler helps you publish booking pages, manage weekly availability, and keep meetings organized
              without the friction of back-and-forth email.
            </p>
            <div className={styles.heroActions}>
              <Link href="/dashboard" className={styles.primaryCta}>
                Go to dashboard <ArrowRight size={16} />
              </Link>
              {eventTypes[0] ? (
                <Link href={`/${eventTypes[0].urlSlug}`} className={styles.secondaryCta}>
                  View sample booking page
                </Link>
              ) : (
                <Link href="/event-types/new" className={styles.secondaryCta}>
                  Create first event type
                </Link>
              )}
            </div>
          </div>

          <div className={styles.previewCard}>
            <div className={styles.previewTop}>
              <span className={styles.previewBadge}>Live workspace</span>
              <span className={styles.previewMeta}>Professional scheduling flow</span>
            </div>
            <div className={styles.previewPanel}>
              <div className={styles.previewStat}>
                <Layers3 size={18} />
                <div>
                  <strong>{eventTypes.length || 3} event types</strong>
                  <p>Reusable booking pages with clean links</p>
                </div>
              </div>
              <div className={styles.previewStat}>
                <Clock3 size={18} />
                <div>
                  <strong>Weekly availability</strong>
                  <p>Timezone-aware hours and slot generation</p>
                </div>
              </div>
              <div className={styles.previewStat}>
                <CalendarCheck2 size={18} />
                <div>
                  <strong>Real confirmations</strong>
                  <p>Booking and cancellation emails from your workflow</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.featureSection}>
          <div className={styles.featureIntro}>
            <span className={styles.sectionEyebrow}>Why it works</span>
            <h2>Built like a real scheduling product, not just a form.</h2>
          </div>
          <div className={styles.featureGrid}>
            <article className={styles.featureCard}>
              <Sparkles size={18} />
              <h3>Clean booking journey</h3>
              <p>Invitees choose a date, select a time, and confirm in a flow designed to feel calm and clear.</p>
            </article>
            <article className={styles.featureCard}>
              <ShieldCheck size={18} />
              <h3>Safer scheduling logic</h3>
              <p>Double-booking checks, validated availability windows, and meeting snapshots protect your records.</p>
            </article>
            <article className={styles.featureCard}>
              <CalendarCheck2 size={18} />
              <h3>Operational workspace</h3>
              <p>Separate admin screens for event types, availability, and meetings make the product easier to manage.</p>
            </article>
          </div>
        </section>

        <section className={styles.linksSection}>
          <div className={styles.linksHeader}>
            <h2>Sample booking pages</h2>
            <p>Use these public links to preview the invitee experience.</p>
          </div>
          <div className={styles.linkList}>
            {eventTypes.length > 0 ? (
              eventTypes.map((eventType) => (
                <Link key={eventType.id} href={`/${eventType.urlSlug}`} className={styles.linkCard}>
                  <div>
                    <strong>{eventType.title}</strong>
                    <p>/{eventType.urlSlug}</p>
                  </div>
                  <span>{eventType.duration} min</span>
                </Link>
              ))
            ) : (
              <div className={styles.emptyState}>Create an event type in the dashboard to generate public booking links.</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
