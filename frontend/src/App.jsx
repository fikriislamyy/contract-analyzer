import { useEffect, useRef, useState } from "react";
import { wake, startAnalysis, getJob } from "./api";
import Finding from "./components/Finding";
import sample from "./sampleAnalysis.json";
import Chat from "./components/Chat";

export default function App() {
  const [status, setStatus] = useState("idle"); // idle | working | done | error
  const [note, setNote] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [meta, setMeta] = useState(null);
  const fileInput = useRef(null);
  const [docText, setDocText] = useState("");

  useEffect(() => { wake(); }, []);

  async function handleFile(file) {
    if (!file) return;
    setStatus("working");
    setNote("Reading the document");
    setAnalysis(null);

    try {
      const { job_id, pages, document } = await startAnalysis(file);
      setDocText(document);
      setMeta({ name: file.name, pages });
      setNote("Looking for risk");

      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const job = await getJob(job_id);
        if (job.status === "done") {
          setAnalysis(job.result);
          setStatus("done");
          return;
        }
        if (job.status === "error") throw new Error(job.error);
      }
      throw new Error("Analysis timed out. Try a shorter document.");
    } catch (err) {
      setNote(err.message);
      setStatus("error");
    }
  }

  function showSample() {
    setMeta({ name: "Sample mutual NDA", pages: 3 });
    setAnalysis(sample.result ?? sample);
    setStatus("done");
    setDocText(sample.document ?? "");
  }

  return (
    <div className="mx-auto max-w-[46rem] px-5 py-12 sm:py-20">
      <header className="mb-12">
        <h1 className="font-doc text-[2.4rem] leading-[1.1] sm:text-[3rem]">
          Read the contract you're about to sign
        </h1>
        <p className="mt-4 max-w-[34rem] text-[16px] leading-relaxed text-muted">
          Upload a PDF and get a plain-language summary, plus the clauses that
          deserve a second look before you agree to them.
        </p>
      </header>

      {status !== "done" && (
        <section>
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => fileInput.current?.click()}
              disabled={status === "working"}
              className="rounded-md bg-ink px-5 py-3 text-[15px] font-medium text-paper disabled:opacity-40"
            >
              Choose a PDF
            </button>
            <button
              onClick={showSample}
              disabled={status === "working"}
              className="rounded-md border border-rule px-5 py-3 text-[15px] disabled:opacity-40"
            >
              See a sample first
            </button>
          </div>

          <p className="mt-4 text-[14px] text-muted">
            Up to 60 pages. Your file is read once and never stored.
          </p>

          {status === "working" && (
            <p className="mt-8 text-[15px] text-muted">{note}…</p>
          )}
          {status === "error" && (
            <p className="mt-8 border-l-[3px] border-high pl-4 text-[15px]">{note}</p>
          )}
        </section>
      )}

      {status === "done" && analysis && (
        <>
          <section className="border-t border-rule pt-8">
            <p className="text-[14px] text-muted">
              {meta?.name} · {analysis.doc_type}
              {analysis.parties?.length ? ` · ${analysis.parties.join(" and ")}` : ""}
            </p>
            <p className="mt-4 text-[17px] leading-relaxed">{analysis.summary}</p>

            {analysis.key_terms?.length > 0 && (
              <ul className="mt-6 space-y-1.5">
                {analysis.key_terms.map((t, i) => (
                  <li key={i} className="text-[15px] text-ink/90">{t}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-12 border-t border-rule pt-8">
            <h2 className="mb-8 text-[15px] font-medium text-muted">
              {analysis.risks.length === 0
                ? "Nothing stood out as unusual."
                : `${analysis.risks.length} clause${analysis.risks.length > 1 ? "s" : ""} worth a closer look`}
            </h2>
            {analysis.risks.map((r, i) => <Finding key={i} risk={r} />)}
          </section>

          {docText && <Chat document={docText} />}

          <button
            onClick={() => { setStatus("idle"); setAnalysis(null); }}
            className="mt-4 text-[15px] underline underline-offset-4"
          >
            Analyze another document
          </button>
        </>
      )}

      <footer className="mt-20 border-t border-rule pt-6 text-[13px] leading-relaxed text-muted">
        This is an AI reading of your document, not legal advice. Have a lawyer
        review anything that matters.
      </footer>
    </div>
  );
}