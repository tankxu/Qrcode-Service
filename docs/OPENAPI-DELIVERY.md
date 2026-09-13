# PandaQR developer API

The service and marketing website are separate repositories. This change adds `/api/v1` and `/developer` in Qrcode-Service and `/docs/api/` in qrcode-website.

## Validation

```sh
npm ci
npm test
npm run lint
npm run check:worker
npm run generate:openapi
npm run build
```

Tests use a real local Workers runtime with disposable D1, R2 and KV. They cover sessions vs bearer auth, same-origin token management, ownership, single-QR tokens, scopes, idempotency, pagination, image replacement and live scan rendering, malformed uploads, limits, token expiration and revocation. No production credentials are used.

For browser QA, `npm run build && npx tsx scripts/preview-local.ts` serves a disposable fixture on `127.0.0.1:8788/developer`. It automatically authenticates requests as a synthetic user, binds loopback only, and must never be deployed or exposed through a tunnel. Its temporary token is written mode 0600 under `/tmp/pandaqr-preview-token`.

## Artifacts

- `public/openapi.json`: generated from the request validation schemas plus the public response contract.
- `public/skills/pandaqr/`: portable skill and dependency-free Python client.
- `public/skills/pandaqr.zip`: installable skill bundle.
- `public/shortcuts/PandaQR-Update-Image.shortcut`: Apple-signed shortcut with import questions for token and QR id.
- `scripts/generate-shortcut.py`: reproducible unsigned workflow source. Sign on macOS using `shortcuts sign --mode anyone --input public/shortcuts/PandaQR-Update-Image.unsigned.shortcut --output public/shortcuts/PandaQR-Update-Image.shortcut`.
- `python3 scripts/package-integrations.py --website ../qrcode-website` packages the skill and synchronizes the versioned public downloads with the marketing repo. Rebuild both sites afterward.

## Deployment order

1. Apply `0005_openapi.sql` to the existing D1 database before deploying this Worker (`npm run migrate:remote`). The migration is additive; the previous Worker can continue running with it.
2. Build and deploy the Worker with existing bindings and secrets. No new secret is required. `npm run deploy` performs migration, build and deployment.
3. Deploy the marketing website after the Worker is available. Its docs link to the production `/developer` dashboard.
4. Verify a dedicated test token and image QR in production, including revocation, unchanged scan URL, and a fresh scan showing the new image.
5. Import the signed shortcut on iPhone, configure a QR-restricted token, choose a test image and verify the scan page. macOS import/inspection is not a substitute for this device check.

Rollback: roll back the Worker deployment and leave additive tables in place. Remove the docs navigation if rolling back the API. Do not drop token data during rollback.

## Operational behavior

- API requests are bearer-only. Browser sessions manage tokens and cannot call v1. Tokens cannot create more tokens.
- 256-bit random secrets are stored only as SHA-256 hashes, with scopes, expiry and optional QR restriction. Revocation is read directly from D1 each request.
- Rate limiting uses an atomic D1 counter: 60 authenticated requests/minute/token. This is not billing or a subscription entitlement system.
- Audit rows omit body/secret and are retained 90 days. A scheduled sweep removes expired 24-hour idempotency rows.
- Idempotency preserves uncertain reservations rather than blindly repeating a mutation; clients must inspect state after an uncertain result. Replays count toward rate limits.
- Scan pages now read D1 directly and return `Cache-Control: no-store`. This increases D1 reads but avoids stale KV targets and long stale browser content after updates. Existing browser caches may survive their old cache lifetime until refreshed.
- Images are immutable objects. Shared images are no longer immediately deleted when a QR changes or is removed. Reference-aware garbage collection and account storage/billing quotas are not implemented; watch storage usage before opening high-volume paid plans.
- Image uploads accept PNG/JPEG/WebP signatures up to 2 MiB; this is signature validation, not a full image decoder or malware scanner.
- v1 does not enable browser cross-origin CORS. Server-side agents, curl and Apple Shortcuts can use it directly.

## Verification recorded for this delivery

- Nine Workers-runtime integration groups passed, including real local D1/R2 and the rendered scan response.
- Frontend and Worker TypeScript checks passed; Vite build and Wrangler deployment dry run passed.
- Marketing Astro check/build passed. Browser QA covered desktop and 390px mobile widths, no page overflow or broken images, and the token creation/dismissal flow with a synthetic local account.
- OpenAPI 3.1 was checked with `openapi-spec-validator`; the skill passed `quick_validate.py`. The Python client exercised list/get/create/upload/update/replace-image against the disposable API.
- The Apple-signed Shortcut imported successfully on macOS. The editor recognizes Select Photos, JPEG conversion, PUT with File body, and Quick Look of Contents of URL. iPhone photo selection and the production API have not been exercised.
- Compatible dependency updates reduced the service's production dependency audit to no high/critical findings. The separately hosted, statically built marketing site still has upstream Astro/sharp findings that require a separate major-version migration; do not treat the compatibility update as a complete security audit.
- Production D1 migration, production deployment and real-account token issuance have not been performed.
