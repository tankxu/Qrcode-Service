# PandaQR

Dynamic QR service for https://app.pandaqr.xyz, built with React, Hono and Cloudflare Workers (D1 + R2).

```sh
npm ci
cp .dev.vars.example .dev.vars
# Configure Google OAuth and local JWT settings in .dev.vars
npm run migrate:local
npm run dev
```

API and integration implementation, validation and deployment order: [docs/OPENAPI-DELIVERY.md](docs/OPENAPI-DELIVERY.md).

The marketing/docs site lives in `tankxu/qrcode-website`. The versioned contract is `public/openapi.json`; the dashboard manages access tokens at `/developer`.
