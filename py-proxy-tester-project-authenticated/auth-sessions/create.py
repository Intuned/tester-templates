from typing import TypedDict

from intuned_browser import go_to_url
from playwright.async_api import Page

from utils.egress import assert_expected_egress_ip


class Params(TypedDict, total=False):
    username: str
    password: str
    expectedEgressIp: str
    egressProbeUrl: str


async def create(page: Page, params: Params | None = None, **_kwargs):
    if params is None:
        raise ValueError("Params with username and password are required")

    await go_to_url(page=page, url="https://sandbox.intuned.dev/login")

    email_input = page.locator("#email-input")
    await email_input.fill(params["username"])

    password_input = page.locator("#password-input")
    await password_input.fill(params["password"])

    submit_button = page.locator("#submit-button")
    await submit_button.click()

    protected_page = page.locator("#book-consultations-title")
    await protected_page.wait_for(state="visible", timeout=10_000)

    # Only treat the session as created once it is confirmed to have been built
    # through the intended proxy. Creating it through the wrong egress would
    # otherwise produce a session that quietly fails its own checks later.
    await assert_expected_egress_ip(page, dict(params), "AuthSession create")
