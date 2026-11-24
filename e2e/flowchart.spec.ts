import { expect, test, type Page } from "@playwright/test";

const shapes = (page: Page) => page.locator(".react-flow__node-shape");

async function openFlowchart(page: Page) {
  await page.getByRole("button", { name: "Flowchart", exact: true }).click();
  await expect(page.getByLabel("Judul flowchart")).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("beralih ke mode Flowchart dan mengingat modenya setelah reload", async ({ page }) => {
  await openFlowchart(page);
  await expect(page.getByText("Flowchart masih kosong")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Judul flowchart")).toBeVisible();
  await page.getByRole("button", { name: "Workflow", exact: true }).click();
  await expect(page.getByLabel("Nama workflow")).toBeVisible();
});

test("empty state menawarkan dua pilihan: mulai dari awal atau muat contoh", async ({ page }) => {
  await openFlowchart(page);
  await expect(page.getByRole("button", { name: /^Mulai dari awal/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Muat contoh/ }).last()).toBeVisible();
  await page.getByRole("button", { name: /^Mulai dari awal/ }).click();
  await expect(shapes(page)).toHaveCount(1);
  await expect(page.getByText("Flowchart masih kosong")).toBeHidden();
});

test("memuat contoh berisi simbol dan swimlane", async ({ page }) => {
  await openFlowchart(page);
  await page.getByRole("button", { name: "Muat contoh" }).first().click();
  await expect(shapes(page)).toHaveCount(20);
  await expect(page.getByLabel("Nama lane 1")).toHaveValue("Anggota");
  await expect(page.getByLabel("Nama lane 4")).toHaveValue("Kepala Perpustakaan");
});

test("menambah simbol dan lane, lalu undo", async ({ page }) => {
  await openFlowchart(page);
  await page.getByRole("button", { name: /^Proses/ }).click();
  await expect(shapes(page)).toHaveCount(1);
  await page.getByRole("button", { name: "Lane", exact: true }).click();
  await expect(page.getByLabel("Nama lane 1")).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByLabel("Nama lane 1")).toHaveCount(0);
});

test("mengedit teks simbol lewat inspector", async ({ page }) => {
  await openFlowchart(page);
  await page.getByRole("button", { name: /^Proses/ }).click();
  await page.getByLabel("Teks").fill("Cek dokumen");
  await expect(shapes(page).first()).toContainText("Cek dokumen");
});

test("ekspor PNG, JSON, dan import kembali", async ({ page }) => {
  await openFlowchart(page);
  await page.getByRole("button", { name: "Muat contoh" }).first().click();

  const [png] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Ekspor PNG" }).click()]);
  expect(png.suggestedFilename()).toMatch(/\.png$/);

  const [json] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Ekspor JSON" }).click()]);
  const path = await json.path();

  await page.getByRole("button", { name: "Baru" }).click();
  await expect(shapes(page)).toHaveCount(0);
  await page.getByLabel("Pilih file flowchart JSON").setInputFiles(path);
  await expect(shapes(page)).toHaveCount(20);
});

test("import file Workflow di mode Flowchart ditolak dengan petunjuk", async ({ page }) => {
  await openFlowchart(page);
  await page.getByLabel("Pilih file flowchart JSON").setInputFiles({
    name: "workflow.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ app: "alurkit", version: 1 })),
  });
  await expect(page.getByRole("alert")).toContainText("mode Workflow");
});

test("PDF membuka dialog cetak tanpa error", async ({ page }) => {
  await openFlowchart(page);
  await page.getByRole("button", { name: "Muat contoh" }).first().click();
  await page.evaluate(() => {
    (window as unknown as { __printed?: number }).__printed = 0;
  });
  await page.getByRole("button", { name: "Ekspor PDF" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Simpan sebagai PDF" })).toBeVisible();
});
