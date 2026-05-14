const prefix = "/api";

export type ClientAction = { type: string; target: string };

export type AssistantReply = { reply: string; actions: ClientAction[] };

export async function assistantChat(text: string): Promise<AssistantReply> {
  const r = await fetch(`${prefix}/assistant/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || r.statusText);
  }
  return r.json();
}

export async function quickNote(text: string): Promise<void> {
  const r = await fetch(`${prefix}/assistant/quick-note`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!r.ok) throw new Error(await r.text());
}

export type Note = { id: number; title: string; body: string; created_at: string };

export async function fetchNotes(): Promise<Note[]> {
  const r = await fetch(`${prefix}/notes`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function createNote(title: string, body: string): Promise<void> {
  const r = await fetch(`${prefix}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, body }),
  });
  if (!r.ok) throw new Error(await r.text());
}

export async function deleteNote(id: number): Promise<void> {
  const r = await fetch(`${prefix}/notes/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error(await r.text());
}

export type Reminder = {
  id: number;
  text: string;
  due_at: string;
  done: boolean;
  created_at: string;
};

export async function fetchReminders(): Promise<Reminder[]> {
  const r = await fetch(`${prefix}/reminders`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function createReminder(text: string, dueAtIso: string): Promise<void> {
  const r = await fetch(`${prefix}/reminders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, due_at: dueAtIso }),
  });
  if (!r.ok) throw new Error(await r.text());
}

export async function markReminderDone(id: number): Promise<void> {
  const r = await fetch(`${prefix}/reminders/${id}/done`, { method: "PATCH" });
  if (!r.ok) throw new Error(await r.text());
}

export type TimetableEntry = {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  title: string;
  location: string;
};

export async function fetchTimetable(): Promise<TimetableEntry[]> {
  const r = await fetch(`${prefix}/timetable`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function createTimetableEntry(payload: {
  day_of_week: number;
  start_time: string;
  end_time: string;
  title: string;
  location: string;
}): Promise<void> {
  const r = await fetch(`${prefix}/timetable`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(await r.text());
}

export async function deleteTimetableEntry(id: number): Promise<void> {
  const r = await fetch(`${prefix}/timetable/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error(await r.text());
}

export async function openAppOnDesktop(app: string): Promise<void> {
  const r = await fetch(`${prefix}/system/open-app`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || r.statusText);
  }
}
