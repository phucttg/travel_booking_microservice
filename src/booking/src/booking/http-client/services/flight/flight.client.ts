import axios from 'axios';
import {
  FlightDto,
  ReserveSeatRequestDto,
  SeatReservationDto,
  SeatStateDto
} from 'building-blocks/contracts/flight.contract';
import { Injectable } from '@nestjs/common';
import { RequestContext } from 'building-blocks/context/context';
import * as https from 'https';
import { AxiosInstance } from 'axios';

export interface IFlightClient {
  getFlightById(id: number): Promise<FlightDto>;

  reserveSeat(request: ReserveSeatRequestDto): Promise<SeatReservationDto>;

  getSeatState(flightId: number, seatNumber: string): Promise<SeatStateDto>;
}

@Injectable()
export class FlightClient implements IFlightClient {
  private readonly client: AxiosInstance;
  constructor() {
    const flightServiceBaseUrl =
      process.env.FLIGHT_SERVICE_BASE_URL?.replace(/\/+$/, '') || 'http://localhost:3344';

    this.client = axios.create({
      baseURL: flightServiceBaseUrl,
      timeout: 60000,
      maxContentLength: 500 * 1000 * 1000,
      httpsAgent: new https.Agent({ keepAlive: true })
    });
  }

  async getFlightById(id: number): Promise<FlightDto> {
    const result = await this.client.get<FlightDto>(`/api/v1/flight/get-by-id?id=${id}`, {
      headers: {
        Authorization: RequestContext.getAuthorization()
      }
    });

    return result?.data;
  }

  async reserveSeat(request: ReserveSeatRequestDto): Promise<SeatReservationDto> {
    const result = await this.client.post<SeatReservationDto>(`/api/v1/seat/reserve`, request, {
      headers: {
        Authorization: RequestContext.getAuthorization()
      }
    });

    return result?.data;
  }

  async getSeatState(flightId: number, seatNumber: string): Promise<SeatStateDto> {
    const result = await this.client.get<SeatStateDto>(`/api/v1/seat/get-state`, {
      params: {
        flightId,
        seatNumber
      }
    });

    return result?.data;
  }
}
