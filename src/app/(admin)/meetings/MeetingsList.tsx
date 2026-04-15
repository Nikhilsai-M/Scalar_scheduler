"use client";

import { useState } from "react";
import { MEETING_STATUS } from "@/lib/meeting-status";
import { getMeetingLocationSummary } from "@/lib/meeting-location";
import styles from "./page.module.css";
import { cancelMeeting } from "./actions";
import { Video } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Meeting = {
  id: string;
  inviteeName: string;
  inviteeEmail: string;
  startTime: Date;
  endTime: Date;
  status: string;
  eventTitleSnapshot: string | null;
  meetingLocationTypeSnapshot: string | null;
  meetingLocationValueSnapshot: string | null;
  eventType: {
    title: string;
    duration: number;
    meetingLocationType: string;
    meetingLocationValue: string | null;
  };
};

export default function MeetingsList({ initialMeetings }: { initialMeetings: Meeting[] }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [canceling, setCanceling] = useState<string | null>(null);
  const [pendingCancel, setPendingCancel] = useState<Meeting | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const now = new Date();
  
  const upcoming = initialMeetings.filter(m => new Date(m.startTime) >= now && m.status !== MEETING_STATUS.CANCELED);
  const past = initialMeetings.filter(m => new Date(m.startTime) < now || m.status === MEETING_STATUS.CANCELED);

  const meetings = activeTab === 'upcoming' ? upcoming : past;

  const handleCancel = async () => {
    if (!pendingCancel) return;
    setCanceling(pendingCancel.id);
    try {
      const result = await cancelMeeting(pendingCancel.id);
      setFeedback({
        type: result.warning ? "error" : "success",
        message: result.warning ?? `Canceled ${pendingCancel.inviteeName}'s meeting and sent email updates.`,
      });
      setPendingCancel(null);
      router.refresh();
    } catch {
      setFeedback({ type: "error", message: "Could not cancel this meeting. Please try again." });
    } finally {
      setCanceling(null);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Scheduled Events</h1>
          <p className={styles.subtitle}>Track upcoming meetings, review past bookings, and cancel sessions when plans change.</p>
        </div>
        <div className={styles.overview}>
          <div className={styles.overviewCard}>
            <span>Upcoming</span>
            <strong>{upcoming.length}</strong>
          </div>
          <div className={styles.overviewCard}>
            <span>Past / Canceled</span>
            <strong>{past.length}</strong>
          </div>
        </div>
      </div>

      <div className={styles.tabs}>
        <button 
          className={activeTab === 'upcoming' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming
        </button>
        <button 
          className={activeTab === 'past' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('past')}
        >
          Past
        </button>
      </div>

      {feedback && (
        <div className={`${styles.notice} ${feedback.type === "success" ? styles.noticeSuccess : styles.noticeError}`}>
          <span>{feedback.message}</span>
          <button className={styles.noticeDismiss} onClick={() => setFeedback(null)}>Dismiss</button>
        </div>
      )}

      {pendingCancel && (
        <div className={styles.confirmCard}>
          <div>
            <h2>Cancel this meeting?</h2>
            <p>{pendingCancel.inviteeName} will no longer hold this reserved time.</p>
          </div>
          <div className={styles.confirmActions}>
            <button className={styles.confirmSecondary} onClick={() => setPendingCancel(null)}>Keep meeting</button>
            <button className={styles.confirmDanger} onClick={handleCancel} disabled={canceling === pendingCancel.id}>
              {canceling === pendingCancel.id ? "Canceling..." : "Cancel meeting"}
            </button>
          </div>
        </div>
      )}

      <div className={styles.list}>
        {meetings.length === 0 ? (
          <div className={styles.empty}>No {activeTab} events.</div>
        ) : (
          meetings.map(meeting => (
            <div key={meeting.id} className={styles.card}>
              <div className={styles.timeColumn}>
                <div className={styles.date}>{format(new Date(meeting.startTime), "EEEE, MMMM d, yyyy")}</div>
                <div className={styles.timeRange}>
                  {format(new Date(meeting.startTime), "h:mm a")} - {format(new Date(meeting.endTime), "h:mm a")}
                </div>
              </div>
              
              <div className={styles.infoColumn}>
                <div className={styles.inviteeName}>{meeting.inviteeName}</div>
                <div className={styles.inviteeEmail}>{meeting.inviteeEmail}</div>
                <div className={styles.metaRow}>
                  <div className={styles.tag}>
                    <div className={styles.dot}></div> {meeting.eventTitleSnapshot || meeting.eventType.title}
                  </div>
                  <div className={styles.metaLabel}>
                    <Video size={14}/>
                    {getMeetingLocationSummary(
                      meeting.meetingLocationTypeSnapshot ?? meeting.eventType.meetingLocationType,
                      meeting.meetingLocationValueSnapshot ?? meeting.eventType.meetingLocationValue,
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.actionsColumn}>
                {meeting.status === MEETING_STATUS.CANCELED ? (
                  <span className={styles.canceledBadge}>Canceled</span>
                ) : (
                  activeTab === 'upcoming' && (
                    <div className={styles.inlineActions}>
                      <Link href={`/reschedule/${meeting.id}`} className={styles.rescheduleButton}>
                        Reschedule
                      </Link>
                      <button 
                        className={styles.cancelButton}
                        onClick={() => setPendingCancel(meeting)}
                        disabled={canceling === meeting.id}
                      >
                        Cancel
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
