import axios, { AxiosInstance } from 'axios';
import { Injectable } from '@nestjs/common';
import * as https from 'https';
import {
  CreatePaymentIntentRequestDto,
  PaymentDto,
  PaymentSummaryDto
} from 'building-blocks/contracts/payment.contract';
import { RequestContext } from 'building-blocks/context/context';

export interface IPaymentClient {
  createPaymentIntent(request: CreatePaymentIntentRequestDto): Promise<PaymentDto>;
  getPaymentById(id: number): Promise<PaymentDto>;
  getPaymentSummariesByIds(ids: number[]): Promise<PaymentSummaryDto[]>;
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

  async getPaymentSummariesByIds(ids: number[]): Promise<PaymentSummaryDto[]> {
    const uniqueIds = [...new Set((ids || []).filter((id) => Number.isInteger(id) && id > 0))];

    if (!uniqueIds.length) {
      return [];
    }

    try {
      const result = await this.client.post<PaymentSummaryDto[]>(
        `/api/v1/payment/get-summaries-by-ids`,
        { ids: uniqueIds },
        {
          headers: {
            Authorization: RequestContext.getAuthorization()
          }
        }
      );

      return result.data;
    } catch (error) {
      if (axios.isAxiosError(error) && [404, 405].includes(error.response?.status || 0)) {
        const legacyResults = await Promise.all(
          uniqueIds.map(async (id) => {
            try {
              return await this.getPaymentById(id);
            } catch {
              return null;
            }
          })
        );

        return legacyResults.filter((payment): payment is PaymentDto => Boolean(payment));
      }

      throw error;
    }
  }
}
