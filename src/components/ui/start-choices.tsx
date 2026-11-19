import type { LucideIcon } from "lucide-react";

interface Choice {
  icon: LucideIcon;
  title: string;
  hint: string;
  onSelect: () => void;
}

interface StartChoicesProps {
  scratch: Choice;
  sample: Choice;
}

function ChoiceCard({ icon: Icon, title, hint, onSelect, primary }: Choice & { primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        "group flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-colors " +
        (primary
          ? "border-ember-500/60 bg-ember-500/10 hover:border-ember-400 hover:bg-ember-500/15"
          : "border-ink-600 bg-ink-850 hover:border-ink-500 hover:bg-ink-800")
      }
    >
      <span className={"flex items-center gap-2 text-sm font-semibold " + (primary ? "text-ember-400" : "text-ink-100")}>
        <Icon className="size-4" aria-hidden />
        {title}
      </span>
      <span className="text-xs leading-relaxed text-ink-400">{hint}</span>
    </button>
  );
}

/** Dua pilihan di canvas kosong: mulai dari awal, atau muat contoh lengkap. */
export function StartChoices({ scratch, sample }: StartChoicesProps) {
  return (
    <div className="grid w-full max-w-[32rem] gap-2 pt-1 sm:grid-cols-2">
      <ChoiceCard {...scratch} />
      <ChoiceCard {...sample} primary />
    </div>
  );
}
