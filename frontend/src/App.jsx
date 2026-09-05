import { useEffect, useRef, useState } from "react";
import { wake, startAnalysis, getJob } from "./api";
import Finding from "./components/Finding";
import sample from "./sampleAnalysis.json";
import Dropzone from "./components/Dropzone";
import Progress from "./components/Progress";
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
          Know what you're agreeing to
        </h1>
        <p className="mt-4 max-w-[34rem] text-[16px] leading-relaxed text-muted">
          Upload a contract, invoice, or policy. Get a plain-language summary and
          the parts that deserve a second look.
        </p>
      </header>

      {status !== "done" && (
        <section>
          <Dropzone onFile={handleFile} disabled={status === "working"} />

          <button
            onClick={showSample}
            disabled={status === "working"}
            className="mt-4 text-[15px] underline underline-offset-4 decoration-rule hover:decoration-ink"
          >
            Or see a sample analysis first
          </button>

          {status === "working" && <Progress pages={meta?.pages} />}
          {status === "error" && (
            <p className="mt-8 border-l-[3px] border-high pl-4 text-[15px]">{note}</p>
          )}
        </section>
      )}

      {status === "done" && analysis && (
        <>
          <section className="border-t border-rule pt-8">
            <p className="text-[14px] text-muted">
              {meta?.name} · {analysis.doc_type_label || analysis.doc_type}
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
            <h2 className="text-[15px] font-medium text-muted">
              {analysis.findings.length === 0
                ? "Nothing stood out as unusual."
                : `${analysis.findings.length} thing${analysis.findings.length > 1 ? "s" : ""} worth a closer look`}
            </h2>

            {analysis.findings.length > 0 && (
              <div className="mt-4 mb-8 flex flex-wrap gap-x-5 gap-y-2 text-[14px]">
                {["high", "medium", "low"].map((sev) => {
                  const n = analysis.findings.filter((f) => f.severity === sev).length;
                  if (!n) return null;
                  const color = { high: "bg-high", medium: "bg-medium", low: "bg-low" }[sev];
                  const word = { high: "significant", medium: "worth reviewing", low: "minor" }[sev];
                  return (
                    <span key={sev} className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${color}`} />
                      {n} {word}
                    </span>
                  );
                })}
              </div>
            )}

            {analysis.findings.map((f, i) => (
              <Finding key={i} index={i} risk={f} />
            ))}
          </section>

          {docText && <Chat document={docText} />}

          <button
            onClick={() => {
              setStatus("idle");
              setAnalysis(null);
              setDocText("");
              setMeta(null);
            }}
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