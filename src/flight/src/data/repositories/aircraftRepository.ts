import { Repository } from 'typeorm';
import { Aircraft } from '@/aircraft/entities/aircraft.entity';
import { InjectRepository } from '@nestjs/typeorm';

export interface IAircraftRepository {
  createAircraft(aircraft: Aircraft): Promise<Aircraft>;

  findAircraftByName(name: string): Promise<Aircraft>;
  findAircraftById(id: number): Promise<Aircraft>;
  findAircraftsOrderedByName(): Promise<Aircraft[]>;

  getAll(): Promise<Aircraft[]>;
}

export class AircraftRepository implements IAircraftRepository {
  constructor(
    @InjectRepository(Aircraft)
    private readonly aircraftRepository: Repository<Aircraft>
  ) {}

  async createAircraft(aircraft: Aircraft): Promise<Aircraft> {
    return await this.aircraftRepository.save(aircraft);
  }

  async findAircraftByName(name: string): Promise<Aircraft> {
    return await this.aircraftRepository.findOneBy({
      name: name
    });
  }

  async findAircraftById(id: number): Promise<Aircraft> {
    return await this.aircraftRepository.findOneBy({
      id: id
    });
  }

  async findAircraftsOrderedByName(): Promise<Aircraft[]> {
    return await this.aircraftRepository
      .createQueryBuilder('aircraft')
      .orderBy('aircraft.name', 'ASC')
      .getMany();
  }

  async getAll(): Promise<Aircraft[]> {
    return await this.aircraftRepository.find();
  }
}
