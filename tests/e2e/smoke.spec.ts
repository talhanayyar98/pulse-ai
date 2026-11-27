import { expect, type Locator, type Page, test } from "@playwright/test";

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

  await test.step("filters narrow the board, persist across reloads and clear", async () => {
    const filtersGroup = page.getByRole("group", { name: "Filter tasks" });
    await filtersGroup.getByRole("button", { name: "High" }).click();
    await expect(column("To Do").getByRole("listitem")).toHaveCount(1);
    await expect(filtersGroup).toContainText("1 of 3");

    await page.reload();
    await expect(column("To Do").getByRole("listitem")).toHaveCount(1);
    await expect(filtersGroup.getByRole("button", { name: "High" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await filtersGroup.getByRole("button", { name: "Clear" }).click();
    await expect(column("To Do").getByRole("listitem")).toHaveCount(3);
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

  await test.step("mouse drag reorders within a column and moves across columns", async () => {
    const cardIn = (columnName: string, title: string) =>
      column(columnName).getByRole("button", { name: new RegExp(title) });
    const titlesIn = (columnName: string) =>
      column(columnName).getByRole("listitem").allInnerTexts();

    // Newest first: "Water the plants" sits above "Call the bank". Drag "Call" to the top.
    expect((await titlesIn("To Do"))[0]).toContain("Water the plants");
    await dragWithMouse(
      page,
      cardIn("To Do", "Call the bank"),
      cardIn("To Do", "Water the plants"),
      "top",
    );
    await expect.poll(async () => (await titlesIn("To Do"))[0]).toContain("Call the bank");

    // Then drag "Water the plants" into the empty Done column.
    await dragWithMouse(page, cardIn("To Do", "Water the plants"), column("Done"), "center");
    await expect(cardIn("Done", "Water the plants")).toBeVisible();
  });

  await test.step("keyboard drag: Space to lift, arrows to move, Space to drop", async () => {
    // Wait for each state a sighted keyboard user would see before pressing the next key.
    const card = column("To Do").getByRole("button", { name: /Call the bank/ });
    await card.focus();
    await page.keyboard.press("Space");
    await expect(card).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("ArrowRight");
    const moved = column("In Progress").getByRole("button", { name: /Call the bank/ });
    await expect(moved).toBeVisible();
    await page.keyboard.press("Space");
    await expect(moved).not.toHaveAttribute("aria-pressed", "true");
  });

  await test.step("every move survives a reload", async () => {
    await page.reload();
    await expect(
      column("In Progress").getByRole("button", { name: /Call the bank/ }),
    ).toBeVisible();
    await expect(column("Done").getByRole("button", { name: /Water the plants/ })).toBeVisible();
    await expect(column("To Do").getByRole("listitem")).toHaveCount(0);
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

/** Drags like a person: press, nudge past the activation distance, glide, release. */
async function dragWithMouse(
  page: Page,
  source: Locator,
  target: Locator,
  position: "top" | "center",
): Promise<void> {
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error("Drag source or target is not visible");
  const startX = from.x + from.width / 2;
  const startY = from.y + from.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 8, startY + 8, { steps: 4 });
  const endY = position === "top" ? to.y + 4 : to.y + to.height / 2;
  await page.mouse.move(to.x + to.width / 2, endY, { steps: 20 });
  await page.mouse.up();
}
