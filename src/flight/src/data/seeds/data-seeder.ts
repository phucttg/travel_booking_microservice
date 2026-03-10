import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Aircraft } from '@/aircraft/entities/aircraft.entity';
import { Airport } from '@/airport/entities/airport.entity';
import { Flight } from '@/flight/entities/flight.entity';
import { FlightStatus } from '@/flight/enums/flight-status.enum';
import { Seat } from '@/seat/entities/seat.entity';
import { generateSeatTemplatesForModel } from '@/seat/utils/seat-layout';

type AirportSeed = {
  code: string;
  name: string;
  address: string;
};

type AircraftSeed = {
  name: string;
  model: string;
  manufacturingYear: number;
};

type FlightSeed = {
  flightNumber: string;
  departureCode: string;
  arriveCode: string;
  aircraftModel: string;
  price: number;
  offsetDays: number;
  departureTime: string;
  arriveTime: string;
  flightStatus: FlightStatus;
};

@Injectable()
export class DataSeeder {
  constructor(private readonly entityManager: EntityManager) {}

  private readonly airportSeeds: AirportSeed[] = [
    {
      code: 'SGN',
      name: 'Tan Son Nhat International Airport',
      address: 'Ho Chi Minh City'
    },
    {
      code: 'HAN',
      name: 'Noi Bai International Airport',
      address: 'Hanoi'
    },
    {
      code: 'DAD',
      name: 'Da Nang International Airport',
      address: 'Da Nang'
    },
    {
      code: 'CXR',
      name: 'Cam Ranh International Airport',
      address: 'Nha Trang'
    },
    {
      code: 'PQC',
      name: 'Phu Quoc International Airport',
      address: 'Phu Quoc'
    },
    {
      code: 'HUI',
      name: 'Phu Bai International Airport',
      address: 'Hue'
    },
    {
      code: 'DLI',
      name: 'Lien Khuong Airport',
      address: 'Da Lat'
    },
    {
      code: 'VCA',
      name: 'Can Tho International Airport',
      address: 'Can Tho'
    },
    {
      code: 'HPH',
      name: 'Cat Bi International Airport',
      address: 'Hai Phong'
    },
    {
      code: 'VII',
      name: 'Vinh International Airport',
      address: 'Vinh'
    }
  ];

  private readonly aircraftSeeds: AircraftSeed[] = [
    {
      name: 'Airbus A320',
      model: 'A320',
      manufacturingYear: 2015
    },
    {
      name: 'Airbus A321neo',
      model: 'A321',
      manufacturingYear: 2019
    },
    {
      name: 'Boeing 787-9 Dreamliner',
      model: 'B787',
      manufacturingYear: 2018
    },
    {
      name: 'ATR 72-600',
      model: 'AT72',
      manufacturingYear: 2016
    },
    {
      name: 'Airbus A330-300',
      model: 'A333',
      manufacturingYear: 2014
    },
    {
      name: 'Airbus A320neo',
      model: 'A20N',
      manufacturingYear: 2021
    }
  ];

