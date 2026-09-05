import { useEffect, useState } from "react";
import { motion } from "motion/react";

const STAGES = [
    { at: 0, label: "Reading the document" },
    { at: 3, label: "Working through the clauses" },
    { at: 10, label: "Weighing what matters" },
];

export default function Progress({ pages }) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setElapsed((s) => s + 1), 1000);
        return () => clearInterval(id);
    }, []);

    const stage = [...STAGES].reverse().find((s) => elapsed >= s.at) ?? STAGES[0];
    const pct = Math.min(92, (elapsed / 22) * 100);

    return (
        <div className="mt-10">
            <div className="h-[2px] w-full overflow-hidden rounded-full bg-rule">
                <motion.div
                    className="h-full bg-ink"
                    animate={{ width: `${pct}%` }}
                    transition={{ ease: "linear", duration: 1 }}
                />
            </div>

            <div className="mt-4 flex items-baseline justify-between text-[15px]">
                <motion.span key={stage.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {stage.label}
                </motion.span>
                <span className="text-[13px] text-muted tabular-nums">
                    {pages ? `${pages} pages · ` : ""}{elapsed}s
                </span>
            </div>
        </div>
    );
}