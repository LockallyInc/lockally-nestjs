import { Configuration, SendApi } from "lockally";
import type { DynamicModule, Provider } from "@nestjs/common";
import { Module } from "@nestjs/common";
import { LockallyMailer, type LockallyOptions } from "./mailer.ts";
import { LockallyService } from "./lockally.service.ts";
import { LOCKALLY_MAILER } from "./tokens.ts";

function buildMailer(options: LockallyOptions): LockallyMailer {
  const config = new Configuration({
    accessToken: options.apiKey,
    ...(options.baseUrl ? { basePath: options.baseUrl.replace(/\/+$/, "") } : {}),
  });
  return new LockallyMailer(new SendApi(config));
}

export interface LockallyModuleAsyncOptions {
  imports?: DynamicModule["imports"];
  inject?: Provider[] | any[];
  useFactory: (...args: any[]) => LockallyOptions | Promise<LockallyOptions>;
}

/**
 * Registers the Lockally mailer and exports {@link LockallyService}.
 *
 *   @Module({ imports: [LockallyModule.forRoot({ apiKey: process.env.LOCKALLY_API_KEY! })] })
 *   export class AppModule {}
 *
 * Then inject `LockallyService` anywhere and call `.send(...)`.
 */
@Module({})
export class LockallyModule {
  static forRoot(options: LockallyOptions): DynamicModule {
    const mailer: Provider = { provide: LOCKALLY_MAILER, useValue: buildMailer(options) };
    return {
      module: LockallyModule,
      providers: [mailer, LockallyService],
      exports: [LockallyService],
    };
  }

  static forRootAsync(options: LockallyModuleAsyncOptions): DynamicModule {
    const mailer: Provider = {
      provide: LOCKALLY_MAILER,
      useFactory: async (...args: any[]) => buildMailer(await options.useFactory(...args)),
      inject: options.inject ?? [],
    };
    return {
      module: LockallyModule,
      imports: options.imports ?? [],
      providers: [mailer, LockallyService],
      exports: [LockallyService],
    };
  }
}
