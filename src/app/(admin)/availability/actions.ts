"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

type AvailabilityRuleInput = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type DateOverrideInput = {
  date: string;
  startTime: string;
  endTime: string;
  isUnavailable: boolean;
};

function validateRules(rules: AvailabilityRuleInput[]) {
  const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

  for (const rule of rules) {
    if (rule.dayOfWeek < 0 || rule.dayOfWeek > 6) {
      throw new Error("Availability day must be between Sunday and Saturday.");
    }

    if (!timePattern.test(rule.startTime) || !timePattern.test(rule.endTime)) {
      throw new Error("Availability times must use HH:mm format.");
    }

    if (rule.startTime >= rule.endTime) {
      throw new Error("Availability end time must be after start time.");
    }
  }

  const byDay = new Map<number, AvailabilityRuleInput[]>();
  for (const rule of rules) {
    const dayRules = byDay.get(rule.dayOfWeek) ?? [];
    dayRules.push(rule);
    byDay.set(rule.dayOfWeek, dayRules);
  }

  for (const [, dayRules] of byDay) {
    const sorted = dayRules.slice().sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (let index = 1; index < sorted.length; index += 1) {
      if (sorted[index].startTime < sorted[index - 1].endTime) {
        throw new Error("Availability intervals cannot overlap on the same day.");
      }
    }
  }
}

function validateOverrides(overrides: DateOverrideInput[]) {
  const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
  const seenDates = new Set<string>();

  for (const override of overrides) {
    if (!override.date) {
      throw new Error("Each date override must include a date.");
    }

    if (seenDates.has(override.date) && override.isUnavailable) {
      throw new Error("Only one unavailable override can exist for the same date.");
    }

    if (override.isUnavailable) {
      seenDates.add(override.date);
      continue;
    }

    if (!timePattern.test(override.startTime) || !timePattern.test(override.endTime)) {
      throw new Error("Date override times must use HH:mm format.");
    }

    if (override.startTime >= override.endTime) {
      throw new Error("Date override end time must be after start time.");
    }
  }
}

export async function saveScheduleConfig(data: {
  scheduleId: string;
  name: string;
  timeZone: string;
  isDefault: boolean;
  rules: AvailabilityRuleInput[];
  overrides: DateOverrideInput[];
}) {
  if (!data.name.trim()) {
    throw new Error("Schedule name is required.");
  }

  if (!data.timeZone.trim()) {
    throw new Error("Timezone is required.");
  }

  validateRules(data.rules);
  validateOverrides(data.overrides);

  const schedule = await prisma.schedule.findUnique({
    where: { id: data.scheduleId },
    select: { userId: true },
  });

  if (!schedule) {
    throw new Error("Schedule not found.");
  }

  await prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.schedule.updateMany({
        where: { userId: schedule.userId },
        data: { isDefault: false },
      });
    }

    await tx.schedule.update({
      where: { id: data.scheduleId },
      data: {
        name: data.name.trim(),
        timeZone: data.timeZone.trim(),
        isDefault: data.isDefault,
      },
    });

    await tx.availabilityRule.deleteMany({
      where: { scheduleId: data.scheduleId },
    });

    if (data.rules.length > 0) {
      await tx.availabilityRule.createMany({
        data: data.rules.map((rule) => ({
          scheduleId: data.scheduleId,
          dayOfWeek: rule.dayOfWeek,
          startTime: rule.startTime,
          endTime: rule.endTime,
        })),
      });
    }

    await tx.scheduleDateOverride.deleteMany({
      where: { scheduleId: data.scheduleId },
    });

    if (data.overrides.length > 0) {
      await tx.scheduleDateOverride.createMany({
        data: data.overrides.map((override) => ({
          scheduleId: data.scheduleId,
          date: new Date(`${override.date}T00:00:00.000Z`),
          startTime: override.isUnavailable ? null : override.startTime,
          endTime: override.isUnavailable ? null : override.endTime,
          isUnavailable: override.isUnavailable,
        })),
      });
    }
  });

  revalidatePath("/availability");
  revalidatePath("/dashboard");
  revalidatePath("/");
}

export async function createSchedule(data: { userId: string; name: string; timeZone: string }) {
  if (!data.name.trim()) {
    throw new Error("Schedule name is required.");
  }

  const schedule = await prisma.schedule.create({
    data: {
      userId: data.userId,
      name: data.name.trim(),
      timeZone: data.timeZone.trim() || "UTC",
      isDefault: false,
    },
  });

  revalidatePath("/availability");
  return schedule.id;
}

export async function deleteSchedule(scheduleId: string) {
  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
    include: {
      _count: {
        select: { eventTypes: true },
      },
    },
  });

  if (!schedule) {
    throw new Error("Schedule not found.");
  }

  if (schedule.isDefault) {
    throw new Error("The default schedule cannot be deleted.");
  }

  if (schedule._count.eventTypes > 0) {
    throw new Error("Reassign event types before deleting this schedule.");
  }

  await prisma.schedule.delete({
    where: { id: scheduleId },
  });

  revalidatePath("/availability");
}
