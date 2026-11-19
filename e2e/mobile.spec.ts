import { expect, test, type Page } from "@playwright/test";

// Dijalankan hanya di proyek "mobile" (Pixel 7, 412px). Lihat playwright.config.ts.
const shapes = (page: Page) => page.locator(".react-flow__node-shape");
const menuTrigger = (page: Page) => page.getByRole("button", { name: "Menu", exact: true });

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test.describe("top bar HP @mobile", () => {
  test("dropdown mode berlabel berpindah antara Flowchart dan Workflow", async ({ page }) => {
    const trigger = page.getByRole("button", { name: "Flowchart", exact: true });
    await expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await page.getByRole("menuitemradio", { name: /^Workflow/ }).click();
    await expect(page.getByRole("button", { name: "Workflow", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Run" })).toBeVisible();
    await menuTrigger(page).click();
    await expect(page.getByRole("menuitem", { name: "Undo" })).toBeDisabled(); // Undo/Redo ada di menu ⋯
  });

  test("top bar: logo, mode, dan menu saja; Uji alur dan Undo/Redo ada di menu ⋯", async ({ page }) => {
    const header = page.locator("header");
    await expect(header.getByText("FlowForge")).toBeVisible();
    await expect(header.getByRole("button", { name: /^(Uji alur|Undo|Redo)$/ })).toHaveCount(0);
    await menuTrigger(page).click();
    await expect(page.getByRole("menuitem", { name: "Uji alur" })).toBeEnabled();
    await expect(page.getByRole("menuitem", { name: "Undo" })).toBeDisabled();
    await expect(page.getByRole("menuitem", { name: "Ekspor PNG" })).toBeDisabled(); // canvas kosong
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toBeHidden();
  });

  test("menu ⋯ memuat contoh dan mengekspor PNG", async ({ page }) => {
    await menuTrigger(page).click();
    await page.getByRole("menuitem", { name: "Muat contoh" }).click();
    await expect(shapes(page)).toHaveCount(20);

    await menuTrigger(page).click();
    const download = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: "Ekspor PNG" }).click();
    expect((await download).suggestedFilename()).toMatch(/\.png$/);
  });

  test("judul bisa diganti nama dengan mengetuknya", async ({ page }) => {
    await page.getByRole("button", { name: /^Ganti nama/ }).click();
    const input = page.getByLabel("Judul flowchart");
    await input.fill("Alur pendaftaran");
    await input.press("Enter");
    await expect(page.getByRole("button", { name: "Ganti nama: Alur pendaftaran" })).toBeVisible();
  });
});

test.describe("palet dan inspector HP @mobile", () => {
  test("FAB membuka palet; kartu menambah simbol, menutup sheet, dan membuka inspector", async ({ page }) => {
    await page.getByRole("button", { name: "Tambah simbol" }).click();
    const palette = page.getByRole("dialog", { name: "Tambah simbol" });
    await expect(palette).toBeVisible();
    await expect(page.getByRole("button", { name: "Tambah simbol", exact: true })).toHaveCount(0); // FAB (kontrol mengambang) tersembunyi saat sheet terbuka

    await palette.getByRole("button", { name: "Proses" }).click();
    await expect(palette).toBeHidden();
    await expect(shapes(page)).toHaveCount(1);

    const inspector = page.getByRole("region", { name: "Inspector" });
    await expect(inspector).toBeVisible();
    await inspector.getByLabel("Teks").fill("Verifikasi data");
    await expect(shapes(page).first()).toContainText("Verifikasi data");

    // menutup sheet membatalkan pilihan; Undo dari menu ⋯ membatalkan penambahan
    await page.keyboard.press("Escape");
    await expect(inspector).toBeHidden();
    await menuTrigger(page).click();
    await page.getByRole("menuitem", { name: "Undo" }).click();
    await expect(shapes(page)).toHaveCount(0);
  });

  test("simbol terpilih digeser ke area yang tidak tertutup sheet", async ({ page }) => {
    await page.getByRole("button", { name: "Tambah simbol" }).click();
    await page.getByRole("dialog", { name: "Tambah simbol" }).getByRole("button", { name: "Proses" }).click();
    const inspector = page.getByRole("region", { name: "Inspector" });
    await expect(inspector).toBeVisible();
    await page.waitForTimeout(500); // animasi sheet + setViewport
    const sheet = await inspector.boundingBox();
    const node = await shapes(page).first().boundingBox();
    expect(sheet && node).toBeTruthy();
    expect(node!.y + node!.height).toBeLessThanOrEqual(sheet!.y + 1);
  });

  test("Workflow: node dari palet memunculkan inspector", async ({ page }) => {
    await page.getByRole("button", { name: "Flowchart", exact: true }).click();
    await page.getByRole("menuitemradio", { name: /^Workflow/ }).click();
    await page.getByRole("button", { name: "Tambah node" }).click();
    await page.getByRole("dialog", { name: "Tambah node" }).getByRole("button", { name: /^Start/ }).click();
    await expect(page.getByRole("region", { name: "Inspector" })).toBeVisible();
  });
});

test.describe("panel bawah HP @mobile", () => {
  test("Uji alur: tinggi S/M/L, maksimum sekitar 40% layar", async ({ page }) => {
    await menuTrigger(page).click();
    await page.getByRole("menuitem", { name: "Muat contoh" }).click();
    await menuTrigger(page).click();
    await page.getByRole("menuitem", { name: "Uji alur" }).click();

    const panel = page.getByRole("region", { name: "Uji alur" });
    await expect(panel).toBeVisible();
    const vh = page.viewportSize()!.height;
    await expect(page.getByRole("button", { name: "Tinggi sedang" })).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: "Tinggi besar" }).click();
    await expect(page.getByRole("button", { name: "Tinggi besar" })).toHaveAttribute("aria-pressed", "true");
    await expect.poll(async () => (await panel.boundingBox())?.height ?? 0).toBeLessThanOrEqual(vh * 0.41);

    await page.getByRole("button", { name: "Tinggi kecil" }).click();
    await expect.poll(async () => (await panel.boundingBox())?.height ?? 0).toBeLessThan(vh * 0.3);
    await expect(page.getByRole("tab", { name: "Jalankan" })).toBeVisible();
  });

  test("Workflow: peek log setinggi satu baris, ketuk untuk membuka", async ({ page }) => {
    await page.getByRole("button", { name: "Flowchart", exact: true }).click();
    await page.getByRole("menuitemradio", { name: /^Workflow/ }).click();
    const peek = page.getByRole("button", { name: /Log eksekusi · belum ada/ });
    await expect(peek).toBeVisible();
    expect((await peek.boundingBox())!.height).toBeLessThan(70);
    await peek.click();
    await expect(page.getByRole("tab", { name: "Log" })).toBeVisible();
    await page.getByRole("button", { name: "Tutup panel log" }).click();
    await expect(peek).toBeVisible();
  });
});
