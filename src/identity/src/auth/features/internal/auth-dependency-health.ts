import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { InternalOnly } from 'building-blocks/internal-auth/internal-only.decorator';

@ApiExcludeController()
@Controller({
  path: '/internal/health',
  version: '1'
})
export class AuthDependencyHealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('auth-dependency')
  @InternalOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  async getAuthDependencyHealth(): Promise<void> {
    if (!this.dataSource.isInitialized) {
      throw new ServiceUnavailableException('Identity auth dependency database is not ready');
    }

    try {
      await this.dataSource.query('SELECT 1');
    } catch (error) {
      throw new ServiceUnavailableException({
        message: 'Identity auth dependency probe failed',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
