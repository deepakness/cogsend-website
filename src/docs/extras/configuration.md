<!-- docs:after "Secrets" -->
A new instance needs exactly one secret: `APP_ENCRYPTION_KEY`. The optional ones
are needed only by the feature that uses them — a connect button stays disabled
until its platform's credentials are on the Worker — so there is nothing to
collect up front.

<!-- docs:end -->

## Where to go next

- [Install and deploy](/docs/deploy/) — the install, the update path, and rolling back.
- [OAuth apps](/docs/oauth-apps/) — where `LINKEDIN_CLIENT_ID`, `THREADS_APP_ID` and `X_CLIENT_ID` come from.
- [Scheduling](/docs/scheduling/) — the tick, and why a token from Settings is usually a better choice than `SCHEDULER_SECRET` for a new pinger.
- [Cloudflare Access](/docs/access/) — the extra gate, and the three paths it has to let through.
