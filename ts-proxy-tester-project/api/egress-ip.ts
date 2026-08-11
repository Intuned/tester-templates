import { BrowserContext, Page } from "playwright";

import { EgressProbe, probeEgressIp } from "../utils/egress";

interface Params {
  url: string;
}

export default async function handler(
  params: Params,
  page: Page,
  _context: BrowserContext
): Promise<EgressProbe> {
  return await probeEgressIp(page, params?.url);
}
