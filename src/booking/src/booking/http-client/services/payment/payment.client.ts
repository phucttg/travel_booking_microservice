import axios, { AxiosInstance } from 'axios';
import { Injectable } from '@nestjs/common';
import * as https from 'https';
import {
  CreatePaymentIntentRequestDto,
  PaymentDto
} from 'building-blocks/contracts/payment.contract';
import { RequestContext } from 'building-blocks/context/context';

export interface IPaymentClient {
  createPaymentIntent(request: CreatePaymentIntentRequestDto): Promise<PaymentDto>;
  getPaymentById(id: number): Promise<PaymentDto>;
}

@Injectable()
export class PaymentClient implements IPaymentClient {
  private readonly client: AxiosInstance;

  constructor() {
    const paymentServiceBaseUrl =
      process.env.PAYMENT_SERVICE_BASE_URL?.replace(/\/+$/, '') || 'http://localhost:3377';

    this.client = axios.create({
      baseURL: paymentServiceBaseUrl,
      timeout: 60000,
      maxContentLength: 500 * 1000 * 1000,
      httpsAgent: new https.Agent({ keepAlive: true })
    });
  }

  async createPaymentIntent(request: CreatePaymentIntentRequestDto): Promise<PaymentDto> {
    const result = await this.client.post<PaymentDto>(`/api/v1/payment/create-intent`, request, {
      headers: {
        Authorization: RequestContext.getAuthorization()
      }
    });

    return result.data;
  }

  async getPaymentById(id: number): Promise<PaymentDto> {
    const result = await this.client.get<PaymentDto>(`/api/v1/payment/get-by-id`, {
      params: { id },
      headers: {
        Authorization: RequestContext.getAuthorization()
      }
    });

    return result.data;
  }
}
