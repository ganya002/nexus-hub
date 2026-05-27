"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useParams } from "next/navigation";
import { createPoll, getPolls, votePoll, deletePoll } from "@/lib/polls";
import { notifyGroup } from "@/lib/notifications";

export default function PollsPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const [polls, setPolls] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getPolls(id).then(setPolls);
  }, [id]);

  function addOption() { setOptions([...options, ""]); }

  function updateOption(i, v) {
    const next = [...options];
    next[i] = v;
    setOptions(next);
  }

  function removeOption(i) {
    if (options.length <= 2) return;
    setOptions(options.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!question.trim() || options.some(o => !o.trim())) return;
    setSubmitting(true);
    await createPoll(id, user.uid, question.trim(), options.map(o => o.trim()));
    notifyGroup(id, user.uid, {
      type: "new_poll",
      title: `new poll: ${question.trim()}`,
      body: `${user.displayName || "someone"} created a poll`,
      link: `/groups/${id}/polls`,
    });
    setQuestion("");
    setOptions(["", ""]);
    setShowForm(false);
    setSubmitting(false);
    setPolls(await getPolls(id));
  }

  async function handleVote(pollId, optionIndex) {
    await votePoll(id, pollId, user.uid, optionIndex);
    setPolls(prev => prev.map(p => {
      if (p.id !== pollId) return p;
      return { ...p, votes: { ...p.votes, [user.uid]: optionIndex } };
    }));
  }

  async function handleDelete(pollId) {
    await deletePoll(id, pollId);
    setPolls(prev => prev.filter(p => p.id !== pollId));
  }

  function tally(options, votes) {
    return options.map((opt, i) => ({
      option: opt,
      count: Object.values(votes || {}).filter(v => v === i).length,
    }));
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <p style={{ fontSize: 11, color: "var(--muted2)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {'// polls'}
        </p>
        <button onClick={() => setShowForm(!showForm)} style={{
          fontSize: 11, color: "var(--muted)", cursor: "pointer",
          background: "none", border: "none", fontFamily: "var(--mono)",
        }}>
          {showForm ? "cancel" : "+ new poll"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20, padding: 16, border: "1px solid var(--border)", background: "var(--bg2)" }}>
          <input type="text" value={question} onChange={e => setQuestion(e.target.value)}
            placeholder="ask a question..." autoFocus
            style={{ background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", padding: "8px 10px", fontFamily: "var(--mono)", fontSize: 12, outline: "none" }}
          />
          {options.map((opt, i) => (
            <div key={i} style={{ display: "flex", gap: 4 }}>
              <input type="text" value={opt} onChange={e => updateOption(i, e.target.value)}
                placeholder={`option ${i + 1}`}
                style={{ flex: 1, background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", padding: "6px 10px", fontFamily: "var(--mono)", fontSize: 12, outline: "none" }}
              />
              {options.length > 2 && (
                <button type="button" onClick={() => removeOption(i)} style={{
                  fontSize: 9, color: "var(--danger)", background: "none",
                  border: "1px solid var(--danger)", cursor: "pointer",
                  padding: "2px 6px", fontFamily: "var(--mono)",
                }}>
                  ✕
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addOption} style={{
            fontSize: 10, color: "var(--muted)", background: "none",
            border: "1px dashed var(--border)", cursor: "pointer",
            padding: "4px", fontFamily: "var(--mono)", textAlign: "center",
          }}>
            + add option
          </button>
          <button type="submit" disabled={submitting} style={{
            background: "var(--accent)", color: "#0f0f0c", border: "none",
            padding: "8px", fontFamily: "var(--mono)", fontSize: 12, fontWeight: 500,
            cursor: "pointer", opacity: submitting ? 0.5 : 1, marginTop: 4,
          }}>
            {submitting ? "..." : "create poll"}
          </button>
        </form>
      )}

      {polls.length === 0 && (
        <p style={{ fontSize: 12, color: "var(--muted2)", textAlign: "center", padding: 40 }}>
          no polls yet
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "var(--border)", border: "1px solid var(--border)" }}>
        {polls.map(poll => {
          const myVote = poll.votes?.[user?.uid];
          const results = tally(poll.options, poll.votes);
          const total = results.reduce((s, r) => s + r.count, 0);
          const isCreator = poll.uid === user?.uid;

          return (
            <div key={poll.id} style={{ padding: 16, background: "var(--bg2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <span style={{ fontSize: 14, color: "var(--text)", fontWeight: 500 }}>{poll.question}</span>
                {isCreator && (
                  <button onClick={() => handleDelete(poll.id)} style={{
                    fontSize: 9, color: "var(--danger)", background: "none",
                    border: "1px solid var(--danger)", cursor: "pointer",
                    padding: "2px 6px", fontFamily: "var(--mono)",
                  }}>
                    delete
                  </button>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {results.map((r, i) => {
                  const pct = total === 0 ? 0 : Math.round((r.count / total) * 100);
                  const isSelected = myVote === i;
                  return (
                    <button key={i} onClick={() => handleVote(poll.id, i)} style={{
                      display: "block", width: "100%", textAlign: "left", padding: 0,
                      border: "none", background: "none", cursor: "pointer",
                    }}>
                      <div style={{
                        position: "relative", padding: "8px 10px",
                        border: isSelected ? "1px solid var(--accent)" : "1px solid var(--border)",
                        background: "var(--bg)", overflow: "hidden",
                      }}>
                        <div style={{
                          position: "absolute", inset: 0, width: `${pct}%`,
                          background: isSelected ? "var(--accent)" : "var(--bg3)",
                          opacity: isSelected ? 0.15 : 0.5,
                          transition: "width 0.3s",
                        }} />
                        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 12, color: "var(--text)" }}>{r.option}</span>
                          <span style={{ fontSize: 10, color: "var(--muted2)" }}>{pct}% ({r.count})</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p style={{ fontSize: 10, color: "var(--muted2)", marginTop: 8 }}>
                {total} {total === 1 ? "vote" : "votes"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
