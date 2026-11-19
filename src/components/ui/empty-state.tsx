import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
      <span className="grid size-11 place-items-center rounded-xl border border-ink-600 bg-ink-850 text-ink-300">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-ink-100">{title}</p>
        <p className="max-w-64 text-xs leading-relaxed text-ink-400">{description}</p>
      </div>
      {children}
    </div>
  );
}
