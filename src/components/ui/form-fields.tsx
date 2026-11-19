"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-lg border bg-ink-850 px-3 text-sm text-ink-100 placeholder:text-ink-500 focus:border-ember-400 focus:outline-none";

interface ShellProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

function Shell({ id, label, error, hint, children }: ShellProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-ink-300">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} role="alert" className="text-xs text-rose-300">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-msg`} className="text-xs leading-relaxed text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface TextFieldProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  mono?: boolean;
  type?: "text" | "number";
  maxLength?: number;
}

export function TextField({ label, value, onChange, error, hint, placeholder, mono, type = "text", maxLength }: TextFieldProps) {
  const id = useId();
  return (
    <Shell id={id} label={label} error={error} hint={hint}>
      <input
        id={id}
        type={type}
        inputMode={type === "number" ? "numeric" : undefined}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? `${id}-msg` : undefined}
        className={cn(control, "h-9", mono && "font-mono", error ? "border-rose-400/60" : "border-ink-600")}
      />
    </Shell>
  );
}

interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  rows?: number;
  mono?: boolean;
}

export function TextAreaField({ label, value, onChange, error, hint, rows = 4, mono }: TextAreaFieldProps) {
  const id = useId();
  return (
    <Shell id={id} label={label} error={error} hint={hint}>
      <textarea
        id={id}
        rows={rows}
        value={value}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? `${id}-msg` : undefined}
        className={cn(control, "resize-y py-2", mono && "font-mono text-xs", error ? "border-rose-400/60" : "border-ink-600")}
      />
    </Shell>
  );
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  error?: string;
  hint?: string;
}

export function SelectField<T extends string>({ label, value, options, onChange, error, hint }: SelectFieldProps<T>) {
  const id = useId();
  return (
    <Shell id={id} label={label} error={error} hint={hint}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? `${id}-msg` : undefined}
        className={cn(control, "h-9", error ? "border-rose-400/60" : "border-ink-600")}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Shell>
  );
}
