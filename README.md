# @lockally/nestjs

Official [Lockally](https://lockally.com) module for NestJS. Register `LockallyModule`
and inject `LockallyService` to send transactional email from any provider or controller.

## Install

```bash
npm install @lockally/nestjs
```

## Register

```ts
import { Module } from "@nestjs/common";
import { LockallyModule } from "@lockally/nestjs";

@Module({
  imports: [
    LockallyModule.forRoot({ apiKey: process.env.LOCKALLY_API_KEY! }),
    //                       lk_test_… runs in sandbox, lk_live_… sends real mail
  ],
})
export class AppModule {}
```

Async configuration (e.g. from `ConfigService`):

```ts
LockallyModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({ apiKey: config.getOrThrow("LOCKALLY_API_KEY") }),
});
```

## Send

```ts
import { Injectable } from "@nestjs/common";
import { LockallyService } from "@lockally/nestjs";

@Injectable()
export class SignupService {
  constructor(private readonly lockally: LockallyService) {}

  async welcome(email: string) {
    await this.lockally.send({
      from: "alerts@yourdomain.com",
      to: email,
      subject: "Welcome",
      html: "<b>Thanks for signing up.</b>",
      replyTo: "support@yourdomain.com",
    });
  }
}
```

`to`/`cc`/`bcc`/`replyTo` accept a string or a string array. Attachments are
`{ filename, content, contentType }` where `content` is a `Buffer`, `Uint8Array`, or
string.

### Mapping notes

- **Reply-To** is sent as a header (Lockally has no `reply_to` field).
- **Attachments** are base64-encoded as `{ filename, contentType, contentBase64 }`.
- One `Idempotency-Key` is generated per send (24 h dedupe window).

## License

MIT © Lockally
