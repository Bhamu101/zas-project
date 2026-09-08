import { useState, useRef, useEffect } from "react";
import { Bot, Send, User, AlertTriangle } from "lucide-react";

import { apiFetch } from "../lib/apiClient";

const GREETING = {
  role: "assistant",
  content: "Hi, I'm your farm assistant. Ask me about your beds, irrigation, energy, or anything else about the system.",
};

export default function AIAssistant() {
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const data = await apiFetch("/api/assistant/chat", {
        method: "POST",
        body: JSON.stringify({
          // The backend caps history at 40 messages, so send the most recent
          // ones rather than letting a long session start failing validation.
          messages: nextMessages
            .slice(-40)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full">
      <div className="flex items-center gap-2 p-4 border-b border-gray-100 shrink-0">
        <Bot size={18} className="text-brand" />
        <div>
          <h2 className="text-sm font-bold text-ink">Goho AI</h2>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex items-start gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <Bot size={22} className="text-brand shrink-0 mt-1" />
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user" ? "bg-brand text-white rounded-tr-sm" : "bg-card text-ink rounded-tl-sm"
              }`}
            >
              {m.content}
            </div>
            {m.role === "user" && (
              <User size={22} className="text-muted shrink-0 mt-1" />
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-2 justify-start">
            <Bot size={22} className="text-brand shrink-0 mt-1" />
            <div className="bg-card text-muted rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm">Thinking&hellip;</div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-600 rounded-xl px-3 py-2.5" style={{ backgroundColor: "#ef44441a" }}>
            <AlertTriangle size={14} className="shrink-0" />
            {error}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-100 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your farm..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className={`w-12 h-12 shrink-0 flex items-center justify-center rounded-xl transition-colors ${
              loading || !input.trim() ? "bg-card text-muted cursor-not-allowed" : "bg-brand text-white hover:bg-brand-dark"
            }`}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
