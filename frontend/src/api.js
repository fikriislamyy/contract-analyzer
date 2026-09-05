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