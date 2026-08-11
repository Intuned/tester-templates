from playwright.async_api import BrowserContext, Page

from utils.egress import probe_egress_ip


async def automation(
    page: Page,
    params: dict | None = None,
    context: BrowserContext | None = None,
    **_kwargs,
) -> dict:
    """Probe several endpoints in a single run.

    An ordered proxy rule list is verified end to end: which requests take which
    upstream, which connect directly, and which fall through to the catch-all.
    Checking only the URL that matches the first rule would also pass when every
    request is proxied, so the caller is expected to include at least one target
    that must egress directly.
    """
    targets = (params or {}).get("targets") or []
    if not targets:
        raise ValueError("egress-ip-routing requires at least one target")

    probes = []
    for target in targets:
        probe = await probe_egress_ip(page, target["url"])
        # The caller's label wins: third-party echo services do not echo one back.
        probes.append({**probe, "label": target["label"]})

    return {"probes": probes}
