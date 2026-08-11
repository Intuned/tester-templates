import { BrowserContext, Page } from "playwright";
import { goToUrl } from "@intuned/browser";

import {
  assertExpectedEgressIp,
  readAuthSessionEgressExpectation,
} from "../utils/egress";

export default async function check(
  page: Page,
  _context: BrowserContext
): Promise<boolean> {
  await goToUrl({ page, url: "https://sandbox.intuned.dev" });
  const userMenuToggle = page.locator("#user-menu-toggle");
  if (!(await userMenuToggle.isVisible())) return false;

  // Checks are pinned to the proxy the session was created with, so verify this
  // check is running through that same egress.
  const expectation = await readAuthSessionEgressExpectation();
  await assertExpectedEgressIp(page, expectation, "AuthSession check");

  return true;
}
