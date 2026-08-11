import { BrowserContext, Page } from "playwright";

interface Params {
  /** Optional fingerprinting page used as an independent witness. */
  creepjsUrl?: string;
  /** Timezone the run was configured with, used to wait for it to appear. */
  expectedTimeZone?: string;
}

interface CreepjsReading {
  url: string;
  containsIntlTimeZone: boolean;
  containsExpectedTimeZone: boolean | null;
  excerpt: string;
}

interface TimezoneReading {
  intlTimeZone: string;
  offsetMinutes: number;
  localeString: string;
  creepjs: CreepjsReading | null;
}

function excerptAround(text: string, needle: string): string {
  const index = needle ? text.indexOf(needle) : -1;
  if (index === -1) return text.slice(0, 400);
  return text.slice(Math.max(0, index - 200), index + 200);
}

async function readCreepjs(
  page: Page,
  url: string,
  intlTimeZone: string,
  expectedTimeZone?: string
): Promise<CreepjsReading> {
  // Raw goto with `domcontentloaded`: the fingerprinting page keeps working
  // long after DOM ready, so waiting for a full load can time out.
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });

  const needle = expectedTimeZone ?? intlTimeZone;
  try {
    await page.waitForFunction(
      (value) => (document.body.innerText || "").includes(value),
      needle,
      { timeout: 60_000 }
    );
  } catch {
    // Fall through and report what was rendered, so a failure is diagnosable
    // rather than just a timeout.
  }

  const text = await page.locator("body").innerText();
  return {
    url,
    containsIntlTimeZone: text.includes(intlTimeZone),
    containsExpectedTimeZone: expectedTimeZone
      ? text.includes(expectedTimeZone)
      : null,
    excerpt: excerptAround(text, needle),
  };
}

/**
 * Reports the timezone the browser believes it is in.
 *
 * `Intl` and `Date` are the authoritative reading — the platform applies the
 * timezone through the `TZ` environment variable (or a CDP override), and both
 * derive from it. The optional creepjs visit is an independent witness: a real
 * fingerprinting page reporting the same zone rules out the timezone being
 * applied to our own snippet but not to the page at large.
 */
export default async function handler(
  params: Params,
  page: Page,
  _context: BrowserContext
): Promise<TimezoneReading> {
  const reading = await page.evaluate(() => ({
    intlTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    offsetMinutes: new Date().getTimezoneOffset(),
    localeString: new Date(0).toString(),
  }));

  const creepjsUrl = params?.creepjsUrl;
  return {
    ...reading,
    creepjs: creepjsUrl
      ? await readCreepjs(
          page,
          creepjsUrl,
          reading.intlTimeZone,
          params?.expectedTimeZone
        )
      : null,
  };
}
