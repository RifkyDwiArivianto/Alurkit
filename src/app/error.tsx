"use client";

import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid h-dvh place-items-center bg-ink-950 p-6 text-center">
      <div className="max-w-sm space-y-4">
        <h1 className="text-lg font-semibold">Terjadi kesalahan tak terduga</h1>
        <p className="text-sm text-ink-400">{error.message || "Aplikasi gagal ditampilkan."}</p>
        <p className="text-xs text-ink-500">Workflow Anda tersimpan otomatis di browser dan tidak hilang.</p>
        <Button variant="primary" onClick={reset}>Coba lagi</Button>
      </div>
    </div>
  );
}
