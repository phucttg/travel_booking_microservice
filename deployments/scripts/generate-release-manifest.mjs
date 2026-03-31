import crypto from 'node:crypto';
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

const canonicalize = (value) => {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((accumulator, key) => {
        accumulator[key] = canonicalize(value[key]);
        return accumulator;
      }, {});
  }

  return value;
};

const main = async () => {
  const args = parseArgs();
  const gitSha = args['git-sha'];
  const services = String(args.services || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .sort();
  const imageDigestsFile = args['image-digests-file'];
  const outputFile = args.output || 'release-manifest.json';

  if (!gitSha) {
    throw new Error('Missing required --git-sha argument');
  }

  if (!imageDigestsFile) {
    throw new Error('Missing required --image-digests-file argument');
  }

  const imageDigests = JSON.parse(await fs.readFile(imageDigestsFile, 'utf8'));
  const orderedImageDigests = services.reduce((accumulator, serviceName) => {
    if (imageDigests[serviceName]) {
      accumulator[serviceName] = imageDigests[serviceName];
    }
    return accumulator;
  }, {});

  const manifestCore = {
    gitSha,
    services,
    imageDigests: orderedImageDigests,
    migratableServices: services.filter((serviceName) => serviceName !== 'frontend'),
    createdAt: new Date().toISOString()
  };

  const manifestSha = crypto
    .createHash('sha256')
    .update(JSON.stringify(canonicalize(manifestCore)))
    .digest('hex');

  const manifest = {
    manifestSha,
    ...manifestCore
  };

  await fs.writeFile(outputFile, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
};

await main();
