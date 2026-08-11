# ts-proxy-tester-project

Test fixture for the Intuned platform-tester proxy scenarios
(`proxyScenarioPlatformTestWorkflow` in `apps/web/temporal/workflows/platformTester/scenarios/`).

Every API here reports the **egress IP** the outside world observed for the
browser, which is how the scenarios prove that a configured proxy was actually
used rather than merely recorded.

## APIs

- `egress-ip` — returns `{ url, label, ip }` for a single probe URL.
- `browser-timezone` — returns the timezone the browser reports (`Intl` + `Date` offset) and, when `creepjsUrl` is supplied, whether that fingerprinting page independently reports the same zone.
- `egress-ip-routing` — probes every `{ label, url }` in `targets` within a single run and returns `{ probes: [{ label, url, ip }] }`.

`url` / `primaryUrl` / `secondaryUrl` point at the platform tester's
`GET /api/echo-ip/:label?key=<sinkAccessKey>` endpoint during a scenario run.
The committed defaults point at `https://api.ipify.org/?format=json` instead, so the project can be run
standalone without a tester machine.

`egress-ip-routing` deliberately probes two URLs in one run. Conditional proxy
rules must be checked from **both** sides — the matching URL egressing through
the proxy AND the non-matching URL egressing directly. A check of only the
matching side also passes when every request is proxied, which is the exact
failure mode worth catching.

## Running standalone

```bash
intuned dev run api egress-ip '{"url":"https://api.ipify.org/?format=json"}'
intuned dev run api egress-ip-routing '{"targets": [{"label": "primary", "url": "https://api.ipify.org/?format=json"}, {"label": "fallthrough", "url": "https://ipinfo.io/json"}]}' \
  --proxy '[{"url":"http://user:pass@proxy:8080","regex":"^https://api\\.ipify\\.org/$"},{"url":null}]'
```

The job config in `intuned-resources/jobs/` is a standalone default; the
scenarios build job payloads inline because the echo URL is per-run.
