import { Page } from "playwright";
import { goToUrl } from "@intuned/browser";
import { getAuthSessionParameters } from "@intuned/runtime";

export interface EgressProbe {
  url: string;
  label: string;
  ip: string;
}

/**
 * Navigates to an IP echo endpoint and returns the egress IP it observed.
 *
 * The platform tester serves `/api/echo-ip/:label`, which reports the IP Fly's
 * edge saw for the request. When the browser is routed through a proxy that is
 * the proxy's exit IP, which is what makes proxy behaviour observable.
 */
export async function probeEgressIp(
  page: Page,
  url: string
): Promise<EgressProbe> {
  if (!url) {
    throw new Error("A probe URL is required");
  }

  await goToUrl({ page, url });
  const body = (await page.locator("body").innerText()).trim();

  let parsed: { label?: string; ip?: string };
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error(
      `Egress probe at ${url} did not return JSON. Body: ${body.slice(0, 200)}`
    );
  }

  if (!parsed.ip) {
    throw new Error(
      `Egress probe at ${url} returned no ip. Body: ${body.slice(0, 200)}`
    );
  }

  return { url, label: parsed.label ?? "", ip: parsed.ip };
}

export interface EgressExpectation {
  /** When set, the run must egress from this IP or it fails. */
  expectedEgressIp?: string;
  /** Echo endpoint used to observe the egress IP. Required alongside the IP. */
  egressProbeUrl?: string;
}

/**
 * Enforces that this run left through the expected egress IP.
 *
 * Opt-in: with no expectation supplied nothing is checked, so the same code
 * works for AuthSessions created without a proxy.
 */
export async function assertExpectedEgressIp(
  page: Page,
  expectation: EgressExpectation | undefined,
  context: string
): Promise<string | undefined> {
  const expectedIp = expectation?.expectedEgressIp;
  const probeUrl = expectation?.egressProbeUrl;
  if (!expectedIp || !probeUrl) return undefined;

  const probe = await probeEgressIp(page, probeUrl);
  if (probe.ip !== expectedIp) {
    throw new Error(
      `${context}: expected to egress from ${expectedIp}, but the request came ` +
        `from ${probe.ip}. The proxy in effect is not the one this AuthSession ` +
        `is pinned to.`
    );
  }
  return probe.ip;
}

/**
 * Reads the egress expectation back out of the parameters the AuthSession was
 * created with, so a check can prove it is running through the same egress the
 * session was created through without anything extra being threaded in.
 *
 * A failure to read the parameters is treated as "no expectation": the session
 * should not be invalidated because of an infrastructure hiccup.
 */
export async function readAuthSessionEgressExpectation(): Promise<
  EgressExpectation | undefined
> {
  try {
    return (await getAuthSessionParameters()) as EgressExpectation;
  } catch (error) {
    console.warn(
      `Could not read AuthSession parameters, skipping the egress check: ${String(
        error
      )}`
    );
    return undefined;
  }
}
