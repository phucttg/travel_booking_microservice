export interface AirportDto {
  id: number;
  code: string;
  name: string;
  address: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface CreateAirportRequest {
  code: string;
  name: string;
  address: string;
}
