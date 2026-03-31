import { DataSource } from 'typeorm';
import configs from 'building-blocks/configs/configs';
import { postgresOptions } from '@/data/data-source';

type MigrationCommand = 'run' | 'revert';

const resolveCommand = (): MigrationCommand => {
  const requestedCommand = process.argv[2];
  return requestedCommand === 'revert' ? 'revert' : 'run';
};

async function main(): Promise<void> {
  const command = resolveCommand();
  const migrationDataSource = new DataSource({
    ...postgresOptions,
    migrationsRun: false
  });

  try {
    await migrationDataSource.initialize();

    if (command === 'revert') {
      await migrationDataSource.undoLastMigration({ transaction: 'all' });
    } else {
      await migrationDataSource.runMigrations({ transaction: 'all' });
    }

    console.log(`[${configs.serviceId}] migration ${command} completed`);
  } finally {
    if (migrationDataSource.isInitialized) {
      await migrationDataSource.destroy();
    }
  }
}

void main().catch((error) => {
  console.error(`[${configs.serviceId}] migration failed`, error);
  process.exitCode = 1;
});
