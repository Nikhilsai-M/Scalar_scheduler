import nodemailer from "nodemailer";

type MeetingEmailDetails = {
  hostEmail: string;
  hostName: string;
  inviteeEmail: string;
  inviteeName: string;
  eventTitle: string;
  startTime: Date;
  endTime: Date;
  timeZone: string;
  location: string;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required email environment variable: ${name}`);
  }
  return value;
}

function isEmailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.MAIL_FROM,
  );
}

function formatMeetingWindow(startTime: Date, endTime: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone,
  });

  return `${formatter.format(startTime)} to ${formatter.format(endTime)} (${timeZone})`;
}

function getTransporter() {
  return nodemailer.createTransport({
    host: getRequiredEnv("SMTP_HOST"),
    port: Number(getRequiredEnv("SMTP_PORT")),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: getRequiredEnv("SMTP_USER"),
      pass: getRequiredEnv("SMTP_PASS"),
    },
  });
}

async function sendEmail(options: {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
}) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: getRequiredEnv("MAIL_FROM"),
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
}

function getHostRecipients(hostEmail: string) {
  const explicitRecipient = process.env.MAIL_TO?.trim();
  return explicitRecipient ? [explicitRecipient] : [hostEmail];
}

export async function sendBookingEmails(details: MeetingEmailDetails) {
  if (!isEmailConfigured()) {
    throw new Error("Email delivery is not configured. Please add SMTP settings to your environment.");
  }

  const when = formatMeetingWindow(details.startTime, details.endTime, details.timeZone);

  await Promise.all([
    sendEmail({
      to: details.inviteeEmail,
      subject: `Booking confirmed: ${details.eventTitle}`,
      text: `Hi ${details.inviteeName}, your meeting "${details.eventTitle}" with ${details.hostName} is confirmed for ${when}. Location: ${details.location}.`,
      html: `
        <div style="font-family:Segoe UI,Arial,sans-serif;line-height:1.6;color:#102a43">
          <h2 style="margin-bottom:12px;">Your meeting is confirmed</h2>
          <p>Hi ${details.inviteeName},</p>
          <p>Your meeting <strong>${details.eventTitle}</strong> with <strong>${details.hostName}</strong> is confirmed.</p>
          <p><strong>When:</strong> ${when}</p>
          <p><strong>Where:</strong> ${details.location}</p>
        </div>
      `,
    }),
    sendEmail({
      to: getHostRecipients(details.hostEmail),
      subject: `New booking: ${details.eventTitle}`,
      text: `${details.inviteeName} (${details.inviteeEmail}) booked "${details.eventTitle}" for ${when}. Location: ${details.location}.`,
      html: `
        <div style="font-family:Segoe UI,Arial,sans-serif;line-height:1.6;color:#102a43">
          <h2 style="margin-bottom:12px;">New booking received</h2>
          <p><strong>${details.inviteeName}</strong> (${details.inviteeEmail}) booked <strong>${details.eventTitle}</strong>.</p>
          <p><strong>When:</strong> ${when}</p>
          <p><strong>Where:</strong> ${details.location}</p>
        </div>
      `,
    }),
  ]);
}

export async function sendCancellationEmails(details: MeetingEmailDetails) {
  if (!isEmailConfigured()) {
    throw new Error("Email delivery is not configured. Please add SMTP settings to your environment.");
  }

  const when = formatMeetingWindow(details.startTime, details.endTime, details.timeZone);

  await Promise.all([
    sendEmail({
      to: details.inviteeEmail,
      subject: `Meeting canceled: ${details.eventTitle}`,
      text: `Hi ${details.inviteeName}, your meeting "${details.eventTitle}" with ${details.hostName} scheduled for ${when} has been canceled. Location: ${details.location}.`,
      html: `
        <div style="font-family:Segoe UI,Arial,sans-serif;line-height:1.6;color:#102a43">
          <h2 style="margin-bottom:12px;">Meeting canceled</h2>
          <p>Hi ${details.inviteeName},</p>
          <p>Your meeting <strong>${details.eventTitle}</strong> with <strong>${details.hostName}</strong> scheduled for ${when} has been canceled.</p>
          <p><strong>Where:</strong> ${details.location}</p>
        </div>
      `,
    }),
    sendEmail({
      to: getHostRecipients(details.hostEmail),
      subject: `Canceled booking: ${details.eventTitle}`,
      text: `${details.inviteeName} (${details.inviteeEmail}) no longer has "${details.eventTitle}" booked for ${when}. Location: ${details.location}.`,
      html: `
        <div style="font-family:Segoe UI,Arial,sans-serif;line-height:1.6;color:#102a43">
          <h2 style="margin-bottom:12px;">Booking canceled</h2>
          <p><strong>${details.inviteeName}</strong> (${details.inviteeEmail}) is no longer scheduled for <strong>${details.eventTitle}</strong>.</p>
          <p><strong>When:</strong> ${when}</p>
          <p><strong>Where:</strong> ${details.location}</p>
        </div>
      `,
    }),
  ]);
}
