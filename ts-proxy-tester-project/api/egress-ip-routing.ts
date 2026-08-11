import { BrowserContext, Page } from "playwright";

import { EgressProbe, probeEgressIp } from "../utils/egress";

interface RoutingTarget {
  label: string;
  url: string;
}

interface Params {
  targets: RoutingTarget[];
}

/**
 * Probes several endpoints in a single run so an ordered proxy rule list can be
 * verified end to end: which requests take which upstream, which connect
 * directly, and which fall through to the catch-all.
 *
 * Checking only the URL that matches the first rule would also pass when every
 * request is proxied, so the caller is expected to include at least one target
 * that must egress directly.
 */
export default async function handler(
  params: Params,
  page: Page,
  _context: BrowserContext
): Promise<{ probes: EgressProbe[] }> {
  const targets = params?.targets ?? [];
  if (targets.length === 0) {
    throw new Error("egress-ip-routing requires at least one target");
  }

  const probes: EgressProbe[] = [];
  for (const target of targets) {
    const probe = await probeEgressIp(page, target.url);
    // The caller's label wins: third-party echo services do not echo one back.
    probes.push({ ...probe, label: target.label });
  }
  return { probes };
}
