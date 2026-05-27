"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useParams } from "next/navigation";
import { addTodo, getTodos, toggleTodo, deleteTodo } from "@/lib/todos";
import { getUserProfile } from "@/lib/firebase";

export default function TodosPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const [todos, setTodos] = useState([]);
  const [text, setText] = useState("");
  const [profiles, setProfiles] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getTodos(id).then(setTodos);
  }, [id]);

  useEffect(() => {
    const uids = [...new Set(todos.map(t => t.uid))];
    if (uids.length === 0) return;
    Promise.all(uids.map(uid => getUserProfile(uid).then(p => ({ uid, ...p }))))
      .then(list => setProfiles(Object.fromEntries(list.map(p => [p.uid, p]))));
  }, [todos]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    await addTodo(id, user.uid, text.trim());
    setText("");
    setSubmitting(false);
    setTodos(await getTodos(id));
  }

  async function handleToggle(todoId, done) {
    await toggleTodo(id, todoId, done);
    setTodos(prev => prev.map(t => t.id === todoId ? { ...t, done } : t));
  }

  async function handleDelete(todoId) {
    await deleteTodo(id, todoId);
    setTodos(prev => prev.filter(t => t.id !== todoId));
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <p style={{ fontSize: 11, color: "var(--muted2)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {'// todos'}
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <input
          type="text" value={text} onChange={e => setText(e.target.value)}
          placeholder="add a todo..."
          style={{
            flex: 1, background: "var(--bg3)", border: "1px solid var(--border)",
            color: "var(--text)", padding: "8px 10px", fontFamily: "var(--mono)", fontSize: 12, outline: "none",
          }}
        />
        <button type="submit" disabled={submitting || !text.trim()} style={{
          background: "var(--accent)", color: "#0f0f0c", border: "none",
          padding: "8px 14px", fontFamily: "var(--mono)", fontSize: 12, fontWeight: 500,
          cursor: "pointer", opacity: submitting || !text.trim() ? 0.5 : 1,
        }}>
          add
        </button>
      </form>

      {todos.length === 0 && (
        <p style={{ fontSize: 12, color: "var(--muted2)", textAlign: "center", padding: 40 }}>
          no todos yet
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {todos.map(t => {
          const author = profiles[t.uid];
          return (
            <div key={t.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", background: t.done ? "var(--bg2)" : "var(--bg)",
              border: "1px solid var(--border)", opacity: t.done ? 0.6 : 1,
            }}>
              <button onClick={() => handleToggle(t.id, !t.done)} style={{
                width: 16, height: 16, minWidth: 16,
                border: "1px solid var(--border)", cursor: "pointer",
                background: t.done ? "var(--accent)" : "var(--bg3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, color: t.done ? "#0f0f0c" : "transparent",
                padding: 0,
              }}>
                {t.done ? "✓" : ""}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: 13, color: t.done ? "var(--muted)" : "var(--text)",
                  textDecoration: t.done ? "line-through" : "none",
                  lineHeight: 1.5,
                }}>
                  {t.text}
                </p>
                <span style={{ fontSize: 9, color: "var(--muted2)" }}>
                  {author?.displayName || "unknown"}
                </span>
              </div>
              <button onClick={() => handleDelete(t.id)} style={{
                fontSize: 10, color: "var(--muted2)", cursor: "pointer",
                background: "none", border: "none", fontFamily: "var(--mono)", padding: 0,
              }}>
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
