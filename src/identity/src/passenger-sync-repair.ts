import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { OpenTelemetryModule } from 'building-blocks/openTelemetry/opentelemetry.module';
import { PassengerSyncRepairModule } from '@/tools/passenger-sync-repair.module';
import { PassengerSyncRepairService } from '@/tools/passenger-sync-repair.service';

type ParsedArgs = {
  userId?: number;
  all: boolean;
};

const parseArgs = (argv: string[]): ParsedArgs => {
  const parsed: ParsedArgs = {
    all: argv.includes('--all')
  };

  const userIdArg = argv.find((arg) => arg.startsWith('--userId='));
  if (userIdArg) {
    parsed.userId = Number(userIdArg.split('=')[1]);
  }

  return parsed;
};

async function bootstrap() {
  OpenTelemetryModule.start();
  const args = parseArgs(process.argv.slice(2));

  if ((args.all && args.userId) || (!args.all && !args.userId)) {
    throw new Error('Use either --all or --userId=<id>.');
  }

  const app = await NestFactory.createApplicationContext(PassengerSyncRepairModule, {
    logger: ['log', 'warn', 'error']
  });

  try {
    const repairService = app.get(PassengerSyncRepairService);
    const result = await repairService.repair(args);
    Logger.log(
      `Passenger sync repair completed. Mode=${result.mode}; published=${result.publishedCount}; userIds=${result.userIds.join(',') || 'none'}.`
    );
  } finally {
    await app.close();
  }
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  Logger.error(`Passenger sync repair failed: ${message}`);
  process.exitCode = 1;
});