  private readonly flightSeeds: FlightSeed[] = [
    {
      flightNumber: 'VN120',
      departureCode: 'HAN',
      arriveCode: 'SGN',
      aircraftModel: 'B787',
      price: 2450000,
      offsetDays: 2,
      departureTime: '06:00',
      arriveTime: '08:10',
      flightStatus: FlightStatus.SCHEDULED
    },
    {
      flightNumber: 'VJ198',
      departureCode: 'SGN',
      arriveCode: 'DAD',
      aircraftModel: 'A320',
      price: 890000,
      offsetDays: 3,
      departureTime: '07:30',
      arriveTime: '08:50',
      flightStatus: FlightStatus.SCHEDULED
    },
    {
      flightNumber: 'VN356',
      departureCode: 'HAN',
      arriveCode: 'DAD',
      aircraftModel: 'A321',
      price: 1200000,
      offsetDays: 4,
      departureTime: '09:00',
      arriveTime: '10:20',
      flightStatus: FlightStatus.SCHEDULED
    },
    {
      flightNumber: 'VJ502',
      departureCode: 'SGN',
      arriveCode: 'CXR',
      aircraftModel: 'A320',
      price: 750000,
      offsetDays: 5,
      departureTime: '10:00',
      arriveTime: '10:55',
      flightStatus: FlightStatus.CANCELED
    },
    {
      flightNumber: 'BL689',
      departureCode: 'SGN',
      arriveCode: 'PQC',
      aircraftModel: 'AT72',
      price: 680000,
      offsetDays: 6,
      departureTime: '11:30',
      arriveTime: '12:25',
      flightStatus: FlightStatus.DELAY
    },
    {
      flightNumber: 'VN1544',
      departureCode: 'HAN',
      arriveCode: 'HUI',
      aircraftModel: 'A20N',
      price: 980000,
      offsetDays: 7,
      departureTime: '14:00',
      arriveTime: '15:10',
      flightStatus: FlightStatus.SCHEDULED
    },
    {
      flightNumber: 'QH202',
      departureCode: 'SGN',
      arriveCode: 'DLI',
      aircraftModel: 'AT72',
      price: 620000,
      offsetDays: 8,
      departureTime: '06:45',
      arriveTime: '07:30',
      flightStatus: FlightStatus.SCHEDULED
    },
    {
      flightNumber: 'VN246',
      departureCode: 'SGN',
      arriveCode: 'HAN',
      aircraftModel: 'A333',
      price: 2680000,
      offsetDays: 9,
      departureTime: '15:00',
      arriveTime: '17:10',
      flightStatus: FlightStatus.SCHEDULED
    },
    {
      flightNumber: 'VJ376',
      departureCode: 'DAD',
      arriveCode: 'SGN',
      aircraftModel: 'A320',
      price: 850000,
      offsetDays: 10,
      departureTime: '18:00',
      arriveTime: '19:20',
      flightStatus: FlightStatus.SCHEDULED
    },
    {
      flightNumber: 'VN560',
      departureCode: 'HAN',
      arriveCode: 'CXR',
      aircraftModel: 'A321',
      price: 1650000,
      offsetDays: 11,
      departureTime: '08:00',
      arriveTime: '09:50',
      flightStatus: FlightStatus.DELAY
    }
  ];

  async seedAsync(): Promise<void> {
    await this.seedAirport();
    await this.seedAircraft();
    await this.seedFlight();
    await this.seedSeats();
  }

  private async seedAircraft(): Promise<void> {
    const aircraftRepository = this.entityManager.getRepository(Aircraft);
    const existingAircrafts = await aircraftRepository.find();
    const existingModels = new Set(existingAircrafts.map((item) => item.model.toUpperCase()));

    const insertPayload = this.aircraftSeeds
      .filter((item) => !existingModels.has(item.model.toUpperCase()))
      .map((item) =>
        new Aircraft({
          name: item.name,
          model: item.model,
          manufacturingYear: item.manufacturingYear
        })
      );

    if (!insertPayload.length) {
      return;
    }

    await aircraftRepository.save(insertPayload);
    Logger.log(`Seeded ${insertPayload.length} aircraft records.`);
  }

  private async seedAirport(): Promise<void> {
    const airportRepository = this.entityManager.getRepository(Airport);
    const existingAirports = await airportRepository.find();
    const existingCodes = new Set(existingAirports.map((item) => item.code.toUpperCase()));

    const insertPayload = this.airportSeeds
      .filter((item) => !existingCodes.has(item.code.toUpperCase()))
      .map((item) =>
        new Airport({
          name: item.name,
          code: item.code,
          address: item.address
        })
      );

    if (!insertPayload.length) {
      return;
    }

    await airportRepository.save(insertPayload);
    Logger.log(`Seeded ${insertPayload.length} airport records.`);
  }

