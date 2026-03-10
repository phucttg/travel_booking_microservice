import { EntityManager, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Flight } from '@/flight/entities/flight.entity';

export interface IFlightRepository {
  createFlight(flight: Flight, manager?: EntityManager): Promise<Flight>;
  findFlightByNumber(flightNumber: string): Promise<Flight>;
  findFlightByNumberAndDate(
    flightNumber: string,
    flightDate: Date,
    manager?: EntityManager
  ): Promise<Flight>;
  findFlightById(id: number): Promise<Flight>;
  findFlights(
    page: number,
    pageSize: number,
    orderBy: string,
    order: 'ASC' | 'DESC',
    searchTerm?: string
  ): Promise<[Flight[], number]>;
  getAll(): Promise<Flight[]>;
}

export class FlightRepository implements IFlightRepository {
  constructor(
    @InjectRepository(Flight)
    private readonly flightRepository: Repository<Flight>
  ) {}

  async createFlight(flight: Flight, manager?: EntityManager): Promise<Flight> {
    const repository = manager?.getRepository(Flight) || this.flightRepository;
    return await repository.save(flight);
  }

  async findFlightByNumber(flightNumber: string): Promise<Flight> {
    return await this.flightRepository.findOneBy({
      flightNumber: flightNumber
    });
  }

  async findFlightByNumberAndDate(
    flightNumber: string,
    flightDate: Date,
    manager?: EntityManager
  ): Promise<Flight> {
    const repository = manager?.getRepository(Flight) || this.flightRepository;
    return await repository
      .createQueryBuilder('flight')
      .where('flight.flightNumber = :flightNumber', { flightNumber })
      .andWhere('DATE(flight.flightDate) = DATE(:flightDate)', { flightDate })
      .getOne();
  }

  async findFlightById(id: number): Promise<Flight> {
    return await this.flightRepository.findOneBy({
      id: id
    });
  }

  async findFlights(
    page: number,
    pageSize: number,
    orderBy: string,
    order: 'ASC' | 'DESC',
    searchTerm?: string
  ): Promise<[Flight[], number]> {
    const query = this.flightRepository
      .createQueryBuilder('flight')
      .orderBy(`flight.${orderBy}`, order)
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (searchTerm) {
      query.andWhere('flight.flightNumber ILIKE :searchTerm', {
        searchTerm: `%${searchTerm}%`
      });
    }

    return await query.getManyAndCount();
  }

  async getAll(): Promise<Flight[]> {
    return await this.flightRepository.find();
  }
}
