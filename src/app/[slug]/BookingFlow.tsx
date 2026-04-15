"use client";

import { useState } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, startOfDay, addMinutes } from "date-fns";
import { ChevronLeft, ChevronRight, Globe, ArrowLeft, Clock, Video } from "lucide-react";
import styles from "./BookingFlow.module.css";
import { bookMeeting } from "./actions";
import { getAvailableSlotsForDate } from "@/lib/scheduling";

type BookingFlowProps = {
  eventType: {
    id: string;
    title: string;
    duration: number;
    bufferBeforeMinutes: number;
    bufferAfterMinutes: number;
  };
  schedule: {
    timeZone: string;
    availabilities: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
    }[];
    dateOverrides: {
      date: string | Date;
      startTime: string | null;
      endTime: string | null;
      isUnavailable: boolean;
    }[];
  };
  meetings: {
    id: string;
    startTime: string | Date;
    endTime: string | Date;
    bufferBeforeMinutes?: number | null;
    bufferAfterMinutes?: number | null;
  }[];
  inviteeQuestions: {
    id: string;
    label: string;
    type: string;
    required: boolean;
    placeholder: string | null;
  }[];
  rescheduleMeeting?: {
    id: string;
    inviteeName: string;
    inviteeEmail: string;
  };
};

export default function BookingFlow({ eventType, schedule, meetings, inviteeQuestions, rescheduleMeeting }: BookingFlowProps) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [step, setStep] = useState<"calendar" | "details" | "confirmed">("calendar");
  
  const [name, setName] = useState(rescheduleMeeting?.inviteeName ?? "");
  const [email, setEmail] = useState(rescheduleMeeting?.inviteeEmail ?? "");
  const [booking, setBooking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  // Calendar logic
  const startDateInWeek = startOfMonth(currentMonth).getDay();
  const blanks = Array.from({ length: startDateInWeek });

  const isDayAvailable = (date: Date) => {
    if (isBefore(date, startOfDay(new Date()))) return false;
    return getAvailableSlotsForDate({
      date,
      durationMinutes: eventType.duration,
      bufferBeforeMinutes: eventType.bufferBeforeMinutes,
      bufferAfterMinutes: eventType.bufferAfterMinutes,
      availabilities: schedule.availabilities,
      overrides: schedule.dateOverrides,
      meetings: meetings.filter((meeting) => meeting.id !== rescheduleMeeting?.id),
    }).length > 0;
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTime) return;
    setBooking(true);
    setFeedback(null);
    setWarning(null);
    
    try {
      const res = await bookMeeting({
        eventTypeId: eventType.id,
        inviteeName: name,
        inviteeEmail: email,
        startTime: selectedTime,
        endTime: addMinutes(selectedTime, eventType.duration),
        rescheduleMeetingId: rescheduleMeeting?.id,
        answers: inviteeQuestions.map((question) => ({
          questionId: question.id,
          label: question.label,
          type: question.type,
          value: questionAnswers[question.id] ?? "",
        })),
      });
      if (res.success) {
        setWarning(res.warning ?? null);
        setStep("confirmed");
      } else {
        setFeedback(res.error || "Failed to book this meeting.");
      }
    } catch {
      setFeedback("Something went wrong while reserving this time. Please try again.");
    } finally {
      setBooking(false);
    }
  };

  if (step === "confirmed") {
    return (
      <div className={styles.confirmation}>
        <div className={styles.avatarLarge}>C</div>
        <h2>You are scheduled</h2>
        <p className={styles.confText}>A calendar invitation has been sent to your email address.</p>
        {warning && <div className={styles.warningNotice}>{warning}</div>}
        
        <div className={styles.confDetails}>
          <div className={styles.confTitle}>{eventType.title}</div>
          <div className={styles.confTime}>
            <Clock size={16} />
            {selectedTime && format(selectedTime, "EEEE, MMMM d, yyyy")}
            <br/>
            {selectedTime && format(selectedTime, "h:mm a")} - {selectedTime && format(addMinutes(selectedTime, eventType.duration), "h:mm a")}
          </div>
          <div className={styles.confTime}>
            <Globe size={16} /> {schedule.timeZone}
          </div>
          <div className={styles.confTime}>
            <Video size={16} /> Web conferencing details to follow
          </div>
        </div>
      </div>
    );
  }

  if (step === "details" && selectedTime) {
    return (
      <div className={styles.formContainer}>
        <button className={styles.backBtn} onClick={() => setStep("calendar")}>
          <ArrowLeft size={16} /> Back
        </button>
        <h2 className={styles.formTitle}>Enter Details</h2>
        <div className={styles.selectedSummary}>
          <div className={styles.summaryTitle}>{eventType.title}</div>
          <div className={styles.summaryMeta}>
            <Clock size={16} />
            {format(selectedTime, "EEEE, MMMM d, yyyy")} at {format(selectedTime, "h:mm a")}
          </div>
          <div className={styles.summaryMeta}>
            <Globe size={16} />
            {schedule.timeZone}
          </div>
        </div>
        {feedback && <div className={styles.formNotice}>{feedback}</div>}
        <form onSubmit={handleBooking} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Name *</label>
            <input required value={name} onChange={e => setName(e.target.value)} className={styles.input} />
          </div>
          <div className={styles.formGroup}>
            <label>Email *</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className={styles.input} />
          </div>
          {inviteeQuestions.map((question) => (
            <div key={question.id} className={styles.formGroup}>
              <label>{question.label}{question.required ? " *" : ""}</label>
              {question.type === "textarea" ? (
                <textarea
                  required={question.required}
                  value={questionAnswers[question.id] ?? ""}
                  onChange={(event) => setQuestionAnswers((currentAnswers) => ({ ...currentAnswers, [question.id]: event.target.value }))}
                  className={styles.input}
                  rows={4}
                  placeholder={question.placeholder ?? ""}
                />
              ) : (
                <input
                  required={question.required}
                  value={questionAnswers[question.id] ?? ""}
                  onChange={(event) => setQuestionAnswers((currentAnswers) => ({ ...currentAnswers, [question.id]: event.target.value }))}
                  className={styles.input}
                  placeholder={question.placeholder ?? ""}
                />
              )}
            </div>
          ))}
          <button type="submit" className={styles.submitBtn} disabled={booking}>
            {booking ? "Scheduling..." : rescheduleMeeting ? "Reschedule Event" : "Schedule Event"}
          </button>
        </form>
      </div>
    );
  }

  const availableSlots = selectedDate ? getAvailableSlotsForDate({
    date: selectedDate,
    durationMinutes: eventType.duration,
    bufferBeforeMinutes: eventType.bufferBeforeMinutes,
    bufferAfterMinutes: eventType.bufferAfterMinutes,
    availabilities: schedule.availabilities,
    overrides: schedule.dateOverrides,
    meetings: meetings.filter((meeting) => meeting.id !== rescheduleMeeting?.id),
  }) : [];

  return (
    <div className={styles.calendarLayout}>
      <div className={styles.calendarSection}>
        <h2 className={styles.sectionTitle}>Select a Date & Time</h2>
        <div className={styles.calendarHeader}>
          <button onClick={prevMonth} disabled={isBefore(endOfMonth(subMonths(currentMonth, 1)), startOfDay(new Date()))} className={styles.navBtn}><ChevronLeft size={20}/></button>
          <div className={styles.monthName}>{format(currentMonth, "MMMM yyyy")}</div>
          <button onClick={nextMonth} className={styles.navBtn}><ChevronRight size={20}/></button>
        </div>
        
        <div className={styles.weekDays}>
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
            <div key={d} className={styles.weekDay}>{d}</div>
          ))}
        </div>
        
        <div className={styles.daysGrid}>
          {blanks.map((_, i) => <div key={`blank-${i}`} className={styles.dayEmpty} />)}
          {daysInMonth.map(day => {
            const isAvailable = isDayAvailable(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            return (
              <button 
                key={day.toISOString()}
                onClick={() => { if(isAvailable) setSelectedDate(day) }}
                className={`${styles.dayBtn} ${isSelected ? styles.daySelected : ''} ${!isAvailable ? styles.dayDisabled : ''}`}
                disabled={!isAvailable}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>

        <div className={styles.timezone}>
          <Globe size={16} /> Time zone: {schedule.timeZone}
        </div>
      </div>

      {selectedDate && (
        <div className={styles.timeSection}>
          <div className={styles.selectedDateHeader}>
            {format(selectedDate, "EEEE, MMMM d")}
          </div>
          <div className={styles.timeSlots}>
            {availableSlots.length > 0 ? availableSlots.map(slot => {
              const isSelected = selectedTime ? slot.getTime() === selectedTime.getTime() : false;
              return (
                <div key={slot.toISOString()} className={styles.timeSlotRow}>
                  <button
                    className={`${styles.timeSlotBtn} ${isSelected ? styles.timeSlotBtnSelected : ""}`}
                    onClick={() => setSelectedTime(slot)}
                  >
                    {format(slot, "h:mm a")}
                  </button>
                  {isSelected && (
                    <button className={styles.nextBtn} onClick={() => setStep("details")}>
                      Next
                    </button>
                  )}
                </div>
              );
            }) : (
              <div className={styles.noSlots}>No times available</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
