import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { UpdateFcmTokenDto } from './dto/update-fcm-token.dto';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly userRepository: UserRepository) {}

  @Put('fcm-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateFcmToken(
    @CurrentUser() user: User,
    @Body() dto: UpdateFcmTokenDto,
  ): Promise<void> {
    await this.userRepository.updateFcmToken(user.id, dto.fcmToken);
    this.logger.log(`FCM token updated for ${user.email} → ${dto.fcmToken.slice(0, 20)}…`);
  }
}
