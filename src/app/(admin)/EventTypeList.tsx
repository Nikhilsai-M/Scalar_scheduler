"use client";

import { useState } from "react";
import { getMeetingLocationSummary } from "@/lib/meeting-location";
import styles from "./page.module.css";
import { Clock, Plus, Pencil, Trash2, ArrowUpRight, Copy, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteEventType } from "./actions";

type EventType = {
  id: string;
  title: string;
  duration: number;
  urlSlug: string;
  description: string | null;
  meetingLocationType: string;
  meetingLocationValue: string | null;
};

export default function EventTypeList({ eventTypes: initialEventTypes }: { eventTypes: EventType[] }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<EventType | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const getBookingUrl = (slug: string) => `${window.location.origin}/${slug}`;

  const handleCopy = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(getBookingUrl(slug));
      setFeedback({ type: "success", message: "Booking link copied to clipboard." });
    } catch {
      setFeedback({ type: "error", message: "Could not copy the booking link. Please try again." });
    }
  };

  const handleShare = async (event: EventType) => {
    const url = getBookingUrl(event.urlSlug);

    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: `Book a meeting: ${event.title}`,
          url,
        });
        setFeedback({ type: "success", message: "Share sheet opened successfully." });
      } catch {
        // User dismissed share dialog; no action needed.
      }
      return;
    }

    await handleCopy(event.urlSlug);
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;

    setIsDeleting(pendingDelete.id);
    try {
      await deleteEventType(pendingDelete.id);
      setFeedback({ type: "success", message: `"${pendingDelete.title}" was deleted.` });
      setPendingDelete(null);
      router.refresh();
    } catch {
      setFeedback({ type: "error", message: "Could not delete this event type. Please try again." });
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Event Types</h1>
          <p className={styles.subtitle}>Create clean public booking links for every meeting type you want to offer.</p>
        </div>
        <button 
          className={styles.newButton}
          onClick={() => router.push('/event-types/new')}
        >
          <Plus size={18} /> New Event Type
        </button>
      </div>

      <div className={styles.summaryBar}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Active event types</span>
          <strong>{initialEventTypes.length}</strong>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Booking pages ready to share</span>
          <strong>{initialEventTypes.length}</strong>
        </div>
      </div>

      {feedback && (
        <div className={`${styles.notice} ${feedback.type === "success" ? styles.noticeSuccess : styles.noticeError}`}>
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className={styles.noticeDismiss}>Dismiss</button>
        </div>
      )}

      {pendingDelete && (
        <div className={styles.confirmCard}>
          <div>
            <h2>Delete event type?</h2>
            <p>{pendingDelete.title} and its booking page will be removed from your workspace.</p>
          </div>
          <div className={styles.confirmActions}>
            <button className={styles.confirmSecondary} onClick={() => setPendingDelete(null)}>Keep it</button>
            <button className={styles.confirmDanger} onClick={handleDelete} disabled={isDeleting === pendingDelete.id}>
              {isDeleting === pendingDelete.id ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      )}

      <div className={styles.grid}>
        {initialEventTypes.length === 0 ? (
          <div className={styles.empty}>No event types yet. Create one!</div>
        ) : (
          initialEventTypes.map((event) => (
            <div key={event.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.badge}>Active</div>
                <div className={styles.actions}>
                  <button
                    className={`${styles.actionBtn} ${styles.editActionBtn}`}
                    onClick={() => router.push(`/event-types/${event.id}/edit`)}
                    title="Edit event type"
                  >
                    <Pencil size={16} />
                  </button>
                  <button className={styles.actionBtn} onClick={() => setPendingDelete(event)} disabled={isDeleting === event.id}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{event.title}</h3>
                <div className={styles.cardMeta}>
                  <Clock size={16} /> {event.duration} mins
                </div>
                <div className={styles.cardMeta}>
                  {getMeetingLocationSummary(event.meetingLocationType, event.meetingLocationValue)}
                </div>
                <p className={styles.cardDescription}>
                  {event.description || "Share this event page so invitees can pick a time that works for both of you."}
                </p>
                <div className={styles.cardUrl}>/{event.urlSlug}</div>
              </div>
              <div className={styles.cardFooter}>
                <div className={styles.footerActions}>
                  <button className={styles.secondaryButton} onClick={() => handleCopy(event.urlSlug)}>
                    <Copy size={15} /> Copy link
                  </button>
                  <button className={styles.secondaryButton} onClick={() => handleShare(event)}>
                    <Share2 size={15} /> Share
                  </button>
                  <button className={styles.linkButton} onClick={() => router.push(`/${event.urlSlug}`)}>
                    Open booking page <ArrowUpRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
