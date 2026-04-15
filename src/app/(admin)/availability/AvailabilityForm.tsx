"use client";

import { useMemo, useState } from "react";
import styles from "./page.module.css";
import { createSchedule, deleteSchedule, saveScheduleConfig } from "./actions";
import { Copy, Plus, Trash2 } from "lucide-react";

type Rule = {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type Override = {
  id?: string;
  date: string;
  startTime: string;
  endTime: string;
  isUnavailable: boolean;
};

type ScheduleConfig = {
  id: string;
  name: string;
  timeZone: string;
  isDefault: boolean;
  eventTypeCount: number;
  rules: Rule[];
  overrides: Override[];
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AvailabilityForm({
  userId,
  schedules: initialSchedules,
}: {
  userId: string;
  schedules: ScheduleConfig[];
}) {
  const [schedules, setSchedules] = useState(initialSchedules);
  const [activeScheduleId, setActiveScheduleId] = useState(initialSchedules[0]?.id ?? "");
  const [timeZoneQuery, setTimeZoneQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const activeSchedule = schedules.find((schedule) => schedule.id === activeScheduleId) ?? schedules[0];

  const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const supportedValuesOf = (
    Intl as typeof Intl & {
      supportedValuesOf?: (key: "timeZone") => string[];
    }
  ).supportedValuesOf;

  const allTimeZones = useMemo(() => {
    const fallback = ["UTC", "America/New_York", "America/Chicago", "America/Los_Angeles", "Europe/London", "Europe/Berlin", "Asia/Kolkata", "Asia/Singapore", "Australia/Sydney"];
    const zones = supportedValuesOf ? supportedValuesOf("timeZone") : fallback;
    return Array.from(new Set([browserTimeZone, ...schedules.map((schedule) => schedule.timeZone), ...zones])).sort();
  }, [browserTimeZone, schedules, supportedValuesOf]);

  const filteredTimeZones = useMemo(() => {
    if (!timeZoneQuery.trim()) return allTimeZones;
    const query = timeZoneQuery.trim().toLowerCase();
    return allTimeZones.filter((tz) => tz.toLowerCase().includes(query));
  }, [allTimeZones, timeZoneQuery]);

  const groupedRules = useMemo(
    () =>
      DAYS.map((dayName, idx) => ({
        dayOfWeek: idx,
        dayName,
        intervals: (activeSchedule?.rules ?? [])
          .filter((rule) => rule.dayOfWeek === idx)
          .sort((a, b) => a.startTime.localeCompare(b.startTime)),
      })),
    [activeSchedule],
  );

  function updateActiveSchedule(updater: (current: ScheduleConfig) => ScheduleConfig) {
    setSchedules((currentSchedules) =>
      currentSchedules.map((schedule) =>
        schedule.id === activeScheduleId ? updater(schedule) : schedule,
      ),
    );
  }

  const handleDayToggle = (dayOfWeek: number, isChecked: boolean) => {
    updateActiveSchedule((schedule) => ({
      ...schedule,
      rules: isChecked
        ? [...schedule.rules, { dayOfWeek, startTime: "09:00", endTime: "17:00" }]
        : schedule.rules.filter((rule) => rule.dayOfWeek !== dayOfWeek),
    }));
  };

  const updateInterval = (dayOfWeek: number, index: number, field: "startTime" | "endTime", value: string) => {
    updateActiveSchedule((schedule) => {
      const dayRules = schedule.rules.filter((rule) => rule.dayOfWeek === dayOfWeek);
      const otherRules = schedule.rules.filter((rule) => rule.dayOfWeek !== dayOfWeek);
      dayRules[index] = { ...dayRules[index], [field]: value };
      return { ...schedule, rules: [...otherRules, ...dayRules] };
    });
  };

  const addInterval = (dayOfWeek: number) => {
    updateActiveSchedule((schedule) => ({
      ...schedule,
      rules: [...schedule.rules, { dayOfWeek, startTime: "09:00", endTime: "17:00" }],
    }));
  };

  const removeInterval = (dayOfWeek: number, index: number) => {
    updateActiveSchedule((schedule) => {
      const dayRules = schedule.rules.filter((rule) => rule.dayOfWeek === dayOfWeek);
      const otherRules = schedule.rules.filter((rule) => rule.dayOfWeek !== dayOfWeek);
      dayRules.splice(index, 1);
      return { ...schedule, rules: [...otherRules, ...dayRules] };
    });
  };

  const copyToWeekdays = (dayOfWeek: number) => {
    if (!activeSchedule) return;
    const dayRules = activeSchedule.rules.filter((rule) => rule.dayOfWeek === dayOfWeek);
    if (dayRules.length === 0) return;

    updateActiveSchedule((schedule) => {
      let nextRules = schedule.rules.filter((rule) => ![1, 2, 3, 4, 5].includes(rule.dayOfWeek));
      for (let weekday = 1; weekday <= 5; weekday += 1) {
        nextRules = nextRules.concat(dayRules.map((rule) => ({ ...rule, id: undefined, dayOfWeek: weekday })));
      }
      return { ...schedule, rules: nextRules };
    });

    setFeedback({ type: "success", message: "Copied these hours to Monday through Friday." });
  };

  const handleOverrideChange = (index: number, field: keyof Override, value: string | boolean) => {
    updateActiveSchedule((schedule) => {
      const overrides = [...schedule.overrides];
      overrides[index] = { ...overrides[index], [field]: value } as Override;
      return { ...schedule, overrides };
    });
  };

  const addOverride = () => {
    updateActiveSchedule((schedule) => ({
      ...schedule,
      overrides: [
        ...schedule.overrides,
        { date: "", startTime: "09:00", endTime: "17:00", isUnavailable: false },
      ],
    }));
  };

  const removeOverride = (index: number) => {
    updateActiveSchedule((schedule) => ({
      ...schedule,
      overrides: schedule.overrides.filter((_, overrideIndex) => overrideIndex !== index),
    }));
  };

  const handleScheduleNameChange = (value: string) => {
    updateActiveSchedule((schedule) => ({ ...schedule, name: value }));
  };

  const handleTimezoneChange = (value: string) => {
    updateActiveSchedule((schedule) => ({ ...schedule, timeZone: value }));
  };

  const handleDefaultToggle = (checked: boolean) => {
    setSchedules((currentSchedules) =>
      currentSchedules.map((schedule) =>
        schedule.id === activeScheduleId
          ? { ...schedule, isDefault: checked }
          : { ...schedule, isDefault: checked ? false : schedule.isDefault },
      ),
    );
  };

  const handleSave = async () => {
    if (!activeSchedule) return;

    setSaving(true);
    try {
      await saveScheduleConfig({
        scheduleId: activeSchedule.id,
        name: activeSchedule.name,
        timeZone: activeSchedule.timeZone,
        isDefault: activeSchedule.isDefault,
        rules: activeSchedule.rules,
        overrides: activeSchedule.overrides,
      });
      setFeedback({ type: "success", message: "Schedule configuration updated successfully." });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Could not save schedule changes.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSchedule = async () => {
    setCreating(true);
    try {
      const scheduleId = await createSchedule({
        userId,
        name: `New Schedule ${schedules.length + 1}`,
        timeZone: browserTimeZone,
      });

      const newSchedule: ScheduleConfig = {
        id: scheduleId,
        name: `New Schedule ${schedules.length + 1}`,
        timeZone: browserTimeZone,
        isDefault: false,
        eventTypeCount: 0,
        rules: [],
        overrides: [],
      };

      setSchedules((currentSchedules) => [...currentSchedules, newSchedule]);
      setActiveScheduleId(scheduleId);
      setFeedback({ type: "success", message: "Created a new availability schedule." });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Could not create a schedule.",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!activeSchedule) return;

    try {
      await deleteSchedule(activeSchedule.id);
      const nextSchedules = schedules.filter((schedule) => schedule.id !== activeSchedule.id);
      setSchedules(nextSchedules);
      setActiveScheduleId(nextSchedules[0]?.id ?? "");
      setFeedback({ type: "success", message: "Deleted the schedule successfully." });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Could not delete this schedule.",
      });
    }
  };

  if (!activeSchedule) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Availability</h1>
          <p className={styles.subtitle}>Manage multiple schedules, date-specific overrides, and the default hours used by your booking pages.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.secondaryAction} onClick={handleCreateSchedule} disabled={creating}>
            {creating ? "Creating..." : "New schedule"}
          </button>
          <button className={styles.saveButton} onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className={styles.scheduleTabs}>
        {schedules.map((schedule) => (
          <button
            key={schedule.id}
            className={`${styles.scheduleTab} ${schedule.id === activeScheduleId ? styles.scheduleTabActive : ""}`}
            onClick={() => setActiveScheduleId(schedule.id)}
          >
            <span>{schedule.name}</span>
            {schedule.isDefault && <small>Default</small>}
          </button>
        ))}
      </div>

      <div className={styles.summaryCard}>
        <div>
          <span className={styles.summaryEyebrow}>Schedule details</span>
          <h2 className={styles.summaryTitle}>{activeSchedule.name}</h2>
        </div>
        <p className={styles.summaryText}>
          This schedule is linked to {activeSchedule.eventTypeCount} event type{activeSchedule.eventTypeCount === 1 ? "" : "s"}.
        </p>
      </div>

      {feedback && (
        <div className={`${styles.notice} ${feedback.type === "success" ? styles.noticeSuccess : styles.noticeError}`}>
          <span>{feedback.message}</span>
          <button className={styles.noticeDismiss} onClick={() => setFeedback(null)}>Dismiss</button>
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.scheduleMetaGrid}>
          <div className={styles.formField}>
            <label className={styles.fieldLabel}>Schedule name</label>
            <input className={styles.textInput} value={activeSchedule.name} onChange={(event) => handleScheduleNameChange(event.target.value)} />
          </div>
          <div className={styles.formField}>
            <label className={styles.fieldLabel}>Default schedule</label>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={activeSchedule.isDefault} onChange={(event) => handleDefaultToggle(event.target.checked)} />
              <span>Use this schedule by default</span>
            </label>
          </div>
        </div>

        <div className={styles.timezoneRow}>
          <div className={styles.timeZoneLabelWrap}>
            <strong>Timezone:</strong>
            <span className={styles.timeZoneHint}>Current browser timezone: {browserTimeZone}</span>
          </div>
          <div className={styles.timeZoneControls}>
            <input
              type="text"
              className={styles.timeZoneSearch}
              value={timeZoneQuery}
              onChange={(event) => setTimeZoneQuery(event.target.value)}
              placeholder="Search timezone"
            />
            <select
              className={styles.timeZoneSelect}
              value={activeSchedule.timeZone}
              onChange={(event) => handleTimezoneChange(event.target.value)}
            >
              {filteredTimeZones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.scheduleSection}>
          <div className={styles.sectionHeading}>
            <div>
              <h3>Weekly hours</h3>
              <p>Set recurring availability for each day of the week.</p>
            </div>
          </div>

          <div className={styles.scheduleList}>
            {groupedRules.map((day) => (
              <div key={day.dayOfWeek} className={styles.dayRow}>
                <div className={styles.dayToggle}>
                  <input
                    type="checkbox"
                    checked={day.intervals.length > 0}
                    onChange={(event) => handleDayToggle(day.dayOfWeek, event.target.checked)}
                    className={styles.checkbox}
                  />
                  <span className={styles.dayName}>{day.dayName}</span>
                </div>

                <div className={styles.intervals}>
                  {day.intervals.length === 0 ? (
                    <span className={styles.unavailable}>Unavailable</span>
                  ) : (
                    day.intervals.map((interval, index) => (
                      <div key={index} className={styles.intervalInputs}>
                        <input
                          type="time"
                          value={interval.startTime}
                          onChange={(event) => updateInterval(day.dayOfWeek, index, "startTime", event.target.value)}
                          className={styles.timeInput}
                        />
                        <span>-</span>
                        <input
                          type="time"
                          value={interval.endTime}
                          onChange={(event) => updateInterval(day.dayOfWeek, index, "endTime", event.target.value)}
                          className={styles.timeInput}
                        />
                        <button className={styles.iconBtn} onClick={() => removeInterval(day.dayOfWeek, index)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className={styles.dayActions}>
                  <button className={styles.iconBtn} onClick={() => addInterval(day.dayOfWeek)} title="Add interval">
                    <Plus size={16} />
                  </button>
                  <button className={styles.iconBtn} onClick={() => copyToWeekdays(day.dayOfWeek)} title="Copy to weekdays">
                    <Copy size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.scheduleSection}>
          <div className={styles.sectionHeading}>
            <div>
              <h3>Date-specific overrides</h3>
              <p>Override weekly hours for one-off holidays, events, or shorter working days.</p>
            </div>
            <button className={styles.secondaryAction} onClick={addOverride}>Add override</button>
          </div>

          <div className={styles.overrideList}>
            {activeSchedule.overrides.length === 0 ? (
              <div className={styles.emptyInline}>No date-specific overrides yet.</div>
            ) : (
              activeSchedule.overrides.map((override, index) => (
                <div key={`${override.date}-${index}`} className={styles.overrideRow}>
                  <input
                    type="date"
                    className={styles.textInput}
                    value={override.date}
                    onChange={(event) => handleOverrideChange(index, "date", event.target.value)}
                  />
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={override.isUnavailable}
                      onChange={(event) => handleOverrideChange(index, "isUnavailable", event.target.checked)}
                    />
                    <span>Unavailable all day</span>
                  </label>
                  {!override.isUnavailable && (
                    <>
                      <input
                        type="time"
                        className={styles.timeInput}
                        value={override.startTime}
                        onChange={(event) => handleOverrideChange(index, "startTime", event.target.value)}
                      />
                      <input
                        type="time"
                        className={styles.timeInput}
                        value={override.endTime}
                        onChange={(event) => handleOverrideChange(index, "endTime", event.target.value)}
                      />
                    </>
                  )}
                  <button className={styles.iconBtn} onClick={() => removeOverride(index)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {!activeSchedule.isDefault && (
          <div className={styles.deleteRow}>
            <p>This schedule can be deleted only when no event types are assigned to it.</p>
            <button className={styles.deleteButton} onClick={handleDeleteSchedule}>
              Delete schedule
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
