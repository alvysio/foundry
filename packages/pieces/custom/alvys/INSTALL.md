# Installing the Alvys piece suite

This Activepieces fork (`alvysio/foundry`) ships five Alvys-branded custom pieces. They are private to this fork — nothing here gets published to npm or to `cloud.activepieces.com`.

## The pieces

| Piece | Package | Actions | Triggers | Status |
|---|---|---|---|---|
| Alvys | `@activepieces/piece-alvys` | 40 + custom API call | 7 entity-scoped webhooks | working against public API |
| Alvys Dispatch | `@activepieces/piece-alvys-dispatch` | 2 (stubs) | 0 | needs Tier 2 backend |
| Alvys Billing | `@activepieces/piece-alvys-billing` | 3 (stubs) | 0 | needs Tier 2/3 backend |
| Alvys AI | `@activepieces/piece-alvys-ai` | 2 (stubs) | 0 | needs AI broker |
| Alvys Intelligence | `@activepieces/piece-alvys-intelligence` | classify / route / extract / ask | 0 | self-contained piece runtime |

Action paths shipped against the Alvys Public API (`https://api.alvys.com`). Two new Tier 1 routes (`/Loads/{n}/rate-confirmation`, `/Maintenance`) land in alvysio/backend PRs #34185 (qa) and #34187 (prod, draft).

## 1. Local developer install (the canonical path)

Prerequisites:
- Node 18 / 22 / 24
- Bun (the repo auto-installs it via `tools/scripts/install-bun.js`)
- Docker (for the bundled Postgres + Redis)

```bash
# Clone the fork
git clone git@github.com:alvysio/foundry.git
cd foundry

# Install
bun install

# Bring up Postgres + Redis
docker compose -f docker-compose.dev.yml up -d

# Tell the dev server which custom pieces to load.
# Append `alvys,alvys-dispatch,alvys-billing,alvys-ai,alvys-documents` to AP_DEV_PIECES in .env.dev.
# Example (replace the existing list, do not commit secrets):
#   AP_DEV_PIECES="alvys,alvys-dispatch,alvys-billing,alvys-ai,alvys-documents"

# Start the API + workers + engine + web
npm start
```

After `npm start` you should see in the log:

```
Watching for changes: alvys
Watching for changes: alvys-dispatch
Watching for changes: alvys-billing
Watching for changes: alvys-ai
Watching for changes: alvys-documents
```

Verify the API serves all five pieces:

```bash
curl -s 'http://localhost:3000/api/v1/pieces' \
  | jq 'map(select(.name | contains("alvys"))) | .[] | {name, actions, triggers}'
```

Open the builder at `http://localhost:4200`, sign in with `dev@ap.com` / `12345678`, create a flow, and search for **Alvys** in the step picker — all five pieces show up with the Alvys icon.

## 2. Connecting each piece

Every Alvys piece uses a `SecretText` connection that holds a **single Alvys Public API token** (JWT bearer). One token works across all five pieces — the connection is per-piece because of how Activepieces models auth.

Get the token:

1. Sign in to Alvys.
2. **Settings → Integrations → API**.
3. Generate or copy a Public API token.

Paste the same token into the connection dialog when you first drop an Alvys piece into a flow.

## 3. Deploying to your private Activepieces instance

The pieces are loaded from disk — they are not on the public CDN. Two requirements:

1. Build the piece dists during the image build (`turbo run build` already covers them; the included `package.json` is enough).
2. Set the dev-pieces env on the running API:

```dotenv
# packages/server/api/.env (or your container env)
AP_DEV_PIECES=alvys,alvys-dispatch,alvys-billing,alvys-ai,alvys-documents
# Block inbound piece-catalog sync (optional, but recommended for a fully private install)
AP_PIECES_SYNC_MODE=NONE
```

Restart the API. The same `Watching for changes` log lines should appear.

## 4. Provider prerequisites

| Piece | External dependency | What to configure |
|---|---|---|
| Alvys, Alvys Dispatch, Alvys Billing | Alvys Public API | A Public API token (see above) |
| Alvys AI | Cloudflare AI Gateway + Odin broker | A Cloudflare AI Gateway provider in `/v1/ai-providers`; Odin (`/v1/odin/*`) ships in a separate PR (Odin module) |
| Alvys Intelligence | Alvys Intelligence document endpoint | Document Intelligence Key + Endpoint configured on the connection; the piece talks to it directly from the sandbox |

The token broker design means **customers never see upstream provider keys**. All vendor identity is confined to the piece runtime.

## 5. Webhook triggers

The seven webhook triggers in the `alvys` piece auto-subscribe via the Alvys Webhooks API on flow enable and unsubscribe on disable. No manual webhook setup. The flow's `webhookUrl` is registered on the Alvys side.

| Trigger | Events |
|---|---|
| Tender Event | `tender.accepted`, `tender.cancelled`, `tender.change.accepted`, `tender.rejected`, `tender.invoiced`, `tender.stop.arrived`, `tender.stop.departed`, `tender.stop.eta_updated`, `tender.bid.submitted` |
| Load Event | `load.status.changed`, `load.changed`, `load.document.uploaded`, `load.document.deleted` |
| Trip Event | `trip.status.changed`, `trip.changed`, `trip.document.uploaded`, `trip.document.deleted` |
| Driver / Carrier / Truck / Trailer Event | `<entity>.document.uploaded`, `<entity>.document.deleted` |

## 6. Stays private

- Branch sits in `alvysio/foundry`. Nothing publishes to npm or `cloud.activepieces.com`.
- `pieceSyncService` only **downloads** from `cloud.activepieces.com`; it never uploads your local pieces.
- Set `AP_PIECES_SYNC_MODE=NONE` if you want to block even inbound sync.

## 7. Where things live

```
packages/pieces/community/
├── alvys/                       # core: 40 actions + 7 triggers + custom API call
├── alvys-ai/                    # token-broker AI (stub)
├── alvys-billing/               # AR/AP, settlements, EDI 210 (stub)
├── alvys-dispatch/              # assign carrier, status, check-call (stub)
└── alvys-intelligence/         # classify / route / extract / ask — self-contained
```

Each piece exposes its auth from `src/index.ts`. The HTTP client wrapper sits in `src/lib/common/client.ts`. Per CLAUDE.md, the brand logo is inlined as a base64 data URI on every piece so the icon renders without any external CDN dependency.

## 8. Backend pairs

| Endpoint | Branch / PR |
|---|---|
| `GET /api/p/v2.0/Loads/{loadNumber}/rate-confirmation` | alvysio/backend PR #34185 (qa), PR #34187 (prod, draft) |
| `POST /api/p/v1.0/Maintenance` | alvysio/backend PR #34185 (qa), PR #34187 (prod, draft) |

Until those merge, the two Tier 1 actions (`Get Rate Confirmation URL`, `Create Maintenance Order`) will 404. Everything else works against the existing public API today.
