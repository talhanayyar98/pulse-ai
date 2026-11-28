import { expect, type Locator, type Page, test } from "@playwright/test";

test("sign in, capture and edit a task, plan the week and month, install and work offline", async ({
  page,
  context,
}) => {
  const column = (name: string) => page.getByRole("region", { name });
  const savesSettled = trackSaves(page);

  await test.step("signed-out visitors are sent to sign in", async () => {
    await page.goto("/");
    // The guard waits for the session check, and a server that has just started can take
    // several seconds to answer its first request.
    await expect(page).toHaveURL(/\/signin$/, { timeout: 15_000 });
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
    await savesSettled();
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
    // dnd-kit measures drop targets just after the lift; an arrow pressed within those few
    // milliseconds is ignored (no person is that fast), so retry until the card moves.
    const moved = column("In Progress").getByRole("button", { name: /Call the bank/ });
    await expect(async () => {
      await page.keyboard.press("ArrowRight");
      await expect(moved).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 5_000 });
    await page.keyboard.press("Space");
    await expect(moved).not.toHaveAttribute("aria-pressed", "true");
  });

  await test.step("every move survives a reload", async () => {
    await savesSettled();
    await page.reload();
    await expect(
      column("In Progress").getByRole("button", { name: /Call the bank/ }),
    ).toBeVisible();
    await expect(column("Done").getByRole("button", { name: /Water the plants/ })).toBeVisible();
    await expect(column("To Do").getByRole("listitem")).toHaveCount(0);
  });

  await test.step("Done collapses tasks completed more than a week ago", async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000).toISOString();
    const response = await page.request.post("/api/sync", {
      data: {
        ops: [
          {
            opId: crypto.randomUUID(),
            type: "task.put",
            task: {
              id: crypto.randomUUID(),
              title: "File last year's taxes",
              description: "",
              status: "done",
              priority: "medium",
              labels: [],
              order: "a0",
              dueAt: null,
              allDay: false,
              horizon: "none",
              subtasks: [],
              statusChangedAt: tenDaysAgo,
              completedAt: tenDaysAgo,
              createdAt: tenDaysAgo,
              updatedAt: new Date().toISOString(),
              deletedAt: null,
            },
          },
        ],
      },
    });
    expect(response.ok()).toBe(true);

    await page.reload();
    const done = column("Done");
    await expect(done.getByRole("button", { name: /Water the plants/ })).toBeVisible();
    await expect(done.getByText("File last year's taxes")).toBeHidden();
    const toggle = done.getByRole("button", { name: /done over 7 days ago/ });
    await toggle.click();
    await expect(done.getByText("File last year's taxes")).toBeVisible();
    await expect(done.getByRole("button", { name: /Hide 1 older task/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  await test.step("overdue tasks pulse and are counted in the header and navigation", async () => {
    await page.keyboard.press("n");
    await page.keyboard.type("Pay the electricity bill");
    await page.keyboard.press("Enter");
    await column("To Do")
      .getByRole("button", { name: /Pay the electricity bill/ })
      .click();

    const yesterday = new Date(Date.now() - 86_400_000);
    const localDate = [
      yesterday.getFullYear(),
      String(yesterday.getMonth() + 1).padStart(2, "0"),
      String(yesterday.getDate()).padStart(2, "0"),
    ].join("-");
    const drawer = page.getByRole("dialog", { name: "Task details" });
    await drawer.getByLabel("Due date").fill(localDate);
    await page.keyboard.press("Escape");

    const card = column("To Do").getByRole("button", { name: /Pay the electricity bill/ });
    await expect(card).toContainText("Overdue · Yesterday");
    await expect(page.getByRole("main").getByText("1 overdue", { exact: true })).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: "Views" })
        .getByRole("link", { name: /Board \(1 overdue\)/ }),
    ).toBeVisible();
  });

  await test.step("the bell counts new notifications; opening one marks it read", async () => {
    const bell = page.getByRole("button", { name: /^Notifications/ });
    await expect(bell).toHaveAccessibleName(/^Notifications, \d+ new$/);

    await bell.click();
    const panel = page.getByRole("dialog", { name: "Notifications" });
    await expect(panel).toBeVisible();
    await expect(bell).toHaveAccessibleName("Notifications");
    await panel
      .getByRole("button", { name: /^Unread: Pay the electricity bill is overdue/ })
      .click();
    await expect(panel).toBeHidden();

    const drawer = page.getByRole("dialog", { name: "Task details" });
    await expect(drawer.getByRole("textbox", { name: "Title" })).toHaveValue(
      "Pay the electricity bill",
    );
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(bell).toBeFocused();

    await bell.click();
    await expect(
      panel.getByRole("button", { name: /^Pay the electricity bill is overdue/ }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
  });

  await test.step("week planner: drag an unscheduled task onto today, add one on a day", async () => {
    await page
      .getByRole("navigation", { name: "Views" })
      .getByRole("link", { name: "Week" })
      .click();
    const tray = page.getByRole("region", { name: "Unscheduled" });
    const today = page.getByRole("region", { name: `${dayName(inDays(0))}, today` });
    const callTheBank = (where: Locator) => where.getByRole("button", { name: /Call the bank/ });

    await dragWithMouse(page, callTheBank(tray), today, "center");
    await expect(callTheBank(today)).toBeVisible();
    await expect(callTheBank(tray)).toBeHidden();

    await today.getByRole("button", { name: /^Add a task on/ }).click();
    await page.keyboard.type("Pick up the dry cleaning");
    await page.keyboard.press("Enter");
    await expect(today.getByRole("button", { name: /Pick up the dry cleaning/ })).toBeVisible();
  });

  await test.step("a weekly repeat shows what's coming; completing it schedules the next", async () => {
    const today = page.getByRole("region", { name: `${dayName(inDays(0))}, today` });
    const inAWeek = page.getByRole("region", { name: dayName(inDays(7)) });
    const dryCleaning = (where: Locator) =>
      where.getByRole("button", { name: /Pick up the dry cleaning/ });
    const drawer = page.getByRole("dialog", { name: "Task details" });
    const status = drawer.getByRole("combobox", { name: "Status" });
    const nextWeek = page.getByRole("button", { name: "Next week" });
    const thisWeek = page.getByRole("button", { name: "Today" });

    await dryCleaning(today).click();
    await drawer.getByRole("radio", { name: "Weekly" }).click();
    await expect(drawer.getByRole("button", { name: weekdayOf(inDays(0)) })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(drawer).toContainText(`Next one: ${shortDay(inDays(7))}`);
    await page.keyboard.press("Escape");

    // Next week shows a projected occurrence, not a real task yet.
    await nextWeek.click();
    await expect(dryCleaning(inAWeek)).toHaveAccessibleName(/^Upcoming: /);
    await thisWeek.click();

    await dryCleaning(today).click();
    await status.selectOption("done");
    await expect(page.getByRole("status").filter({ hasText: "Next one:" })).toBeVisible();
    await page.keyboard.press("Escape");
    await nextWeek.click();
    await expect(dryCleaning(inAWeek)).toHaveAttribute("aria-roledescription", "draggable task");
    await thisWeek.click();

    // Reopening takes the untouched next occurrence back.
    await dryCleaning(today).click();
    await status.selectOption("todo");
    await page.keyboard.press("Escape");
    await nextWeek.click();
    await expect(dryCleaning(inAWeek)).toHaveAccessibleName(/^Upcoming: /);
    await thisWeek.click();
  });

  await test.step("month calendar: click a day to add a task, drag it to reschedule", async () => {
    await page
      .getByRole("navigation", { name: "Views" })
      .getByRole("link", { name: "Month" })
      .click();
    // Two days of this month that aren't today, so they hold at most a repeat besides our task.
    const now = new Date();
    const [first, second] = [10, 11].includes(now.getDate()) ? [20, 21] : [10, 11];
    const dayOfMonth = (date: number) =>
      page.getByRole("group", {
        name: dayName(new Date(now.getFullYear(), now.getMonth(), date)),
        exact: true,
      });
    const from = dayOfMonth(first);
    const to = dayOfMonth(second);
    const books = (where: Locator) =>
      where.getByRole("button", { name: /Return the library books/ });

    const box = await from.boundingBox();
    if (!box) throw new Error("Day is not visible");
    await from.click({ position: { x: box.width / 2, y: box.height - 8 } });
    await expect(page.getByRole("combobox", { name: "New task" })).toHaveAttribute(
      "placeholder",
      `What needs doing on ${dayName(new Date(now.getFullYear(), now.getMonth(), first))}?`,
    );
    await page.keyboard.type("Return the library books");
    await page.keyboard.press("Enter");
    await expect(books(from)).toBeVisible();

    await dragWithMouse(page, books(from), to, "center");
    await expect(books(to)).toBeVisible();
    await savesSettled();
    await page.reload();
    await expect(books(to)).toBeVisible();
    await expect(books(from)).toBeHidden();
  });

  await test.step("the week can start on Sunday, on every device", async () => {
    await page.getByRole("button", { name: "Settings" }).click();
    const dialog = page.getByRole("dialog", { name: "Settings" });
    const saved = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/settings") && response.request().method() === "PUT",
    );
    await dialog.getByRole("radio", { name: "Sunday" }).click();
    await saved;
    await page.keyboard.press("Escape");

    await page
      .getByRole("navigation", { name: "Views" })
      .getByRole("link", { name: "Week" })
      .click();
    const firstDay = page.getByRole("main").getByRole("region").nth(1);
    await expect(firstDay).toHaveAccessibleName(/^Sunday /);
    await page.reload();
    await expect(firstDay).toHaveAccessibleName(/^Sunday /);

    await page
      .getByRole("navigation", { name: "Views" })
      .getByRole("link", { name: "Board" })
      .click();
    await expect(page).toHaveURL(/\/board$/);
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

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Local midnight, `days` from today (calendar arithmetic, so daylight saving can't shift it). */
function inDays(days: number): Date {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
}

function weekdayOf(date: Date): string {
  return WEEKDAYS[date.getDay()] ?? "";
}

/** "Saturday 28 November": how the calendars name a day. */
function dayName(date: Date): string {
  return `${weekdayOf(date)} ${date.getDate()} ${MONTHS[date.getMonth()] ?? ""}`;
}

/** "Sat 5 Dec": how the repeat preview writes a date. */
function shortDay(date: Date): string {
  return `${weekdayOf(date).slice(0, 3)} ${date.getDate()} ${(MONTHS[date.getMonth()] ?? "").slice(0, 3)}`;
}

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

/**
 * Edits save in the background. M5 adds an IndexedDB outbox that survives reloads; until
 * then, wait for in-flight saves before reloading, as a person would see them finish.
 */
function trackSaves(page: Page): () => Promise<void> {
  let inFlight = 0;
  const isSave = (url: string) => url.endsWith("/api/sync");
  page.on("request", (request) => {
    if (isSave(request.url())) inFlight++;
  });
  const settle = (request: { url(): string }) => {
    if (isSave(request.url())) inFlight--;
  };
  page.on("requestfinished", settle);
  page.on("requestfailed", settle);
  return () => expect.poll(() => inFlight).toBe(0);
}
