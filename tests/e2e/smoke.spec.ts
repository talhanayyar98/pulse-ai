import { expect, test } from "@playwright/test";

test("app shell is installable and works offline", async ({ page, context }) => {
  await test.step("root redirects to the board with all four columns", async () => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/board$/);
    await expect(page.getByRole("heading", { level: 1, name: "Board" })).toBeVisible();
    for (const column of ["Backlog", "To Do", "In Progress", "Done"]) {
      await expect(page.getByRole("region", { name: column })).toBeVisible();
    }
  });

  await test.step("manifest is linked and served", async () => {
    const href = await page.locator('link[rel="manifest"]').getAttribute("href");
    expect(href).toBeTruthy();
    const response = await page.request.get(href ?? "");
    expect(response.ok()).toBe(true);
    expect(await response.json()).toMatchObject({ display: "standalone", start_url: "/board" });
  });

  await test.step("service worker installs and controls the page", async () => {
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
      .toBe(true);
  });

  await test.step("views open offline, including ones never visited", async () => {
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Board" })).toBeVisible();

    await page
      .getByRole("navigation", { name: "Views" })
      .getByRole("link", { name: "Month" })
      .click();
    await expect(page.getByRole("heading", { level: 1, name: "Month" })).toBeVisible();

    await page.goto("/not-cached-anywhere");
    await expect(page.getByRole("heading", { name: "You're offline" })).toBeVisible();
    await context.setOffline(false);
  });
});
