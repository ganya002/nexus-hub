"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useParams } from "next/navigation";
import { createEvent, getEvents, deleteEvent, setRsvp } from "@/lib/events";
import { notifyGroup } from "@/lib/notifications";

export default function EventsPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getEvents(id).then(setEvents);
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !date) return;
    setSubmitting(true);
    await createEvent(id, user.uid, title.trim(), desc.trim(), new Date(date).toISOString(), location.trim());
    notifyGroup(id, user.uid, {
      type: "new_event",
      title: `new event: ${title.trim()}`,
      body: `${user.displayName || "someone"} added an event`,
      link: `/groups/${id}/events`,
    });
    setTitle(""); setDesc(""); setDate(""); setLocation("");
    setShowForm(false);
    setSubmitting(false);
    setEvents(await getEvents(id));
  }

  async function handleRsvp(eventId, status) {
    await setRsvp(id, eventId, user.uid, status);
    setEvents(prev => prev.map(e => {
      if (e.id !== eventId) return e;
      const rsvps = { ...e.rsvps, [user.uid]: status };
      return { ...e, rsvps };
    }));
  }

  async function handleDelete(eventId) {
    await deleteEvent(id, eventId);
    setEvents(prev => prev.filter(e => e.id !== eventId));
  }

  const rsvpOrder = { going: 0, maybe: 1, no: 2 };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <p style={{ fontSize: 11, color: "var(--muted2)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {'// events'}
        </p>
        <button onClick={() => setShowForm(!showForm)} style={{
          fontSize: 11, color: "var(--muted)", cursor: "pointer",
          background: "none", border: "none", fontFamily: "var(--mono)",
        }}>
          {showForm ? "cancel" : "+ new event"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20, padding: 16, border: "1px solid var(--border)", background: "var(--bg2)" }}>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="event title" autoFocus
            style={{ background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", padding: "8px 10px", fontFamily: "var(--mono)", fontSize: 12, outline: "none" }}
          />
          <input type="text" value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="description"
            style={{ background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", padding: "8px 10px", fontFamily: "var(--mono)", fontSize: 12, outline: "none" }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)}
              style={{ flex: 1, background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", padding: "8px 10px", fontFamily: "var(--mono)", fontSize: 12, outline: "none", colorScheme: "dark" }}
            />
            <input type="text" value={location} onChange={e => setLocation(e.target.value)}
              placeholder="location (optional)" style={{ flex: 1, background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", padding: "8px 10px", fontFamily: "var(--mono)", fontSize: 12, outline: "none" }}
            />
          </div>
          <button type="submit" disabled={submitting} style={{
            background: "var(--accent)", color: "#0f0f0c", border: "none",
            padding: "8px", fontFamily: "var(--mono)", fontSize: 12, fontWeight: 500,
            cursor: "pointer", opacity: submitting ? 0.5 : 1,
          }}>
            {submitting ? "..." : "create event"}
          </button>
        </form>
      )}

      {events.length === 0 && (
        <p style={{ fontSize: 12, color: "var(--muted2)", textAlign: "center", padding: 40 }}>
          no events yet
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "var(--border)", border: "1px solid var(--border)" }}>
        {events.map(ev => {
          const myRsvp = ev.rsvps?.[user?.uid];
          const going = Object.entries(ev.rsvps || {}).filter(([, v]) => v === "going").length;
          const maybe = Object.entries(ev.rsvps || {}).filter(([, v]) => v === "maybe").length;
          const isPast = new Date(ev.date) < new Date();
          const isCreator = ev.uid === user?.uid;

          return (
            <div key={ev.id} style={{
              padding: 16, background: isPast ? "var(--bg)" : "var(--bg2)",
              opacity: isPast ? 0.5 : 1,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 14, color: "var(--text)", fontWeight: 500 }}>{ev.title}</span>
                  {isPast && <span style={{ fontSize: 9, color: "var(--muted2)", marginLeft: 6 }}>past</span>}
                </div>
                {isCreator && (
                  <button onClick={() => handleDelete(ev.id)} style={{
                    fontSize: 9, color: "var(--danger)", background: "none",
                    border: "1px solid var(--danger)", cursor: "pointer",
                    padding: "2px 6px", fontFamily: "var(--mono)",
                  }}>
                    delete
                  </button>
                )}
              </div>
              {ev.description && (
                <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>{ev.description}</p>
              )}
              <div style={{ display: "flex", gap: 12, fontSize: 10, color: "var(--muted2)", marginBottom: 10 }}>
                <span>{new Date(ev.date).toLocaleString()}</span>
                {ev.location && <span>📍 {ev.location}</span>}
              </div>
              <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 10 }}>
                {going > 0 && <span style={{ marginRight: 12 }}>{going} going</span>}
                {maybe > 0 && <span>{maybe} maybe</span>}
              </div>
              {!isPast && (
                <div style={{ display: "flex", gap: 6 }}>
                  {["going", "maybe", "no"].map(status => (
                    <button key={status} onClick={() => handleRsvp(ev.id, status)} style={{
                      fontSize: 10, padding: "4px 10px", border: "1px solid var(--border)",
                      background: myRsvp === status ? "var(--accent)" : "none",
                      color: myRsvp === status ? "#0f0f0c" : "var(--muted)",
                      cursor: "pointer", fontFamily: "var(--mono)", textTransform: "capitalize",
                    }}>
                      {status}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
