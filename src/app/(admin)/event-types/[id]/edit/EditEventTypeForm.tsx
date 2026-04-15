"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../../new/page.module.css";
import { updateEventType } from "@/app/(admin)/actions";
import {
  getMeetingLocationHelperText,
  getMeetingLocationPlaceholder,
  MEETING_LOCATION_OPTIONS,
  type MeetingLocationType,
} from "@/lib/meeting-location";

type EventType = {
  id: string;
  title: string;
  urlSlug: string;
  description: string | null;
  duration: number;
  scheduleId: string | null;
  meetingLocationType: string;
  meetingLocationValue: string | null;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  inviteeQuestions: {
    id: string;
    label: string;
    type: string;
    required: boolean;
    placeholder: string | null;
  }[];
};

type ScheduleOption = {
  id: string;
  name: string;
  isDefault: boolean;
};

type InviteeQuestionDraft = {
  id?: string;
  label: string;
  type: string;
  required: boolean;
  placeholder: string;
};

export default function EditEventTypeForm({ eventType, schedules }: { eventType: EventType; schedules: ScheduleOption[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(eventType.title);
  const [urlSlug, setUrlSlug] = useState(eventType.urlSlug);
  const [description, setDescription] = useState(eventType.description ?? "");
  const [duration, setDuration] = useState(eventType.duration);
  const [scheduleId, setScheduleId] = useState(eventType.scheduleId ?? schedules[0]?.id ?? "");
  const [meetingLocationType, setMeetingLocationType] = useState<MeetingLocationType>(
    (eventType.meetingLocationType as MeetingLocationType) ?? "GOOGLE_MEET",
  );
  const [meetingLocationValue, setMeetingLocationValue] = useState(eventType.meetingLocationValue ?? "");
  const [bufferBeforeMinutes, setBufferBeforeMinutes] = useState(eventType.bufferBeforeMinutes);
  const [bufferAfterMinutes, setBufferAfterMinutes] = useState(eventType.bufferAfterMinutes);
  const [inviteeQuestions, setInviteeQuestions] = useState<InviteeQuestionDraft[]>(
    eventType.inviteeQuestions.map((question) => ({
      id: question.id,
      label: question.label,
      type: question.type,
      required: question.required,
      placeholder: question.placeholder ?? "",
    })),
  );
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await updateEventType({
        id: eventType.id,
        title,
        urlSlug,
        description,
        duration,
        scheduleId,
        meetingLocationType,
        meetingLocationValue,
        bufferBeforeMinutes,
        bufferAfterMinutes,
        inviteeQuestions,
      });
      router.push("/event-types");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not update this event type.");
      setSaving(false);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (!urlSlug || newTitle.toLowerCase().startsWith(urlSlug.replace(/-/g, " "))) {
      setUrlSlug(newTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
    }
  };

  const updateQuestion = (index: number, field: "label" | "type" | "required" | "placeholder", value: string | boolean) => {
    setInviteeQuestions((currentQuestions) => {
      const nextQuestions = [...currentQuestions];
      nextQuestions[index] = { ...nextQuestions[index], [field]: value } as InviteeQuestionDraft;
      return nextQuestions;
    });
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={() => router.back()}>
          Cancel
        </button>
        <div>
          <h1 className={styles.title}>Edit Event Type</h1>
          <p className={styles.subtitle}>Refine the booking page details people see before they schedule with you.</p>
        </div>
      </header>

      {feedback && <div className={styles.formNotice}>{feedback}</div>}

      <div className={styles.card}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Event name *</label>
            <input type="text" className={styles.input} value={title} onChange={handleTitleChange} required />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Event link *</label>
            <div className={styles.linkGroup}>
              <span className={styles.linkPrefix}>scalar.app/</span>
              <input type="text" className={styles.inputLink} value={urlSlug} onChange={(e) => setUrlSlug(e.target.value)} required />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Description/Instructions</label>
            <textarea className={styles.textarea} value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Duration (minutes) *</label>
              <select className={styles.select} value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={45}>45</option>
                <option value={60}>60</option>
                <option value={90}>90</option>
                <option value={120}>120</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Schedule *</label>
              <select className={styles.select} value={scheduleId} onChange={(event) => setScheduleId(event.target.value)}>
                {schedules.map((schedule) => (
                  <option key={schedule.id} value={schedule.id}>
                    {schedule.name}{schedule.isDefault ? " (Default)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Meeting location *</label>
              <select
                className={styles.select}
                value={meetingLocationType}
                onChange={(event) => setMeetingLocationType(event.target.value as MeetingLocationType)}
              >
                {MEETING_LOCATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Location details</label>
              <input
                type="text"
                className={styles.input}
                value={meetingLocationValue}
                onChange={(event) => setMeetingLocationValue(event.target.value)}
                placeholder={getMeetingLocationPlaceholder(meetingLocationType)}
              />
              <p className={styles.sectionHint}>{getMeetingLocationHelperText(meetingLocationType)}</p>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Buffer before (minutes)</label>
              <input type="number" min={0} className={styles.input} value={bufferBeforeMinutes} onChange={(event) => setBufferBeforeMinutes(Number(event.target.value))} />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Buffer after (minutes)</label>
              <input type="number" min={0} className={styles.input} value={bufferAfterMinutes} onChange={(event) => setBufferAfterMinutes(Number(event.target.value))} />
            </div>
          </div>

          <div className={styles.formGroup}>
            <div className={styles.sectionHeader}>
              <div>
                <label className={styles.label}>Custom invitee questions</label>
                <p className={styles.sectionHint}>Invitees can answer these before their booking is confirmed.</p>
              </div>
              <button
                type="button"
                className={styles.inlineButton}
                onClick={() => setInviteeQuestions((currentQuestions) => [...currentQuestions, { label: "", type: "text", required: false, placeholder: "" }])}
              >
                Add question
              </button>
            </div>

            <div className={styles.questionList}>
              {inviteeQuestions.length === 0 ? (
                <div className={styles.inlineEmpty}>No custom questions yet.</div>
              ) : (
                inviteeQuestions.map((question, index) => (
                  <div key={question.id ?? index} className={styles.questionCard}>
                    <input className={styles.input} placeholder="Question label" value={question.label} onChange={(event) => updateQuestion(index, "label", event.target.value)} />
                    <div className={styles.formRow}>
                      <select className={styles.select} value={question.type} onChange={(event) => updateQuestion(index, "type", event.target.value)}>
                        <option value="text">Short text</option>
                        <option value="textarea">Long text</option>
                      </select>
                      <input className={styles.input} placeholder="Placeholder (optional)" value={question.placeholder} onChange={(event) => updateQuestion(index, "placeholder", event.target.value)} />
                    </div>
                    <div className={styles.questionFooter}>
                      <label className={styles.checkInline}>
                        <input type="checkbox" checked={question.required} onChange={(event) => updateQuestion(index, "required", event.target.checked)} />
                        <span>Required</span>
                      </label>
                      <button type="button" className={styles.inlineDelete} onClick={() => setInviteeQuestions((currentQuestions) => currentQuestions.filter((_, questionIndex) => questionIndex !== index))}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={styles.footer}>
            <button type="submit" className={styles.submitButton} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
        <aside className={styles.previewCard}>
          <span className={styles.previewEyebrow}>Live preview</span>
          <h2 className={styles.previewTitle}>{title || "Your event title"}</h2>
          <p className={styles.previewMeta}>{duration} min, one-on-one</p>
          <p className={styles.previewMeta}>
            {MEETING_LOCATION_OPTIONS.find((option) => option.value === meetingLocationType)?.label}
            {meetingLocationValue ? ` - ${meetingLocationValue}` : ""}
          </p>
          <p className={styles.previewMeta}>Buffers: {bufferBeforeMinutes}m before, {bufferAfterMinutes}m after</p>
          <div className={styles.previewLink}>/{urlSlug || "your-event-link"}</div>
          <p className={styles.previewDescription}>
            {description || "Your invitees will see this information before they pick a date and time."}
          </p>
        </aside>
      </div>
    </div>
  );
}
