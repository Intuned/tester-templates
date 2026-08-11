from playwright.async_api import BrowserContext, Page

from utils.egress import probe_egress_ip


async def automation(
    page: Page,
    params: dict | None = None,
    context: BrowserContext | None = None,
    **_kwargs,
) -> dict:
    if params is None or not params.get("url"):
        raise ValueError("This API requires a 'url' parameter")

    return dict(await probe_egress_ip(page, params["url"]))
