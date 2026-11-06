import { test, expect } from "@playwright/test";

test.describe("Workflow page performance", () => {
  test("should load workflows page within acceptable time", async ({ page }) => {
    const startTime = Date.now();

    // Navigate to workflows page (assuming already logged in or login first)
    await page.goto("/workflows");

    // Wait for the table to be visible
    await page.waitForSelector("table", { state: "visible", timeout: 10000 });

    const loadTime = Date.now() - startTime;
    console.log(`Workflow page loaded in ${loadTime}ms`);

    // Assert page loads within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test("should measure API response time", async ({ page }) => {
    const apiTimes: number[] = [];

    page.on("response", (response) => {
      if (response.url().includes("/api/v1/workflows")) {
        const start = Date.now();
        response.finished().then(() => {
          apiTimes.push(Date.now() - start);
        });
      }
    });

    await page.goto("/workflows");
    await page.waitForSelector("table", { state: "visible", timeout: 10000 });

    if (apiTimes.length > 0) {
      const avgApiTime =
        apiTimes.reduce((a, b) => a + b, 0) / apiTimes.length;
      console.log(`Average API response time: ${avgApiTime.toFixed(2)}ms`);
      expect(avgApiTime).toBeLessThan(2000);
    }
  });

  test("should render workflow table without errors", async ({ page }) => {
    const errors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/workflows");
    await page.waitForSelector("table", { state: "visible", timeout: 10000 });

    // Check for critical console errors
    const criticalErrors = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("404"),
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
