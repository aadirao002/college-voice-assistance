import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import {
  assistantChat,
  createNote,
  createReminder,
  createTimetableEntry,
  deleteNote,
  deleteTimetableEntry,
  fetchNotes,
  fetchReminders,
  fetchTimetable,
  markReminderDone,
  openAppOnDesktop,
  quickNote,
  type ClientAction,
  type Note,
  type Reminder,
  type TimetableEntry,
} from "./api";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getSpeechRecognition(): SpeechRecognition | null {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) return null;
  return new Ctor();
}

function speak(text: string, enabled: boolean) {
  if (!enabled || !text.trim()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1;
  u.pitch = 1;
  window.speechSynthesis.speak(u);
}

async function runActions(actions: ClientAction[]) {
  for (const a of actions) {
    if (a.type === "open_url" && a.target) {
      window.open(a.target, "_blank", "noopener,noreferrer");
    }
    if (a.type === "open_app" && a.target) {
      try {
        await openAppOnDesktop(a.target);
      } catch {
        /* ignore */
      }
    }
  }
}

export default function App() {
  const [tab, setTab] = useState<"notes" | "reminders" | "timetable">("notes");
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [manualText, setManualText] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tts, setTts] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [dueAlert, setDueAlert] = useState<string | null>(null);

  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [remText, setRemText] = useState("");
  const [remDue, setRemDue] = useState("");
  const [ttDay, setTtDay] = useState(0);
  const [ttStart, setTtStart] = useState("09:00");
  const [ttEnd, setTtEnd] = useState("10:00");
  const [ttTitle, setTtTitle] = useState("");
  const [ttLoc, setTtLoc] = useState("");

  const recRef = useRef<SpeechRecognition | null>(null);

  const refreshAll = useCallback(async () => {
    try {
      const [n, r, t] = await Promise.all([fetchNotes(), fetchReminders(), fetchTimetable()]);
      setNotes(n);
      setReminders(r);
      setTimetable(t);
    } catch {
      /* offline */
    }
  }, []);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const announcedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      for (const x of reminders) {
        if (x.done) continue;
        const t = new Date(x.due_at).getTime();
        if (t <= now && t >= now - 120_000 && !announcedRef.current.has(x.id)) {
          announcedRef.current.add(x.id);
          setDueAlert(`Due: ${x.text}`);
          speak(`Reminder: ${x.text}`, tts);
          break;
        }
      }
    }, 12_000);
    return () => window.clearInterval(id);
  }, [reminders, tts]);

  const sendToAssistant = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t) return;
      setLoading(true);
      setError(null);
      setReply("");
      try {
        const low = t.toLowerCase();
        if (low.startsWith("note ") || low.startsWith("save note")) {
          const body = t.replace(/^(note|save note)\s*:?\s*/i, "");
          await quickNote(body || t);
          await refreshAll();
          setReply("Saved to your notes.");
          speak("Saved to your notes.", tts);
          setLoading(false);
          return;
        }
        const out = await assistantChat(t);
        setReply(out.reply);
        speak(out.reply, tts);
        await runActions(out.actions);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Request failed");
      } finally {
        setLoading(false);
      }
    },
    [tts, refreshAll],
  );

  const startListen = () => {
    const rec = getSpeechRecognition();
    if (!rec) {
      setError("Speech recognition is not supported in this browser. Try Chrome or Edge, or type your command.");
      return;
    }
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    const finalBuf = { current: "" };
    rec.onresult = (ev) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const piece = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) {
          finalBuf.current += piece;
        } else {
          interim += piece;
        }
      }
      setTranscript(`${finalBuf.current}${interim}`.trim());
    };
    rec.onerror = (ev) => {
      setError(ev.error === "not-allowed" ? "Microphone permission denied." : `Voice error: ${ev.error}`);
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      const t = finalBuf.current.trim();
      if (t) void sendToAssistant(t);
    };
    recRef.current = rec;
    setTranscript("");
    setListening(true);
    setError(null);
    try {
      rec.start();
    } catch {
      setListening(false);
      setError("Could not start microphone.");
    }
  };

  const stopListen = () => {
    recRef.current?.stop();
  };

  const todaySlots = useMemo(() => {
    const wd = new Date().getDay();
    const mon0 = (wd + 6) % 7;
    return timetable.filter((x) => x.day_of_week === mon0).sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [timetable]);

  return (
    <>
      <h1>College Voice Assistant</h1>
      <p className="sub">Voice or text: notes, reminders, timetable, quick links, and AI answers. Backend uses OpenAI or Gemini (see <code className="pill">backend/.env</code>).</p>

      {dueAlert && (
        <div className="card" style={{ marginBottom: "1rem", borderColor: "#fb718566" }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <strong>{dueAlert}</strong>
            <button type="button" className="btn" onClick={() => setDueAlert(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-main">
        <div className="card">
          <h2>Voice &amp; AI</h2>
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={listening ? stopListen : startListen} disabled={loading}>
              {listening ? "Stop" : "Hold to speak"}
            </button>
            <span className={`pill${listening ? " live" : ""}`}>{listening ? "Listening…" : "Mic idle"}</span>
            <label className="row" style={{ marginLeft: "auto", gap: "0.35rem" }}>
              <input type="checkbox" checked={tts} onChange={(e) => setTts(e.target.checked)} />
              <span className="muted">Read replies aloud</span>
            </label>
          </div>
          <div className="transcript">{transcript || <span className="muted">Transcript appears here…</span>}</div>

          <label>Or type a command / question</label>
          <textarea value={manualText} onChange={(e) => setManualText(e.target.value)} placeholder='e.g. "What is gradient descent in one paragraph?" or "Open Khan Academy" or "Note: calculus cheat sheet — derivatives of ln"' />
          <div className="row" style={{ marginTop: "0.5rem" }}>
            <button type="button" className="btn btn-primary" disabled={loading || !manualText.trim()} onClick={() => void sendToAssistant(manualText)}>
              {loading ? "Thinking…" : "Send to AI"}
            </button>
            <button type="button" className="btn" disabled={loading} onClick={() => void sendToAssistant("What is on my timetable today?")}>
              Today&apos;s classes
            </button>
          </div>
          {error && <p className="err">{error}</p>}
          {reply && <p className="reply">{reply}</p>}
          <p className="muted" style={{ marginTop: "0.75rem" }}>
            Tip: say <strong>note</strong> before a sentence to save it without calling the LLM. Opening desktop apps uses the FastAPI allowlist (Windows).
          </p>
        </div>

        <div className="card">
          <h2>Today</h2>
          {todaySlots.length === 0 ? (
            <p className="muted">No classes today in your timetable.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
              {todaySlots.map((s) => (
                <li key={s.id} style={{ marginBottom: "0.35rem" }}>
                  <strong>
                    {s.start_time}–{s.end_time}
                  </strong>
                  : {s.title}
                  {s.location ? ` (${s.location})` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <div className="tabs">
          <button type="button" className={`tab${tab === "notes" ? " active" : ""}`} onClick={() => setTab("notes")}>
            Notes
          </button>
          <button type="button" className={`tab${tab === "reminders" ? " active" : ""}`} onClick={() => setTab("reminders")}>
            Reminders
          </button>
          <button type="button" className={`tab${tab === "timetable" ? " active" : ""}`} onClick={() => setTab("timetable")}>
            Timetable
          </button>
        </div>

        {tab === "notes" && (
          <>
            <div className="field">
              <label>Title</label>
              <input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Lecture ideas" />
            </div>
            <div className="field">
              <label>Body</label>
              <textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Key points…" />
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={async () => {
                await createNote(noteTitle, noteBody);
                setNoteTitle("");
                setNoteBody("");
                await refreshAll();
              }}
            >
              Save note
            </button>
            <h2 style={{ marginTop: "1rem" }}>Recent</h2>
            <div className="list">
              {notes.map((n) => (
                <div key={n.id} className="item">
                  <strong>{n.title || "Untitled"}</strong>
                  <small>{new Date(n.created_at).toLocaleString()}</small>
                  <div className="muted" style={{ marginTop: "0.25rem", fontSize: "0.85rem" }}>
                    {n.body.slice(0, 200)}
                    {n.body.length > 200 ? "…" : ""}
                  </div>
                  <button type="button" className="btn btn-danger" style={{ marginTop: "0.35rem" }} onClick={() => void deleteNote(n.id).then(refreshAll)}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "reminders" && (
          <>
            <div className="field">
              <label>Reminder text</label>
              <input value={remText} onChange={(e) => setRemText(e.target.value)} placeholder="Submit assignment 3" />
            </div>
            <div className="field">
              <label>Due (local time)</label>
              <input type="datetime-local" value={remDue} onChange={(e) => setRemDue(e.target.value)} />
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={async () => {
                if (!remText.trim() || !remDue) return;
                const iso = new Date(remDue).toISOString();
                await createReminder(remText.trim(), iso);
                setRemText("");
                setRemDue("");
                await refreshAll();
              }}
            >
              Add reminder
            </button>
            <h2 style={{ marginTop: "1rem" }}>Upcoming</h2>
            <div className="list">
              {reminders.map((r) => (
                <div key={r.id} className="item">
                  <strong>{r.text}</strong>
                  <small>{new Date(r.due_at).toLocaleString()}</small>
                  {!r.done && (
                    <button type="button" className="btn" style={{ marginTop: "0.35rem" }} onClick={() => void markReminderDone(r.id).then(refreshAll)}>
                      Mark done
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "timetable" && (
          <>
            <div className="row">
              <div className="field" style={{ flex: "0 0 120px" }}>
                <label>Day</label>
                <select value={ttDay} onChange={(e) => setTtDay(Number(e.target.value))}>
                  {DAYS.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ flex: "1" }}>
                <label>Start</label>
                <input type="time" value={ttStart} onChange={(e) => setTtStart(e.target.value)} />
              </div>
              <div className="field" style={{ flex: "1" }}>
                <label>End</label>
                <input type="time" value={ttEnd} onChange={(e) => setTtEnd(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label>Class</label>
              <input value={ttTitle} onChange={(e) => setTtTitle(e.target.value)} placeholder="Linear Algebra" />
            </div>
            <div className="field">
              <label>Room (optional)</label>
              <input value={ttLoc} onChange={(e) => setTtLoc(e.target.value)} placeholder="Hall B" />
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={async () => {
                if (!ttTitle.trim()) return;
                await createTimetableEntry({
                  day_of_week: ttDay,
                  start_time: ttStart,
                  end_time: ttEnd,
                  title: ttTitle.trim(),
                  location: ttLoc.trim(),
                });
                setTtTitle("");
                setTtLoc("");
                await refreshAll();
              }}
            >
              Add class
            </button>
            <h2 style={{ marginTop: "1rem" }}>Weekly</h2>
            <div className="list">
              {timetable.map((s) => (
                <div key={s.id} className="item">
                  <strong>
                    {DAYS[s.day_of_week]} {s.start_time}–{s.end_time}: {s.title}
                  </strong>
                  {s.location && <small>{s.location}</small>}
                  <button type="button" className="btn btn-danger" style={{ marginTop: "0.35rem" }} onClick={() => void deleteTimetableEntry(s.id).then(refreshAll)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
