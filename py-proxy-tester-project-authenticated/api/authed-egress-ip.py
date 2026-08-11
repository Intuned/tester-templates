from intuned_browser import go_to_url
from playwright.async_api import BrowserContext, Page

from utils.egress import probe_egress_ip


async def automation(
    page: Page,
    params: dict | None = None,
    context: BrowserContext | None = None,
    **_kwargs,
) -> dict:
    """Confirm the AuthSession is live before measuring egress.

    A proxy assertion must never pass on a run that silently lost its session.
    """
    if params is None or not params.get("url"):
        raise ValueError("This API requires a 'url' parameter")

    await go_to_url(page=page, url="https://sandbox.intuned.dev")
    user_menu_toggle = page.locator("#user-menu-toggle")
    await user_menu_toggle.wait_for(state="visible", timeout=15_000)

    probe = await probe_egress_ip(page, params["url"])
    return {**probe, "authenticated": True}
