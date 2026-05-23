import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
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
  constructor(private readonly userRepository: UserRepository) {}

  @Put('fcm-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateFcmToken(
    @CurrentUser() user: User,
    @Body() dto: UpdateFcmTokenDto,
  ): Promise<void> {
    await this.userRepository.updateFcmToken(user.id, dto.fcmToken);
  }
}
