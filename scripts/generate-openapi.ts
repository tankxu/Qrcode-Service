import { z } from "zod";
import { writeFileSync } from "node:fs";
import {
  createQrInputSchema,
  updateQrInputSchema,
} from "../worker/lib/schemas";
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const error = {
  description: "API error; use error.code and X-Request-Id",
  content: { "application/json": { schema: ref("Error") } },
};
const envelope = (properties: object, required: string[]) => ({
  type: "object",
  required: ["ok", "data"],
  properties: {
    ok: { const: true },
    data: { type: "object", required, properties },
  },
});
const response = (name: string, status = 200) => ({
  [status]: {
    description: "Success",
    content: { "application/json": { schema: ref(name) } },
  },
  "400": error,
  "401": error,
  "403": error,
  "404": error,
  "409": error,
  "413": error,
  "415": error,
  "429": {
    ...error,
    headers: {
      "Retry-After": {
        schema: { type: "integer" },
        description: "Seconds until retry",
      },
    },
  },
  "500": error,
});
const json = (name: string) => ({
  required: true,
  content: { "application/json": { schema: ref(name) } },
});
const id = {
  name: "id",
  in: "path",
  required: true,
  description: "QR id (not its short slug)",
  schema: { type: "string" },
};
const key = {
  name: "Idempotency-Key",
  in: "header",
  description:
    "Optional unique key; same exact request replays for 24 hours. Different payload returns 409. Reuse exact bytes and Content-Type, including multipart boundary.",
  schema: { type: "string", maxLength: 128, pattern: "^[A-Za-z0-9._:-]+$" },
};
const upload = {
  required: true,
  content: Object.fromEntries(
    ["image/png", "image/jpeg", "image/webp", "application/octet-stream"]
      .map((t) => [t, { schema: { type: "string", format: "binary" } }])
      .concat([
        [
          "multipart/form-data",
          {
            schema: {
              type: "object",
              required: ["file"],
              properties: { file: { type: "string", format: "binary" } },
            },
          },
        ],
      ] as any),
  ),
};
const qr = {
  type: "object",
  required: [
    "id",
    "slug",
    "scan_url",
    "target",
    "status",
    "created_at",
    "updated_at",
  ],
  properties: {
    id: { type: "string" },
    slug: { type: "string" },
    scan_url: { type: "string", format: "uri" },
    title: { type: ["string", "null"] },
    description: { type: ["string", "null"] },
    note: { type: ["string", "null"] },
    status: { enum: ["active", "paused"] },
    target: (z.toJSONSchema(createQrInputSchema) as any).properties.target,
    expiry: { type: "object" },
    scan_total: { type: "integer" },
    last_scan_at: { type: ["integer", "null"] },
    created_at: { type: "integer", description: "Unix milliseconds" },
    updated_at: { type: "integer", description: "Unix milliseconds" },
  },
};
const op = (
  operationId: string,
  summary: string,
  requiredScopes: string[],
  result: string,
  parameters: any[] = [],
  requestBody?: object,
  status = 200,
) => ({
  operationId,
  summary,
  description: `Required scopes: ${requiredScopes.join(", ")}. Account ownership is always enforced.`,
  tags: ["QR codes"],
  parameters,
  ...(requestBody ? { requestBody } : {}),
  responses: response(result, status),
});
const spec = {
  openapi: "3.1.0",
  info: {
    title: "PandaQR API",
    version: "1.0.0",
    description:
      "Permanent QR codes with replaceable content. Bearer tokens from the Developer dashboard. 60 requests/minute/token. Times are Unix milliseconds. Maximum image size: 2 MiB. HTTPS only in production.",
  },
  servers: [{ url: "https://app.pandaqr.xyz/api/v1" }],
  security: [{ bearerAuth: [] }],
  paths: {
    "/qrs": {
      get: op("listQrs", "List QR codes", ["qrs:read"], "QrList", [
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
        },
        {
          name: "cursor",
          in: "query",
          schema: { type: "string" },
          description: "next_cursor from previous page; descending QR id order",
        },
      ]),
      post: op(
        "createQr",
        "Create a dynamic QR",
        ["qrs:write"],
        "QrResponse",
        [key],
        json("CreateQr"),
        201,
      ),
    },
    "/qrs/{id}": {
      parameters: [id],
      get: op("getQr", "Get a QR", ["qrs:read"], "QrResponse"),
      patch: op(
        "updateQr",
        "Update content or settings",
        ["qrs:write"],
        "QrResponse",
        [key],
        json("UpdateQr"),
      ),
      delete: op(
        "deleteQr",
        "Permanently delete a QR",
        ["qrs:delete"],
        "DeleteResponse",
        [key],
      ),
    },
    "/images": {
      post: op(
        "uploadImage",
        "Upload an image for creating or updating a QR",
        ["images:write"],
        "ImageResponse",
        [key],
        upload,
        201,
      ),
    },
    "/qrs/{id}/image": {
      parameters: [id],
      put: op(
        "replaceQrImage",
        "Replace an image QR in one request",
        ["qrs:write", "images:write"],
        "QrResponse",
        [key],
        upload,
      ),
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "pqr_live_…",
      },
    },
    schemas: {
      CreateQr: z.toJSONSchema(createQrInputSchema.strict()),
      UpdateQr: {
        ...z.toJSONSchema(updateQrInputSchema.strict()),
        minProperties: 1,
      },
      Qr: qr,
      QrResponse: envelope({ qr: ref("Qr") }, ["qr"]),
      QrList: envelope(
        {
          qrs: { type: "array", items: ref("Qr") },
          next_cursor: { type: ["string", "null"] },
        },
        ["qrs", "next_cursor"],
      ),
      ImageResponse: envelope(
        {
          image: {
            type: "object",
            required: ["r2_key", "mime", "size", "public_url"],
            properties: {
              r2_key: { type: "string" },
              mime: { enum: ["image/png", "image/jpeg", "image/webp"] },
              size: { type: "integer" },
              public_url: { type: "string" },
            },
          },
        },
        ["image"],
      ),
      DeleteResponse: envelope({ deleted: { const: true } }, ["deleted"]),
      Error: {
        type: "object",
        required: ["ok", "error"],
        properties: {
          ok: { const: false },
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
    },
  },
};
writeFileSync("public/openapi.json", JSON.stringify(spec, null, 2) + "\n");
