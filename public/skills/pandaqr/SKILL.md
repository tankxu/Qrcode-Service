---
name: pandaqr
description: Create, list and update PandaQR dynamic QR codes, including replacing the displayed group QR image while preserving the permanent scan URL. Use with a PandaQR access token and app.pandaqr.xyz API.
---

# PandaQR

Use `PANDAQR_ACCESS_TOKEN` from the environment. The user creates it at https://app.pandaqr.xyz/developer. Do not print tokens or place them in URLs, committed files or shared shortcut exports. Never send a token to another host. For local testing only, the helper accepts `PANDAQR_BASE_URL=http://127.0.0.1:<port>/api/v1`.

The API contract is https://app.pandaqr.xyz/openapi.json; human docs: https://pandaqr.xyz/docs/api/. Requests use `Authorization: Bearer …`. Success is `{ok:true,data:…}`; failures are `{ok:false,error:{code,message}}`. Log the response `X-Request-Id` for troubleshooting, not authorization headers.

Use the bundled `scripts/pandaqr.py` helper:

- `list`: paginate all accessible QRs. Select by exact id; titles may repeat. Ask the user to disambiguate only if the intended QR is unclear.
- `get QR_ID`: inspect current type, status and scan URL.
- `create INPUT.json`: JSON contains `title` and `target`, e.g. `{"title":"Community","target":{"type":"url","payload":{"url":"https://example.com"}}}`. For an image QR, upload first, then use the returned `r2_key` and `mime` in `target.payload` with `type:"image"`.
- `upload IMAGE`: PNG, JPEG or WebP, maximum 2 MiB. Convert HEIC first.
- `update QR_ID PATCH.json`: modify metadata, expiry, status or target.
- `replace-image QR_ID IMAGE`: one PUT uploads and replaces an existing image QR; requires `qrs:write` and `images:write`. A token restricted to this QR is preferred for repeat automation.

For “update the group QR”, inspect the existing image QR and replace its image; preserve its id/slug. Do not create another QR. Updating resets an enabled expiry countdown but does not reactivate a paused QR. Change status only when requested. Verify with `get` that the id and scan URL are unchanged and the image target changed. Check the scan page if visual verification is available.

The helper sends an Idempotency-Key for mutations and never automatically retries writes. If a response is uncertain, preserve the printed key and inspect the QR before any retry. `--key KEY` reuses a key with identical request bytes for up to 24 hours. A 409 may mean a request is pending/uncertain or a key was reused for different content. A 429 includes Retry-After. A 401 requires a valid replacement token; 403 requires appropriate scopes. Do not work around these using another account or broader credentials.

Deletion is available as `DELETE /qrs/{id}` with `qrs:delete`, only when explicitly requested. It permanently breaks the scan URL.
