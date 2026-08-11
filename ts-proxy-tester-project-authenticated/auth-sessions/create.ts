import { BrowserContext, Page } from "playwright";
import { goToUrl } from "@intuned/browser";

import { assertExpectedEgressIp, EgressExpectation } from "../utils/egress";

export interface CreateAuthSessionParams extends EgressExpectation {
  username: string;
  password: string;
}

export default async function create(
  params: CreateAuthSessionParams,
  page: Page,
  _context: BrowserContext
): Promise<void> {
  await goToUrl({ page, url: "https://sandbox.intuned.dev/login" });

  const emailInput = page.locator("#email-input");
  await emailInput.fill(params.username);

  const passwordInput = page.locator("#password-input");
  await passwordInput.fill(params.password);

  const submitButton = page.locator("#submit-button");
  await submitButton.click();

  const protectedPage = page.locator("#book-consultations-title");
  await protectedPage.waitFor({ state: "visible", timeout: 10_000 });

  // Only treat the session as created once it is confirmed to have been built
  // through the intended proxy. Creating it through the wrong egress would
  // otherwise produce a session that quietly fails its own checks later.
  await assertExpectedEgressIp(page, params, "AuthSession create");
}
