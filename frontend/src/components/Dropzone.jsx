import { useRef, useState } from "react";

export default function Dropzone({ onFile, disabled }) {
    const [over, setOver] = useState(false);
    const input = useRef(null);

    function handleDrop(e) {
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
    }

    return (
        <div
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={handleDrop}
            onClick={() => !disabled && input.current?.click()}
            className={`cursor-pointer rounded-lg border border-dashed px-6 py-12 text-center transition-colors duration-150 ${over ? "border-ink bg-ink/[0.03]" : "border-rule"
                } ${disabled ? "pointer-events-none opacity-50" : ""}`}
        >
            <input
                ref={input}
                type="file"
                accept="application/pdf"
                capture="environment"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0])}
            />
            <p className="text-[16px]">
                {over ? "Drop it here" : "Drop a PDF here, or tap to choose one"}
            </p>
            <p className="mt-2 text-[14px] text-muted">
                Up to 60 pages. Read once, never stored.
            </p>
        </div>
    );
}