import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import {
  AUTH_SERVICE_TOKEN,
  IAuthService,
} from './interfaces/auth.service.interface';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from './entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AUTH_SERVICE_TOKEN)
    private readonly authService: IAuthService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  profile(@CurrentUser() user: User): { id: string; email: string } {
    return { id: user.id, email: user.email };
  }
}
