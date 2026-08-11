import json
from typing import TypedDict

from intuned_browser import go_to_url
from intuned_runtime import get_auth_session_parameters
from playwright.async_api import Page


class EgressProbe(TypedDict):
    url: str
    label: str
    ip: str


async def probe_egress_ip(page: Page, url: str) -> EgressProbe:
    """Navigate to an IP echo endpoint and return the egress IP it observed.

    The platform tester serves `/api/echo-ip/:label`, which reports the IP
    Fly's edge saw for the request. When the browser is routed through a proxy
    that is the proxy's exit IP, which is what makes proxy behaviour
    observable.
    """
    if not url:
        raise ValueError("A probe URL is required")

    await go_to_url(page=page, url=url)
    body = (await page.locator("body").inner_text()).strip()

    try:
        parsed = json.loads(body)
    except json.JSONDecodeError as error:
        raise ValueError(
            f"Egress probe at {url} did not return JSON. Body: {body[:200]}"
        ) from error

    ip = parsed.get("ip")
    if not ip:
        raise ValueError(
            f"Egress probe at {url} returned no ip. Body: {body[:200]}"
        )

    return {"url": url, "label": parsed.get("label", ""), "ip": ip}


async def assert_expected_egress_ip(
    page: Page,
    expectation: dict | None,
    context: str,
) -> str | None:
    """Enforce that this run left through the expected egress IP.

    Opt-in: with no expectation supplied nothing is checked, so the same code
    works for AuthSessions created without a proxy.
    """
    expected_ip = (expectation or {}).get("expectedEgressIp")
    probe_url = (expectation or {}).get("egressProbeUrl")
    if not expected_ip or not probe_url:
        return None

    probe = await probe_egress_ip(page, probe_url)
    if probe["ip"] != expected_ip:
        raise ValueError(
            f"{context}: expected to egress from {expected_ip}, but the request "
            f"came from {probe['ip']}. The proxy in effect is not the one this "
            "AuthSession is pinned to."
        )
    return probe["ip"]


async def read_auth_session_egress_expectation() -> dict | None:
    """Read the egress expectation back out of the AuthSession parameters.

    This lets a check prove it is running through the same egress the session
    was created through without anything extra being threaded in. A failure to
    read the parameters is treated as "no expectation": the session should not
    be invalidated because of an infrastructure hiccup.
    """
    try:
        return await get_auth_session_parameters()
    except Exception as error:  # noqa: BLE001 - never fail a session over this
        print(f"Could not read AuthSession parameters, skipping the egress check: {error}")
        return None
