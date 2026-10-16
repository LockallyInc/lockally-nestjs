import { Inject, Injectable } from "@nestjs/common";
import { LockallyMailer, type SendEmailOptions } from "./mailer.ts";
import { LOCKALLY_MAILER } from "./tokens.ts";

/** Injectable service that sends transactional email through Lockally. */
@Injectable()
export class LockallyService {
  constructor(@Inject(LOCKALLY_MAILER) private readonly mailer: LockallyMailer) {}

  /** Send one message. Resolves with the API's 202 response. */
  send(options: SendEmailOptions): Promise<unknown> {
    return this.mailer.send(options);
  }
}
