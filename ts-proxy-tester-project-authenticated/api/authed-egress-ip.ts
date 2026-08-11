import { BrowserContext, Page } from "playwright";
import { goToUrl } from "@intuned/browser";

import { EgressProbe, probeEgressIp } from "../utils/egress";

interface Params {
  url: string;
}

/**
 * Confirms the AuthSession is live before measuring egress, so a proxy
 * assertion can never pass on a run that silently lost its session.
 */
export default async function handler(
  params: Params,
  page: Page,
  _context: BrowserContext
): Promise<EgressProbe & { authenticated: true }> {
  await goToUrl({ page, url: "https://sandbox.intuned.dev" });
  const userMenuToggle = page.locator("#user-menu-toggle");
  await userMenuToggle.waitFor({ state: "visible", timeout: 15_000 });

  const probe = await probeEgressIp(page, params?.url);
  return { ...probe, authenticated: true };
}
