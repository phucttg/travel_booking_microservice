#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const BOOKING_STATUS_CONFIRMED = 1;
const SEAT_STATE_BOOKED = 2;
const DEFAULT_BATCH_SIZE = Number(process.env.SEAT_BACKFILL_BATCH_SIZE || 500);

function parseArgs(argv) {
  const args = {
    apply: false,
    verbose: false,
    limit: null,
    reportFile: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--apply') {
      args.apply = true;
      continue;
    }

    if (token === '--verbose') {
      args.verbose = true;
      continue;
    }

    if (token === '--limit') {
      args.limit = Number(argv[index + 1]);
      index += 1;
      continue;
    }

    if (token === '--report-file') {
      args.reportFile = argv[index + 1];
      index += 1;
    }
  }

  if (args.limit !== null && (!Number.isInteger(args.limit) || args.limit <= 0)) {
    throw new Error('--limit must be a positive integer');
  }

  return args;
}

function getEnv(keys, options = {}) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }

  if (options.required) {
    throw new Error(`Missing required environment variable. Tried: ${keys.join(', ')}`);
  }

  return options.defaultValue;
}

function getBooleanEnv(keys, defaultValue = false) {
  const rawValue = getEnv(keys, { defaultValue: String(defaultValue) });
  return ['1', 'true', 'yes', 'on'].includes(String(rawValue).toLowerCase());
}

function resolveDatabaseConfig(prefix, options = {}) {
  const genericKeys = options.allowGenericFallback ? ['POSTGRES'] : [];
  const keyGroup = (suffix, aliases = []) => [
    `${prefix}_${suffix}`,
    ...aliases.map((alias) => `${prefix}_${alias}`),
    ...genericKeys.map((genericPrefix) => `${genericPrefix}_${suffix}`)
  ];

  return {
    host: getEnv(keyGroup('POSTGRES_HOST', ['DB_HOST']), { required: true }),
    port: Number(getEnv(keyGroup('POSTGRES_PORT', ['DB_PORT']), { defaultValue: '5432' })),
    user: getEnv(keyGroup('POSTGRES_USERNAME', ['DB_USER', 'DB_USERNAME']), { required: true }),
    password: getEnv(keyGroup('POSTGRES_PASSWORD', ['DB_PASSWORD']), { required: true }),
    database: getEnv(
      keyGroup('POSTGRES_Database', ['POSTGRES_DATABASE', 'DB_DATABASE', 'DB_NAME']),
      {
        required: true
      }
    ),
    ssl: getBooleanEnv(keyGroup('POSTGRES_SSL', ['DB_SSL']), false)
      ? {
          rejectUnauthorized: getBooleanEnv(
            keyGroup('POSTGRES_SSL_REJECT_UNAUTHORIZED', ['DB_SSL_REJECT_UNAUTHORIZED']),
            true
          )
        }
      : false
  };
}

function chunk(list, size) {
  const chunks = [];
  for (let index = 0; index < list.length; index += size) {
    chunks.push(list.slice(index, index + size));
  }
  return chunks;
}

function createReport(args) {
  return {
    mode: args.apply ? 'apply' : 'dry-run',
    generatedAt: new Date().toISOString(),
    counts: {
      confirmedBookingsScanned: 0,
      uniqueSeatCandidates: 0,
      ambiguousSeatKeys: 0,
      eligibleForBackfill: 0,
      updated: 0,
      alreadyLinked: 0,
      missingSeat: 0,
      nonBookedSeat: 0,
      conflictingReservedBookingId: 0
    },
    ambiguousSeatKeys: [],
    missingSeat: [],
    nonBookedSeat: [],
    conflictingReservedBookingId: [],
    eligibleForBackfill: [],
    updated: [],
    alreadyLinked: []
  };
}

function createSeatKey(flightId, seatNumber) {
  return `${flightId}:${String(seatNumber).trim().toUpperCase()}`;
}

async function fetchConfirmedBookings(client, limit) {
  const params = [BOOKING_STATUS_CONFIRMED];
  let query = `
    SELECT
      "id",
      "flightId",
      UPPER(TRIM("seatNumber")) AS "seatNumber",
      "confirmedAt"
    FROM "booking"
    WHERE "bookingStatus" = $1
      AND "flightId" IS NOT NULL
      AND "seatNumber" IS NOT NULL
    ORDER BY "confirmedAt" ASC NULLS LAST, "id" ASC
  `;

  if (limit) {
    params.push(limit);
    query += ' LIMIT $2';
  }

  const result = await client.query(query, params);
  return result.rows.map((row) => ({
    id: Number(row.id),
    flightId: Number(row.flightId),
    seatNumber: row.seatNumber,
    confirmedAt: row.confirmedAt
  }));
}

function partitionBookings(bookings, report) {
  const bookingsBySeat = new Map();

  for (const booking of bookings) {
    const seatKey = createSeatKey(booking.flightId, booking.seatNumber);
    const list = bookingsBySeat.get(seatKey) || [];
    list.push(booking);
    bookingsBySeat.set(seatKey, list);
  }

  const uniqueCandidates = [];

  for (const [seatKey, groupedBookings] of bookingsBySeat.entries()) {
    if (groupedBookings.length > 1) {
      report.ambiguousSeatKeys.push({
        seatKey,
        bookingIds: groupedBookings.map((booking) => booking.id)
      });
      continue;
    }

    uniqueCandidates.push(groupedBookings[0]);
  }

  report.counts.confirmedBookingsScanned = bookings.length;
  report.counts.uniqueSeatCandidates = uniqueCandidates.length;
  report.counts.ambiguousSeatKeys = report.ambiguousSeatKeys.length;

  return uniqueCandidates;
}

