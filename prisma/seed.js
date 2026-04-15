/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient({})

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      name: 'Default Admin User',
      timeZone: 'UTC',
    },
    create: {
      name: 'Default Admin User',
      email: 'admin@example.com',
      timeZone: 'UTC',
    },
  })

  let schedule = await prisma.schedule.findFirst({
    where: { userId: user.id },
  })
  let focusSchedule = await prisma.schedule.findFirst({
    where: { userId: user.id, name: 'Focus Hours' },
  })

  if (!schedule) {
    schedule = await prisma.schedule.create({
      data: {
        userId: user.id,
        name: 'Working Hours',
        timeZone: 'UTC',
        isDefault: true,
        availabilities: {
          create: [
            { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }, // Mon
            { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' }, // Tue
            { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' }, // Wed
            { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' }, // Thu
            { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' }, // Fri
          ],
        },
      },
    })
  } else {
    schedule = await prisma.schedule.update({
      where: { id: schedule.id },
      data: {
        name: schedule.name || 'Working Hours',
        timeZone: schedule.timeZone || 'UTC',
        isDefault: true,
      },
    })
  }

  if (!focusSchedule) {
    focusSchedule = await prisma.schedule.create({
      data: {
        userId: user.id,
        name: 'Focus Hours',
        timeZone: 'UTC',
        isDefault: false,
        availabilities: {
          create: [
            { dayOfWeek: 2, startTime: '10:00', endTime: '16:00' },
            { dayOfWeek: 4, startTime: '10:00', endTime: '16:00' },
          ],
        },
      },
    })
  }

  const eventType1 = await prisma.eventType.upsert({
    where: { urlSlug: '15min' },
    update: {
      title: '15 Minute Meeting',
      description: 'Quick sync',
      duration: 15,
      userId: user.id,
      scheduleId: schedule.id,
      meetingLocationType: 'GOOGLE_MEET',
      meetingLocationValue: 'https://meet.google.com/sample-15min',
      isActive: true,
      bufferBeforeMinutes: 5,
      bufferAfterMinutes: 5,
    },
    create: {
      userId: user.id,
      scheduleId: schedule.id,
      title: '15 Minute Meeting',
      description: 'Quick sync',
      duration: 15,
      urlSlug: '15min',
      meetingLocationType: 'GOOGLE_MEET',
      meetingLocationValue: 'https://meet.google.com/sample-15min',
      isActive: true,
      bufferBeforeMinutes: 5,
      bufferAfterMinutes: 5,
    }
  })

  const eventType2 = await prisma.eventType.upsert({
    where: { urlSlug: '30min' },
    update: {
      title: '30 Minute Meeting',
      description: 'Standard meeting',
      duration: 30,
      userId: user.id,
      scheduleId: focusSchedule.id,
      meetingLocationType: 'ZOOM',
      meetingLocationValue: 'https://zoom.us/j/sample-30min',
      isActive: true,
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 10,
    },
    create: {
      userId: user.id,
      scheduleId: focusSchedule.id,
      title: '30 Minute Meeting',
      description: 'Standard meeting',
      duration: 30,
      urlSlug: '30min',
      meetingLocationType: 'ZOOM',
      meetingLocationValue: 'https://zoom.us/j/sample-30min',
      isActive: true,
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 10,
    }
  })

  await prisma.inviteeQuestion.deleteMany({
    where: {
      eventTypeId: { in: [eventType1.id, eventType2.id] },
    },
  })

  await prisma.inviteeQuestion.createMany({
    data: [
      {
        eventTypeId: eventType1.id,
        label: 'What would you like to cover?',
        type: 'text',
        required: true,
        placeholder: 'Share a short agenda',
        sortOrder: 0,
      },
      {
        eventTypeId: eventType2.id,
        label: 'Company or team name',
        type: 'text',
        required: false,
        placeholder: 'Optional',
        sortOrder: 0,
      },
      {
        eventTypeId: eventType2.id,
        label: 'What are you hoping to accomplish?',
        type: 'textarea',
        required: true,
        placeholder: 'Add context for the meeting',
        sortOrder: 1,
      },
    ],
  })

  const now = new Date()
  const oneDay = 24 * 60 * 60 * 1000
  const overrideDate = new Date(now.getTime() + (5 * oneDay))
  overrideDate.setHours(0, 0, 0, 0)

  await prisma.scheduleDateOverride.deleteMany({
    where: { scheduleId: schedule.id },
  })

  await prisma.scheduleDateOverride.createMany({
    data: [
      {
        scheduleId: schedule.id,
        date: overrideDate,
        startTime: '12:00',
        endTime: '16:00',
        isUnavailable: false,
      },
    ],
  })

  const upcomingStart = new Date(now.getTime() + (2 * oneDay))
  upcomingStart.setHours(10, 0, 0, 0)
  const upcomingEnd = new Date(upcomingStart.getTime() + eventType2.duration * 60 * 1000)

  const pastStart = new Date(now.getTime() - (2 * oneDay))
  pastStart.setHours(15, 0, 0, 0)
  const pastEnd = new Date(pastStart.getTime() + eventType1.duration * 60 * 1000)

  const existingMeetings = await prisma.meeting.count({
    where: { eventType: { userId: user.id } },
  })

  if (existingMeetings === 0) {
    await prisma.meeting.createMany({
      data: [
        {
          eventTypeId: eventType2.id,
          inviteeName: 'Ada Lovelace',
          inviteeEmail: 'ada@example.com',
          startTime: upcomingStart,
          endTime: upcomingEnd,
          status: 'SCHEDULED',
          hostNameSnapshot: user.name,
          eventTitleSnapshot: eventType2.title,
          scheduleTimeZone: user.timeZone,
          meetingLocationTypeSnapshot: eventType2.meetingLocationType,
          meetingLocationValueSnapshot: eventType2.meetingLocationValue,
          durationMinutes: eventType2.duration,
          bufferBeforeMinutes: eventType2.bufferBeforeMinutes,
          bufferAfterMinutes: eventType2.bufferAfterMinutes,
        },
        {
          eventTypeId: eventType1.id,
          inviteeName: 'Alan Turing',
          inviteeEmail: 'alan@example.com',
          startTime: pastStart,
          endTime: pastEnd,
          status: 'SCHEDULED',
          hostNameSnapshot: user.name,
          eventTitleSnapshot: eventType1.title,
          scheduleTimeZone: user.timeZone,
          meetingLocationTypeSnapshot: eventType1.meetingLocationType,
          meetingLocationValueSnapshot: eventType1.meetingLocationValue,
          durationMinutes: eventType1.duration,
          bufferBeforeMinutes: eventType1.bufferBeforeMinutes,
          bufferAfterMinutes: eventType1.bufferAfterMinutes,
        },
      ],
    })
  }

  console.log('Database seeded successfully')
  console.log('User ID:', user.id)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
