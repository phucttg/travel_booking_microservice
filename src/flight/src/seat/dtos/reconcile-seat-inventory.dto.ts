import { ApiProperty } from '@nestjs/swagger';

export enum SeatInventoryReconcileStatus {
  FIXED = 'FIXED',
  SKIPPED = 'SKIPPED',
  FAILED = 'FAILED'
}

export class ReconcileSeatInventoryItemDto {
  @ApiProperty({ type: Number })
  flightId: number;

  @ApiProperty({ type: String })
  flightNumber: string;

  @ApiProperty({ type: Number })
  aircraftId: number;

  @ApiProperty({ type: String })
  aircraftModel: string;

  @ApiProperty({ type: Number })
  expectedCount: number;

  @ApiProperty({ type: Number })
  beforeCount: number;

  @ApiProperty({ type: Number })
  createdCount: number;

  @ApiProperty({ type: Number })
  afterCount: number;

  @ApiProperty({ type: Number })
  missingCount: number;

  @ApiProperty({ enum: SeatInventoryReconcileStatus, enumName: 'SeatInventoryReconcileStatus' })
  status: SeatInventoryReconcileStatus;

  @ApiProperty({ type: String, required: false })
  message?: string;
}

export class ReconcileSeatInventoryResponseDto {
  @ApiProperty({ type: Number })
  processed: number;

  @ApiProperty({ type: Number })
  fixed: number;

  @ApiProperty({ type: Number })
  skipped: number;

  @ApiProperty({ type: Number })
  failed: number;

  @ApiProperty({ type: () => [ReconcileSeatInventoryItemDto] })
  result: ReconcileSeatInventoryItemDto[];
}
