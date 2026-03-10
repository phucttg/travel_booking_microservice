import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Airport } from '@/airport/entities/airport.entity';

export interface IAirportRepository {
  createAirport(airport: Airport): Promise<Airport>;
  findAirportByName(name: string): Promise<Airport>;
  findAirportById(id: number): Promise<Airport>;
  findAirportsOrderedByName(): Promise<Airport[]>;
  getAll(): Promise<Airport[]>;
}

export class AirportRepository implements IAirportRepository {
  constructor(
    @InjectRepository(Airport)
    private readonly airportRepository: Repository<Airport>
  ) {}

  async createAirport(airport: Airport): Promise<Airport> {
    return await this.airportRepository.save(airport);
  }

  async findAirportByName(name: string): Promise<Airport> {
    return await this.airportRepository.findOneBy({
      name: name
    });
  }

  async findAirportById(id: number): Promise<Airport> {
    return await this.airportRepository.findOneBy({
      id: id
    });
  }

  async findAirportsOrderedByName(): Promise<Airport[]> {
    return await this.airportRepository
      .createQueryBuilder('airport')
      .orderBy('airport.name', 'ASC')
      .getMany();
  }

  async getAll(): Promise<Airport[]> {
    return await this.airportRepository.find();
  }
}
