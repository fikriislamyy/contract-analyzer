import { motion } from "motion/react";

const TONE = {
    high: { rule: "bg-high", label: "Significant risk" },
    medium: { rule: "bg-medium", label: "Worth reviewing" },
    low: { rule: "bg-low", label: "Minor" },
};

export default function Finding({ risk, index }) {
    const tone = TONE[risk.severity] ?? TONE.low;

    return (
        <motion.article
            className="flex gap-4 sm:gap-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 * index, duration: 0.35, ease: [0.2, 0, 0, 1] }}
        >
            <div className={`w-[3px] shrink-0 rounded-full ${tone.rule}`} aria-hidden />
            <div className="min-w-0 pb-8">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="font-medium text-[17px] leading-snug">{risk.title}</h3>
                    <span className="text-[13px] text-muted">{tone.label}</span>
                </div>

                <blockquote className="mt-3 border-l border-rule pl-4 font-doc text-[17px] italic leading-relaxed text-ink/80">
                    {risk.quote}
                </blockquote>

                <p className="mt-3 text-[15px] leading-relaxed text-ink/90">
                    {risk.explanation}
                </p>

                <p className="mt-2 text-[15px] leading-relaxed text-muted">
                    {risk.suggestion}
                </p>
            </div>
        </motion.article>
    );
}