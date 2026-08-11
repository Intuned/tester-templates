from intuned_browser import go_to_url
from playwright.async_api import Page

from utils.egress import (
    assert_expected_egress_ip,
    read_auth_session_egress_expectation,
)


async def check(page: Page, **_kwargs) -> bool:
    await go_to_url(page=page, url="https://sandbox.intuned.dev")
    user_menu_toggle = page.locator("#user-menu-toggle")
    if not await user_menu_toggle.is_visible():
        return False

    # Checks are pinned to the proxy the session was created with, so verify
    # this check is running through that same egress.
    expectation = await read_auth_session_egress_expectation()
    await assert_expected_egress_ip(page, expectation, "AuthSession check")

    return True
