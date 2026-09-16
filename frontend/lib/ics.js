export const downloadICS = (meeting) => {
  const start = new Date(meeting.dateTime);
  const end = new Date(start.getTime() + (meeting.duration || 30) * 60000);

  const formatDate = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const escapeText = (text = "") => text.replace(/\n/g, "\\n").replace(/,/g, "\\,");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Expense Reminder//Meetings//EN",
    "BEGIN:VEVENT",
    `UID:${meeting._id}@expense-reminder`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(start)}`,
    `DTEND:${formatDate(end)}`,
    `SUMMARY:${escapeText(meeting.subject)}`,
    `DESCRIPTION:${escapeText(meeting.description || "")}\\n\\nJoin: ${meeting.meetingLink}`,
    `LOCATION:${meeting.meetingLink}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${meeting.subject.replace(/[^a-z0-9]/gi, "_")}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};