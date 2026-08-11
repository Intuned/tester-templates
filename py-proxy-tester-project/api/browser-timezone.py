from playwright.async_api import BrowserContext, Page


def _excerpt_around(text: str, needle: str) -> str:
    index = text.find(needle) if needle else -1
    if index == -1:
        return text[:400]
    return text[max(0, index - 200) : index + 200]


async def _read_creepjs(
    page: Page,
    url: str,
    intl_time_zone: str,
    expected_time_zone: str | None,
) -> dict:
    # Raw goto with "domcontentloaded": the fingerprinting page keeps working
    # long after DOM ready, so waiting for a full load can time out.
    await page.goto(url, wait_until="domcontentloaded", timeout=60_000)

    needle = expected_time_zone or intl_time_zone
    try:
        await page.wait_for_function(
            "value => (document.body.innerText || '').includes(value)",
            arg=needle,
            timeout=60_000,
        )
    except Exception:  # noqa: BLE001 - report what rendered instead of timing out
        pass

    text = await page.locator("body").inner_text()
    return {
        "url": url,
        "containsIntlTimeZone": intl_time_zone in text,
        "containsExpectedTimeZone": (
            expected_time_zone in text if expected_time_zone else None
        ),
        "excerpt": _excerpt_around(text, needle),
    }


async def automation(
    page: Page,
    params: dict | None = None,
    context: BrowserContext | None = None,
    **_kwargs,
) -> dict:
    """Report the timezone the browser believes it is in.

    `Intl` and `Date` are the authoritative reading — the platform applies the
    timezone through the `TZ` environment variable (or a CDP override), and both
    derive from it. The optional creepjs visit is an independent witness: a real
    fingerprinting page reporting the same zone rules out the timezone being
    applied to our own snippet but not to the page at large.
    """
    reading = await page.evaluate(
        """() => ({
            intlTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            offsetMinutes: new Date().getTimezoneOffset(),
            localeString: new Date(0).toString(),
        })"""
    )

    creepjs_url = (params or {}).get("creepjsUrl")
    creepjs = (
        await _read_creepjs(
            page,
            creepjs_url,
            reading["intlTimeZone"],
            (params or {}).get("expectedTimeZone"),
        )
        if creepjs_url
        else None
    )

    return {**reading, "creepjs": creepjs}
