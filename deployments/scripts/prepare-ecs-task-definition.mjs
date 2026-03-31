import fs from 'node:fs/promises';

const parseArgs = () => {
  const args = process.argv.slice(2);
  const result = {};

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (!current.startsWith('--')) {
      continue;
    }

    result[current.slice(2)] = args[index + 1];
    index += 1;
  }

  return result;
};

const stripTaskDefinitionMetadata = (taskDefinition) => {
  const {
    taskDefinitionArn,
    revision,
    status,
    requiresAttributes,
    compatibilities,
    registeredAt,
    registeredBy,
    deregisteredAt,
    ...sanitized
  } = taskDefinition;

  return sanitized;
};

const upsertEnvironmentValue = (containerDefinition, name, value) => {
  const environment = Array.isArray(containerDefinition.environment)
    ? [...containerDefinition.environment]
    : [];
  const existingIndex = environment.findIndex((entry) => entry.name === name);

  if (existingIndex >= 0) {
    environment[existingIndex] = {
      ...environment[existingIndex],
      value
    };
  } else {
    environment.push({ name, value });
  }

  return {
    ...containerDefinition,
    environment
  };
};

const main = async () => {
  const args = parseArgs();
  const inputFile = args.input;
  const outputFile = args.output;
  const serviceName = args.service;
  const image = args.image;
  const appEnv = args['app-env'];

  if (!inputFile || !outputFile || !serviceName || !image || !appEnv) {
    throw new Error('Missing required arguments for task definition preparation');
  }

  const rawTaskDefinition = JSON.parse(await fs.readFile(inputFile, 'utf8'));
  const taskDefinition =
    rawTaskDefinition.taskDefinition && typeof rawTaskDefinition.taskDefinition === 'object'
      ? rawTaskDefinition.taskDefinition
      : rawTaskDefinition;

  const sanitizedTaskDefinition = stripTaskDefinitionMetadata(taskDefinition);
  const containerDefinitions = Array.isArray(sanitizedTaskDefinition.containerDefinitions)
    ? sanitizedTaskDefinition.containerDefinitions
    : [];
  const targetIndex = containerDefinitions.findIndex(
    (containerDefinition) => containerDefinition.name === serviceName
  );

  if (targetIndex < 0) {
    throw new Error(`Unable to locate container definition named "${serviceName}"`);
  }

  let targetContainer = {
    ...containerDefinitions[targetIndex],
    image
  };

  targetContainer = upsertEnvironmentValue(targetContainer, 'APP_ENV', appEnv);

  if (serviceName !== 'frontend') {
    targetContainer = upsertEnvironmentValue(targetContainer, 'POSTGRES_MIGRATIONS_RUN', 'false');
    targetContainer = upsertEnvironmentValue(targetContainer, 'BOOTSTRAP_SEED_ENABLED', 'false');
  }

  const nextContainerDefinitions = [...containerDefinitions];
  nextContainerDefinitions[targetIndex] = targetContainer;

  await fs.writeFile(
    outputFile,
    `${JSON.stringify(
      {
        ...sanitizedTaskDefinition,
        containerDefinitions: nextContainerDefinitions
      },
      null,
      2
    )}\n`,
    'utf8'
  );
};

await main();