  private async seedFlight(): Promise<void> {
    const flightRepository = this.entityManager.getRepository(Flight);
    const airportRepository = this.entityManager.getRepository(Airport);
    const aircraftRepository = this.entityManager.getRepository(Aircraft);

    const [existingFlights, airports, aircrafts] = await Promise.all([
      flightRepository.find(),
      airportRepository.find(),
      aircraftRepository.find()
    ]);

    const airportIdByCode = new Map(airports.map((item) => [item.code.toUpperCase(), item.id]));
    const aircraftIdByModel = new Map(aircrafts.map((item) => [item.model.toUpperCase(), item.id]));
    const existingFlightKeys = new Set(
      existingFlights.map((item) => `${item.flightNumber}-${this.toDateKey(item.flightDate)}`)
    );

    const insertPayload: Flight[] = [];

    for (const seed of this.flightSeeds) {
      const departureAirportId = airportIdByCode.get(seed.departureCode.toUpperCase());
      const arriveAirportId = airportIdByCode.get(seed.arriveCode.toUpperCase());
      const aircraftId = aircraftIdByModel.get(seed.aircraftModel.toUpperCase());

      if (!departureAirportId || !arriveAirportId || !aircraftId) {
        Logger.warn(`Skip flight seed ${seed.flightNumber}: unresolved airport/aircraft mapping.`);
        continue;
      }

      const flightDate = this.buildDateAtOffset(seed.offsetDays, '00:00');
      const departureDate = this.buildDateAtOffset(seed.offsetDays, seed.departureTime);
      let arriveDate = this.buildDateAtOffset(seed.offsetDays, seed.arriveTime);

      if (arriveDate <= departureDate) {
        arriveDate = new Date(arriveDate.getTime());
        arriveDate.setDate(arriveDate.getDate() + 1);
      }

      const flightKey = `${seed.flightNumber}-${this.toDateKey(flightDate)}`;
      if (existingFlightKeys.has(flightKey)) {
        continue;
      }

      const durationMinutes = Math.round((arriveDate.getTime() - departureDate.getTime()) / 60000);

      insertPayload.push(
        new Flight({
          flightNumber: seed.flightNumber,
          price: seed.price,
          flightStatus: seed.flightStatus,
          flightDate,
          departureDate,
          departureAirportId,
          aircraftId,
          arriveDate,
          arriveAirportId,
          durationMinutes
        })
      );
    }

    if (!insertPayload.length) {
      return;
    }

    await flightRepository.save(insertPayload);
    Logger.log(`Seeded ${insertPayload.length} flight records.`);
  }

  private async seedSeats(): Promise<void> {
    const seatRepository = this.entityManager.getRepository(Seat);
    const flightRepository = this.entityManager.getRepository(Flight);
    const aircraftRepository = this.entityManager.getRepository(Aircraft);

    const [existingSeats, flights, aircrafts] = await Promise.all([
      seatRepository.find(),
      flightRepository.find(),
      aircraftRepository.find()
    ]);

    const targetFlightKeys = new Set(
      this.flightSeeds.map((seed) => {
        const flightDate = this.buildDateAtOffset(seed.offsetDays, '00:00');
        return `${seed.flightNumber}-${this.toDateKey(flightDate)}`;
      })
    );

    const targetFlights = flights.filter((flight) =>
      targetFlightKeys.has(`${flight.flightNumber}-${this.toDateKey(flight.flightDate)}`)
    );

    const existingSeatKeys = new Set(existingSeats.map((seat) => `${seat.flightId}-${seat.seatNumber}`));
    const aircraftModelById = new Map(aircrafts.map((item) => [item.id, item.model.toUpperCase()]));
    const insertPayload: Seat[] = [];

    for (const flight of targetFlights) {
      const aircraftModel = aircraftModelById.get(flight.aircraftId) || '';
      const generatedSeats = generateSeatTemplatesForModel(aircraftModel).map(
        (seatTemplate) =>
          new Seat({
            flightId: flight.id,
            seatNumber: seatTemplate.seatNumber,
            seatClass: seatTemplate.seatClass,
            seatType: seatTemplate.seatType,
            isReserved: false
          })
      );

      for (const generatedSeat of generatedSeats) {
        const seatKey = `${generatedSeat.flightId}-${generatedSeat.seatNumber}`;
        if (existingSeatKeys.has(seatKey)) {
          continue;
        }

        insertPayload.push(generatedSeat);
      }
    }

    if (!insertPayload.length) {
      return;
    }

    await seatRepository.save(insertPayload);
    Logger.log(`Seeded ${insertPayload.length} seat records.`);
  }

  private buildDateAtOffset(offsetDays: number, time: string): Date {
    const now = new Date();
    const [hourText, minuteText] = time.split(':');
    const hours = Number(hourText);
    const minutes = Number(minuteText);

    const result = new Date(now);
    result.setHours(0, 0, 0, 0);
    result.setDate(result.getDate() + offsetDays);
    result.setHours(hours, minutes, 0, 0);

    return result;
  }

  private toDateKey(value: string | Date): string {
    const date = value instanceof Date ? value : new Date(value);
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
