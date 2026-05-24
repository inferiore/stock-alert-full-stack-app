import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { CreateAlertDto } from './dto/create-alert.dto';
import { AlertResponseDto } from './dto/alert-response.dto';
import type { IAlertsService } from './interfaces/alerts.service.interface';
import { ALERTS_SERVICE_TOKEN } from './interfaces/alerts.service.interface';

@UseGuards(JwtAuthGuard)
@Controller('alerts')
export class AlertsController {
  constructor(
    @Inject(ALERTS_SERVICE_TOKEN)
    private readonly alertsService: IAlertsService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: User,
    @Body() dto: CreateAlertDto,
  ): Promise<AlertResponseDto> {
    return this.alertsService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: User): Promise<AlertResponseDto[]> {
    return this.alertsService.findAllByUser(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: User): Promise<void> {
    return this.alertsService.remove(id, user.id);
  }
}
