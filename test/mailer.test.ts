import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRequest, LockallyMailer, type SendApiLike } from "../src/mailer.ts";

test("buildRequest maps fields, reply-to, and attachments", () => {
  const req = buildRequest({
    from: "alerts@acme.com",
    to: ["user@example.com", "two@example.com"],
    cc: "cc@example.com",
    replyTo: "reply@acme.com",
    subject: "Your code",
    text: "code 123",
    html: "<b>code 123</b>",
    headers: { "X-Campaign": "welcome" },
    attachments: [{ filename: "invoice.pdf", content: "BYTES", contentType: "application/pdf" }],
  });

  assert.equal(req.from, "alerts@acme.com");
  assert.deepEqual(req.to, ["user@example.com", "two@example.com"]);
  assert.deepEqual(req.cc, ["cc@example.com"]);
  assert.equal(req.subject, "Your code");
  assert.equal(req.text, "code 123");
  assert.equal(req.html, "<b>code 123</b>");
  assert.equal(req.headers?.["Reply-To"], "reply@acme.com");
  assert.equal(req.headers?.["X-Campaign"], "welcome");
  assert.equal(req.attachments?.length, 1);
  assert.equal(req.attachments?.[0].filename, "invoice.pdf");
  assert.equal(req.attachments?.[0].contentType, "application/pdf");
  assert.equal(req.attachments?.[0].contentBase64, Buffer.from("BYTES").toString("base64"));
});

test("single string recipient becomes a one-element array", () => {
  const req = buildRequest({ from: "a@acme.com", to: "b@example.com", subject: "hi" });
  assert.deepEqual(req.to, ["b@example.com"]);
  assert.equal(req.cc, undefined);
});

test("mailer.send posts with an idempotency key", async () => {
  const calls: Array<{ idempotencyKey: string; v1SendPostRequest: unknown }> = [];
  const fake: SendApiLike = {
    async v1SendPost(params) {
      calls.push(params);
      return { id: "m_1", status: "queued" };
    },
  };
  const mailer = new LockallyMailer(fake);

  await mailer.send({ from: "a@acme.com", to: "b@example.com", subject: "hi", text: "yo" });

  assert.equal(calls.length, 1);
  assert.match(calls[0].idempotencyKey, /^lk-/);
  assert.equal((calls[0].v1SendPostRequest as { from: string }).from, "a@acme.com");
});
