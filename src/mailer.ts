// Core Email -> POST /v1/send mapping, shared by the middleware. Depends on the
// `lockally` client only for TYPES (erased at runtime), and takes an injectable
// SendApi so this module is unit-testable without the published package.
import type { V1SendPostRequest, V1SendPostRequestAttachmentsInner } from "lockally";
import { randomUUID } from "node:crypto";

export interface LockallyOptions {
  /** Lockally API key. `lk_test_…` runs in sandbox, `lk_live_…` sends real mail. */
  apiKey: string;
  /** Optional base URL override (e.g. a private endpoint). */
  baseUrl?: string;
}

export interface Attachment {
  filename: string;
  content: Buffer | Uint8Array | string;
  contentType?: string;
}

export interface SendEmailOptions {
  from: string;
  to: string | string[];
  subject?: string;
  text?: string;
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
  /** Sent as a `Reply-To` header — Lockally has no reply_to field. */
  replyTo?: string | string[];
  headers?: Record<string, string>;
  attachments?: Attachment[];
}

/** The slice of the generated `SendApi` the mailer uses (injectable for tests). */
export interface SendApiLike {
  v1SendPost(requestParameters: {
    idempotencyKey: string;
    v1SendPostRequest: V1SendPostRequest;
  }): Promise<unknown>;
}

export class LockallyMailer {
  private readonly api: SendApiLike;

  constructor(api: SendApiLike) {
    this.api = api;
  }

  /** Send one message. Resolves with the API's 202 response. */
  send(options: SendEmailOptions): Promise<unknown> {
    return this.api.v1SendPost({
      // One idempotency key per logical send (required header, 24 h dedupe window).
      idempotencyKey: "lk-" + randomUUID().replace(/-/g, ""),
      v1SendPostRequest: buildRequest(options),
    });
  }
}

/** Map send options onto the /v1/send request body. Exported for unit testing. */
export function buildRequest(o: SendEmailOptions): V1SendPostRequest {
  const headers: Record<string, string> = { ...(o.headers ?? {}) };
  if (o.replyTo) {
    headers["Reply-To"] = asList(o.replyTo).join(", ");
  }

  const req: V1SendPostRequest = {
    from: o.from,
    to: asList(o.to),
  };
  if (o.cc) req.cc = asList(o.cc);
  if (o.bcc) req.bcc = asList(o.bcc);
  if (o.subject !== undefined) req.subject = o.subject;
  if (o.text !== undefined) req.text = o.text;
  if (o.html !== undefined) req.html = o.html;
  if (Object.keys(headers).length > 0) req.headers = headers;
  if (o.attachments && o.attachments.length > 0) {
    req.attachments = o.attachments.map(
      (a): V1SendPostRequestAttachmentsInner => ({
        filename: a.filename,
        contentType: a.contentType ?? "application/octet-stream",
        contentBase64: toBase64(a.content),
      }),
    );
  }
  return req;
}

function asList(value: string | string[]): string[] {
  return Array.isArray(value) ? value : [value];
}

function toBase64(content: Buffer | Uint8Array | string): string {
  if (typeof content === "string") return Buffer.from(content, "utf8").toString("base64");
  return Buffer.from(content).toString("base64");
}
