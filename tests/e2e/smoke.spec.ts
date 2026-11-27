import { expect, test } from "@playwright/test";

test("sign in, capture and edit a task, install and work offline", async ({ page, context }) => {
  const column = (name: string) => page.getByRole("region", { name });

  await test.step("signed-out visitors are sent to sign in", async () => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/signin$/);
  });

  await test.step("dev sign-in opens the board with all four columns", async () => {
    await page.getByRole("button", { name: "Continue as dev user" }).click();
    await expect(page).toHaveURL(/\/board$/);
    for (const name of ["Backlog", "To Do", "In Progress", "Done"]) {
      await expect(column(name)).toBeVisible();
    }
    await expect(column("To Do")).toContainText("Nothing queued");
  });

  await test.step("N opens quick add; #label and !priority are parsed", async () => {
    await page.keyboard.press("n");
    const palette = page.getByRole("dialog", { name: "Command palette" });
    await expect(palette).toBeVisible();
    await page.keyboard.type("Buy oat milk #errands !high");
    await page.keyboard.press("Enter");
    await expect(palette).toBeHidden();

    const card = column("To Do").getByRole("button", { name: /Buy oat milk/ });
    await expect(card).toBeVisible();
    await expect(card).toContainText("errands");
    await expect(card.getByRole("img", { name: "High priority" })).toBeVisible();
  });

  await test.step("back-to-back quick adds never lose or merge keystrokes", async () => {
    for (const title of ["Call the bank", "Water the plants"]) {
      await page.keyboard.press("n");
      await page.keyboard.type(title);
      await page.keyboard.press("Enter");
    }
    const todo = column("To Do");
    await expect(todo.getByText("Call the bank", { exact: true })).toBeVisible();
    await expect(todo.getByText("Water the plants", { exact: true })).toBeVisible();
    await expect(todo.getByRole("listitem")).toHaveCount(3);
  });

  await test.step("the task survives a reload", async () => {
    await page.reload();
    await expect(column("To Do").getByRole("button", { name: /Buy oat milk/ })).toBeVisible();
  });

  await test.step("the drawer edits status and subtasks", async () => {
    await column("To Do")
      .getByRole("button", { name: /Buy oat milk/ })
      .click();
    const drawer = page.getByRole("dialog", { name: "Task details" });
    await expect(drawer).toBeVisible();

    await drawer.getByRole("combobox", { name: "Status" }).selectOption("in_progress");

    // Rapid edits in a row must all survive (none may overwrite another).
    const inThreeWeeks = new Date(Date.now() + 21 * 86_400_000).toISOString().slice(0, 10);
    await drawer.getByLabel("Due date").fill(inThreeWeeks);
    await drawer.getByLabel("Due time").fill("09:15");
    const addSubtask = drawer.getByRole("textbox", { name: "Add subtask" });
    await addSubtask.fill("Check the fridge first");
    await addSubtask.press("Enter");
    await addSubtask.fill("Bring a bag");
    await addSubtask.press("Enter");
    await expect(drawer.getByRole("checkbox")).toHaveCount(2);
    await expect(drawer.getByLabel("Due time")).toHaveValue("09:15");

    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();

    const moved = column("In Progress").getByRole("button", { name: /Buy oat milk/ });
    await expect(moved).toBeVisible();
    await expect(moved).toContainText("0/2");
    await expect(moved).toContainText("09:15");
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