async function fetchFlightSeats(client, candidates) {
  const seatMap = new Map();
  const batches = chunk(candidates, DEFAULT_BATCH_SIZE);

  for (const batch of batches) {
    const flightIds = batch.map((candidate) => candidate.flightId);
    const seatNumbers = batch.map((candidate) => candidate.seatNumber);
    const result = await client.query(
      `
        SELECT
          "id",
          "flightId",
          UPPER(TRIM("seatNumber")) AS "seatNumber",
          "seatState",
          "reservedBookingId"
        FROM "seat"
        INNER JOIN UNNEST($1::int[], $2::text[]) AS input("flightId", "seatNumber")
          ON "seat"."flightId" = input."flightId"
         AND UPPER(TRIM("seat"."seatNumber")) = input."seatNumber"
      `,
      [flightIds, seatNumbers]
    );

    for (const row of result.rows) {
      seatMap.set(createSeatKey(row.flightId, row.seatNumber), {
        id: Number(row.id),
        flightId: Number(row.flightId),
        seatNumber: row.seatNumber,
        seatState: Number(row.seatState),
        reservedBookingId:
          row.reservedBookingId === null || row.reservedBookingId === undefined
            ? null
            : Number(row.reservedBookingId)
      });
    }
  }

  return seatMap;
}

function classifyCandidates(candidates, seatMap, report) {
  const eligible = [];

  for (const candidate of candidates) {
    const seatKey = createSeatKey(candidate.flightId, candidate.seatNumber);
    const seat = seatMap.get(seatKey);

    if (!seat) {
      report.missingSeat.push(candidate);
      continue;
    }

    if (seat.seatState !== SEAT_STATE_BOOKED) {
      report.nonBookedSeat.push({
        ...candidate,
        seatState: seat.seatState
      });
      continue;
    }

    if (seat.reservedBookingId === candidate.id) {
      report.alreadyLinked.push(candidate);
      continue;
    }

    if (seat.reservedBookingId !== null) {
      report.conflictingReservedBookingId.push({
        ...candidate,
        existingReservedBookingId: seat.reservedBookingId
      });
      continue;
    }

    eligible.push(candidate);
  }

  report.counts.eligibleForBackfill = eligible.length;
  report.counts.alreadyLinked = report.alreadyLinked.length;
  report.counts.missingSeat = report.missingSeat.length;
  report.counts.nonBookedSeat = report.nonBookedSeat.length;
  report.counts.conflictingReservedBookingId = report.conflictingReservedBookingId.length;

  return eligible;
}

async function applyBackfill(client, eligible, report, verbose) {
  if (!eligible.length) {
    return;
  }

  await client.query('BEGIN');

  try {
    for (const candidate of eligible) {
      const result = await client.query(
        `
          UPDATE "seat"
          SET "reservedBookingId" = $3,
              "updatedAt" = CURRENT_TIMESTAMP
          WHERE "flightId" = $1
            AND UPPER(TRIM("seatNumber")) = $2
            AND "seatState" = $4
            AND "reservedBookingId" IS NULL
          RETURNING "id"
        `,
        [candidate.flightId, candidate.seatNumber, candidate.id, SEAT_STATE_BOOKED]
      );

      if (result.rowCount === 1) {
        report.updated.push(candidate);
        if (verbose) {
          console.log(
            `[updated] booking ${candidate.id} -> flight ${candidate.flightId} seat ${candidate.seatNumber}`
          );
        }
      } else {
        report.conflictingReservedBookingId.push({
          ...candidate,
          existingReservedBookingId: 'changed_during_backfill'
        });
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }

  report.counts.updated = report.updated.length;
  report.counts.conflictingReservedBookingId = report.conflictingReservedBookingId.length;
}

function printUsage() {
  console.log('Usage: npm run backfill:seat-booking-links -- [--apply] [--limit N] [--report-file path] [--verbose]');
  console.log('Required env vars:');
  console.log('  BOOKING_POSTGRES_HOST / BOOKING_POSTGRES_PORT / BOOKING_POSTGRES_USERNAME / BOOKING_POSTGRES_PASSWORD / BOOKING_POSTGRES_Database');
  console.log('  FLIGHT_POSTGRES_HOST / FLIGHT_POSTGRES_PORT / FLIGHT_POSTGRES_USERNAME / FLIGHT_POSTGRES_PASSWORD / FLIGHT_POSTGRES_Database');
  console.log('Booking env may fall back to generic POSTGRES_* values when running inside the booking service environment.');
}

async function main() {
  if (process.argv.includes('--help')) {
    printUsage();
    return;
  }

  const args = parseArgs(process.argv.slice(2));
  const report = createReport(args);
  const bookingClient = new Client(resolveDatabaseConfig('BOOKING', { allowGenericFallback: true }));
  const flightClient = new Client(resolveDatabaseConfig('FLIGHT'));

  await bookingClient.connect();
  await flightClient.connect();

  try {
    const confirmedBookings = await fetchConfirmedBookings(bookingClient, args.limit);
    const uniqueCandidates = partitionBookings(confirmedBookings, report);
    const seatMap = await fetchFlightSeats(flightClient, uniqueCandidates);
    const eligibleCandidates = classifyCandidates(uniqueCandidates, seatMap, report);

    report.eligibleForBackfill = eligibleCandidates;

    if (args.apply) {
      await applyBackfill(flightClient, eligibleCandidates, report, args.verbose);
    }

    const serializedReport = JSON.stringify(report, null, 2);
    console.log(serializedReport);

    if (args.reportFile) {
      const reportPath = path.resolve(process.cwd(), args.reportFile);
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, `${serializedReport}\n`, 'utf8');
      console.log(`Report written to ${reportPath}`);
    }
  } finally {
    await Promise.allSettled([bookingClient.end(), flightClient.end()]);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
