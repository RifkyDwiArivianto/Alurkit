# FlowForge

Visual workflow builder: Next.js (App Router) · TypeScript · Tailwind v4 · @xyflow/react · Zustand · Zod · Motion.

## Menjalankan
```bash
npm install
npm run dev          # http://localhost:3000
npm run typecheck && npm run lint && npm run test && npm run build
npx playwright install chromium && npm run e2e   # tes end-to-end (proyek desktop + mobile Pixel 7)
```

## Fitur
- Canvas: tambah (klik/seret), pindah, hubungkan, pilih, hapus node; zoom, pan, minimap.
- Node: Start, Set Value, Transform, Condition (cabang Ya/Tidak), Delay, Output — masing-masing punya konfigurasi dan validasi (Zod).
- Eksekusi: hanya operasi terdaftar (tanpa eval/Function); `{{kunci}}` hanya mencari nilai, bukan mengevaluasi ekspresi. Batas 500 langkah, Delay maks. 10 detik, bisa dihentikan.
- Validasi langsung: Start/Output wajib, siklus, konfigurasi tidak valid (error); node tak terjangkau, jalan buntu, cabang kosong (peringatan).
- Log, hasil, dan daftar masalah; status per node di canvas.
- Simpan otomatis ke localStorage, import/export JSON (versi 1, divalidasi), undo/redo (Ctrl+Z / Ctrl+Shift+Z).
- Pintasan: Ctrl+Enter jalankan, Esc tutup panel, menu, atau sheet (layar kecil).
- Canvas kosong menawarkan dua pilihan: **Mulai dari awal** atau **Muat contoh** (juga ada di sidebar). Contoh Workflow “Pemrosesan Pesanan” (31 node, 4 jalur paralel) memakai semua jenis node, ke-11 operasi Transform, ke-4 tipe Set Value, cabang Ya/Tidak (eq, gte, gt, contains), Delay, dan beberapa Output; bisa langsung dijalankan.

## Struktur
- `src/features/workflow/engine` — operasi, validasi, eksekusi (murni, tanpa React)
- `src/features/workflow` — tipe, skema Zod, store (riwayat undo/redo), serialisasi, persistensi
- `src/components` — layout, inspector, UI dasar
- `e2e` — tes Playwright; `mobile.spec.ts` (tag `@mobile`) hanya jalan di proyek mobile, sisanya di desktop

## Batasan yang diketahui
- Penyimpanan hanya di browser ini (localStorage); tidak ada backend/database.
- Tema gelap saja.
- Loop/siklus tidak didukung (ditolak oleh validasi).

## Mode Flowchart

Toggle **Workflow | Flowchart** di top bar. Flowchart adalah dokumen terpisah (disimpan di `flowforge:flowchart:v1`) untuk menggambar sistem berjalan atau usulan; tidak dieksekusi.

- Simbol standar: Mulai/Selesai, Proses, Keputusan, Input/Output, Dokumen, Basis data, Sub-proses, Konektor, Catatan. Teks, warna, dan ukuran bisa diubah; garis bisa diberi label, bentuk, dan putus-putus.
- Swimlane: jalur per peran/departemen. Tinggi lane dan urutannya bisa diubah, simbol di dalamnya ikut bergeser. Lane hanya bisa dihapus jika kosong.
- Ekspor: JSON (dapat diimpor kembali), PNG (latar putih, resolusi 2x), dan PDF lewat dialog cetak (pilih "Simpan sebagai PDF").
- Canvas kosong menawarkan **Mulai dari awal** atau **Muat contoh**. Contoh “Peminjaman Buku Perpustakaan” memakai 4 swimlane (tinggi berbeda), ke-9 jenis simbol, ke-6 warna, simbol berukuran khusus, label garis, ke-4 bentuk garis, garis putus-putus, dan konektor.

## Tampilan HP (di bawah breakpoint `lg`, 1024px)

Di bawah `lg` aplikasi memakai tata letak HP; tampilan desktop (≥1024px) tidak berubah. Pemilihannya lewat `useIsMobile()` (`src/lib/use-is-mobile.ts`, media query `(max-width: 1023px)`), jadi hanya satu versi yang dirender pada satu waktu.

- **Top bar dua baris** (`mobile-top-bar.tsx`): baris 1 berisi dropdown mode berlabel (`Flowchart ▾` / `Workflow ▾`), satu aksi utama (Flowchart: **Uji alur**; Workflow: **Run**, berubah jadi **Stop**), dan menu ⋯. Baris 2 berisi judul dengan ikon pensil (ketuk untuk mengganti nama) dan status simpan.
- **Menu ⋯**: Import JSON, Ekspor JSON/PNG/PDF (Flowchart), Muat contoh, Diagram baru / Workflow baru. Memakai fungsi yang sama dengan desktop (`load-sample.ts`, `new-workflow.ts`, `file-io.ts`), jadi aturannya sama: ekspor nonaktif bila kosong, import dan "baru" ditolak saat workflow berjalan.
- **Kontrol mengambang** (`mobile-canvas-controls.tsx`): zoom dan pil undo/redo di kiri bawah, FAB **+** di kanan bawah. Disembunyikan saat ada sheet atau panel bawah terbuka.
- **`BottomSheet`** (`components/ui/bottom-sheet.tsx`): handle bar yang bisa ditarik, animasi Motion (mengikuti `prefers-reduced-motion` lewat `MotionConfig`), `env(safe-area-inset-bottom)`, tinggi dalam `dvh`, Escape menutup. Tinggi sheet dilaporkan ke `ui-store.bottomInset`.
  - **Palet**: baris kartu yang bisa digeser, ditambah daftar swimlane dan tombol **Tambah lane** (Flowchart). Ketuk kartu menambah simbol di tengah canvas dan menutup sheet.
  - **Inspector**: muncul otomatis saat tepat satu simbol/node/garis dipilih (Workflow: node). Menutupnya juga membatalkan pilihan. `useRevealForSheet` menggeser viewport (`setViewport`, bukan transform CSS) bila simbol terpilih tertutup sheet.
- **Uji alur** (Flowchart): panel bawah inline dengan tinggi **S / M / L** (24% / 32% / 40% layar, default M).
- **Log** (Workflow): saat tertutup berupa satu baris "Log eksekusi · belum ada" setinggi 48px; ketuk atau tarik ke atas untuk membuka.
- `viewport-fit=cover` dan `interactive-widget=resizes-content` diatur di `app/layout.tsx` agar safe area dan keyboard layar ditangani.

Batasan di HP: baris judul setinggi 28px (di bawah target sentuh 44px) sesuai rancangan; sheet inspector terbuka begitu simbol dipilih, termasuk saat mulai menyeret simbol.
