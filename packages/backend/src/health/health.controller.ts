import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

// Public, unauthenticated liveness probe for the hosting platform (Render, etc.)
@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Liveness check' })
  check() {
    return { status: 'ok', ts: new Date().toISOString() };
  }
}
