# ts-proxy-tester-project-authenticated

Test fixture for the Intuned platform-tester proxy scenarios
(`authenticatedProxyScenarioPlatformTestWorkflow` in `apps/web/temporal/workflows/platformTester/scenarios/`).

Every API here reports the **egress IP** the outside world observed for the
browser, which is how the scenarios prove that a configured proxy was actually
used rather than merely recorded.

## APIs

- `authed-egress-ip` — asserts the AuthSession is live (`#user-menu-toggle` on sandbox.intuned.dev), then returns `{ url, label, ip, authenticated: true }`.

### AuthSession egress pinning

`auth-sessions/create` accepts two optional parameters alongside the credentials:

- `expectedEgressIp` — the IP the create attempt must egress from
- `egressProbeUrl` — the echo endpoint used to observe it

When both are supplied, `create` fails unless the session was built through that egress, and `check` reads the same values back with `getAuthSessionParameters` to confirm it is still running through the proxy the session was created with. Supplying neither disables both checks, so unproxied sessions behave normally.
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
intuned dev run authsession create '{"username":"demo@email.com","password":"DemoUser2024!"}' --id proxy-authsession
intuned dev run api authed-egress-ip '{"url":"https://api.ipify.org/?format=json"}' --auth-session proxy-authsession
intuned dev run api egress-ip-routing '{"targets": [{"label": "primary", "url": "https://api.ipify.org/?format=json"}, {"label": "fallthrough", "url": "https://ipinfo.io/json"}]}' \
  --proxy '[{"url":"http://user:pass@proxy:8080","regex":"^https://api\\.ipify\\.org/$"},{"url":null}]'
```

The job config in `intuned-resources/jobs/` is a standalone default; the
scenarios build job payloads inline because the echo URL is per-run.
