export interface AircraftDto {
  id: number;
  model: string;
  name: string;
  manufacturingYear: number;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface CreateAircraftRequest {
  model: string;
  name: string;
  manufacturingYear: number;
}
