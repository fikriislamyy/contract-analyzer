import { useRef, useState } from "react";
import { streamChat } from "../api";

const STARTERS = [
    "How do I get out of this?",
    "What am I giving up?",
    "Are the payment terms normal?",
];

export default function Chat({ document }) {
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState("");
    const [streaming, setStreaming] = useState(false);
    const [error, setError] = useState("");
    const endRef = useRef(null);

    async function send(text) {
        const question = text.trim();
        if (!question || streaming) return;

        setDraft("");
        setError("");
        const history = [...messages, { role: "user", text: question }];
        setMessages([...history, { role: "model", text: "" }]);
        setStreaming(true);

        try {
            await streamChat(document, history, (chunk) => {
                setMessages((prev) => {
                    const next = [...prev];
                    next[next.length - 1] = {
                        role: "model",
                        text: next[next.length - 1].text + chunk,
                    };
                    return next;
                });
                endRef.current?.scrollIntoView({ block: "end" });
            });
        } catch (err) {
            setError(err.message);
            setMessages((prev) => prev.slice(0, -1));
        } finally {
            setStreaming(false);
        }
    }

    return (
        <section className="mt-12 border-t border-rule pt-8">
            <h2 className="text-[15px] font-medium text-muted">Ask about this document</h2>

            {messages.length === 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                    {STARTERS.map((s) => (
                        <button
                            key={s}
                            onClick={() => send(s)}
                            className="rounded-full border border-rule px-3.5 py-1.5 text-[14px] text-ink/80"
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}

            <div className="mt-6 space-y-6">
                {messages.map((m, i) =>
                    m.role === "user" ? (
                        <p key={i} className="font-medium text-[16px]">{m.text}</p>
                    ) : (
                        <p key={i} className="whitespace-pre-wrap text-[16px] leading-relaxed text-ink/90">
                            {m.text}
                            {streaming && i === messages.length - 1 && (
                                <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] bg-ink/40" />
                            )}
                        </p>
                    )
                )}
                <div ref={endRef} />
            </div>

            {error && (
                <p className="mt-6 border-l-[3px] border-high pl-4 text-[15px]">{error}</p>
            )}

            <div className="mt-8 flex gap-2">
                <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send(draft)}
                    placeholder="Ask a question"
                    disabled={streaming}
                    className="min-w-0 flex-1 rounded-md border border-rule bg-white px-4 py-3 text-[16px] disabled:opacity-50"
                />
                <button
                    onClick={() => send(draft)}
                    disabled={streaming || !draft.trim()}
                    className="rounded-md bg-ink px-5 py-3 text-[15px] font-medium text-paper disabled:bg-rule disabled:text-muted"
                >
                    Ask
                </button>
            </div>
        </section>
    );
}