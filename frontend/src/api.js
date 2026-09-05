const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function unwrapError(res) {
    const body = await res.json().catch(() => null);
    return new Error(body?.detail || `Request failed (${res.status})`);
}

export async function wake() {
    try {
        await fetch(`${API}/health`);
    } catch {
        // server asleep or offline; the upload will surface it
    }
}

export async function startAnalysis(file) {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API}/api/analyze`, { method: "POST", body: form });
    if (!res.ok) throw await unwrapError(res);
    return res.json(); // { job_id, pages, document }
}

export async function getJob(jobId) {
    const res = await fetch(`${API}/api/jobs/${jobId}`);
    if (!res.ok) throw await unwrapError(res);
    return res.json();
}

export async function streamChat(document, messages, onChunk, signal) {
    const res = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document, messages }),
        signal,
    });
    if (!res.ok) throw await unwrapError(res);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
            const line = event.trim();
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") return;

            const parsed = JSON.parse(payload);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.t) onChunk(parsed.t);
        }
    }
}