<!-- docs:page -->
> **The full reference lives in your instance.** Every endpoint, its payload and
> what it answers is listed inside your own deployment at `/api`, next to the
> examples and the copy buttons. This page is what has to be read first: making a
> key, and making the first call.

<!-- docs:end -->

<!-- docs:after "Examples" -->
Every call below needs a connection id, and the draft call hands back a draft id.
`GET /api/connections` lists the connected accounts; `id` is the value the
publish and schedule calls take. With [jq](https://jqlang.org) installed:

```sh
curl -s "$APP_URL/api/connections" -H "Authorization: Bearer $COGSEND_API_KEY" \
  | jq -r '.connections[] | "\(.id)  \(.platform)  \(.handle)"'
```

<!-- docs:end -->

## More examples

Schedule a draft instead of publishing it. `runAt` is an ISO 8601 time, in the
future and no more than a year out, and one request takes at most ten connection
ids:

```sh
curl -s -X POST "$APP_URL/api/drafts/DRAFT_ID/schedule" \
  -H "Authorization: Bearer $COGSEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"connectionIds":["CONN_ID"],"runAt":"2030-01-01T09:00:00Z"}'
```

It answers with the scheduled `targets` and `scheduledFor`. The post then waits
for a [tick](/docs/scheduling/), like one scheduled from the composer.

See what is queued:

```sh
curl -s "$APP_URL/api/queue" -H "Authorization: Bearer $COGSEND_API_KEY"
```

## Where to go next

- [Scheduling](/docs/scheduling/) — the tick that publishes a scheduled post, and the bearer it needs.
- [Cloudflare Access](/docs/access/) — if the instance is behind Access, a script needs a service token as well as a key.
- [Configuration](/docs/configuration/) — where keys and secrets are stored, and what `API_TOKEN` still does.
