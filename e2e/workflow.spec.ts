import { expect, test, type Page } from "@playwright/test";

const node = (page: Page, kind: string) => page.locator(`.react-flow__node[data-id^="${kind}-"]`);

async function addFromPalette(page: Page, label: string) {
  await page.getByRole("button", { name: new RegExp(`^${label}`) }).click();
}

/** Membuka panel hanya jika belum terbuka (di layar kecil panel mulai tertutup). */
async function openPanel(page: Page, label: string) {
  const toggle = page.getByRole("button", { name: label });
  if ((await toggle.getAttribute("aria-pressed")) !== "true") await toggle.click();
}

async function connect(page: Page, fromKind: string, toKind: string, handle: "source" | "target" = "target") {
  const from = await node(page, fromKind).locator(".react-flow__handle.source").first().boundingBox();
  const to = await node(page, toKind).locator(`.react-flow__handle.${handle}`).first().boundingBox();
  if (!from || !to) throw new Error("Handle tidak ditemukan");
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  // Flowchart adalah mode bawaan; spesifikasi ini menguji mode Workflow.
  await page.getByRole("button", { name: "Workflow", exact: true }).click();
  await expect(page.getByText("Canvas masih kosong")).toBeVisible();
});

test("menampilkan empty state dan menambahkan node Start", async ({ page }) => {
  await expect(page.getByText("Canvas masih kosong")).toBeVisible();
  await page.getByRole("button", { name: /^Mulai dari awal/ }).click();
  await expect(node(page, "start")).toBeVisible();
  await expect(page.getByText("Canvas masih kosong")).toBeHidden();
  // Start hanya boleh satu
  await expect(page.getByRole("button", { name: /^Start/ })).toBeDisabled();
});

test("empty state: Muat contoh mengisi canvas, valid, dan bisa dijalankan", async ({ page }) => {
  await expect(page.getByRole("button", { name: /^Mulai dari awal/ })).toBeVisible();
  await page.getByRole("button", { name: /^Muat contoh/ }).last().click();
  await expect(page.getByText("Canvas masih kosong")).toBeHidden();
  await expect(page.locator(".react-flow__node")).toHaveCount(31);

  await page.getByRole("button", { name: "Run" }).click();
  await expect(page.getByRole("tabpanel")).toContainText("BUDI SANTOSO (MEMBER)", { timeout: 15_000 });
  await expect(page.getByRole("tabpanel")).toContainText("54000 rupiah");
  await expect(page.getByRole("tabpanel")).toContainText("Pesanan Jus Alpukat x3");

  // dapat dibatalkan dengan undo
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("Canvas masih kosong")).toBeVisible();
});

test("menyusun, menjalankan, dan melihat hasil workflow", async ({ page }) => {
  await addFromPalette(page, "Start");
  await addFromPalette(page, "Output");
  await connect(page, "start", "output");
  await expect(page.locator(".react-flow__edge")).toHaveCount(1);

  await page.getByRole("button", { name: "Run" }).click();
  await expect(page.getByRole("tabpanel")).toContainText("Dunia");
  await page.getByRole("tab", { name: "Log" }).click();
  await expect(page.getByRole("tabpanel")).toContainText("Selesai");
});

test("Run menolak workflow tidak valid dan menampilkan alasannya", async ({ page }) => {
  await addFromPalette(page, "Output");
  await page.getByRole("button", { name: "Run" }).click();
  await expect(page.getByRole("tabpanel")).toContainText("Validasi gagal");
});

test("undo dan redo", async ({ page }) => {
  await addFromPalette(page, "Start");
  await expect(node(page, "start")).toHaveCount(1);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(node(page, "start")).toHaveCount(0);
  await page.getByRole("button", { name: "Redo" }).click();
  await expect(node(page, "start")).toHaveCount(1);
});

test("workflow tersimpan otomatis dan dimuat ulang", async ({ page }) => {
  await addFromPalette(page, "Start");
  await expect(page.getByText(/Tersimpan/)).toBeVisible();
  await page.reload();
  await expect(node(page, "start")).toHaveCount(1);
});

test("export lalu import mengembalikan workflow", async ({ page }) => {
  await addFromPalette(page, "Start");
  await addFromPalette(page, "Output");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export" }).click(),
  ]);
  const path = await download.path();
  await page.getByRole("button", { name: "Workflow baru" }).click();
  await expect(page.locator(".react-flow__node")).toHaveCount(0);
  await page.getByLabel("Pilih file workflow JSON").setInputFiles(path);
  await expect(page.locator(".react-flow__node")).toHaveCount(2);
});

test("import file tidak valid menampilkan pesan error", async ({ page }) => {
  await page.getByLabel("Pilih file workflow JSON").setInputFiles({
    name: "rusak.json",
    mimeType: "application/json",
    buffer: Buffer.from("{bukan json"),
  });
  await expect(page.getByRole("alert")).toContainText("Import gagal");
});

test("mengedit konfigurasi node di inspector dan melihat validasinya @mobile", async ({ page }) => {
  await openPanel(page, "Tampilkan panel node");
  await addFromPalette(page, "Delay");
  await node(page, "delay").click();
  await openPanel(page, "Tampilkan inspector");
  const input = page.getByLabel("Durasi (ms)");
  await input.fill("99999");
  await expect(page.getByText(/Maksimum/).first()).toBeVisible();
});
