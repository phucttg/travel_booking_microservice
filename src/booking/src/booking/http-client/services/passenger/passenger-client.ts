import axios, { AxiosInstance } from 'axios';
import { PassengerDto } from 'building-blocks/contracts/passenger.contract';
import { Injectable } from '@nestjs/common';
import { RequestContext } from 'building-blocks/context/context';
import https from 'https';

export interface IPassengerClient {
  getPassengerByUserId(userId: number): Promise<PassengerDto>;
}

@Injectable()
export class PassengerClient implements IPassengerClient {
  private readonly client: AxiosInstance;

  constructor() {
    const passengerServiceBaseUrl =
      process.env.PASSENGER_SERVICE_BASE_URL?.replace(/\/+$/, '') || 'http://localhost:3355';

    this.client = axios.create({
      baseURL: passengerServiceBaseUrl,
      timeout: 60000,
      maxContentLength: 500 * 1000 * 1000,
      httpsAgent: new https.Agent({ keepAlive: true })
    });
  }

  async getPassengerByUserId(userId: number): Promise<PassengerDto> {
    const result = await this.client.get<PassengerDto>(`/api/v1/passenger/get-by-user-id?userId=${userId}`, {
      headers: {
        Authorization: RequestContext.getAuthorization()
      }
    });

    return result?.data;
  }
}
