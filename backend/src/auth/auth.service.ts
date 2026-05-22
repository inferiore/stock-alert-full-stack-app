import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { IAuthService } from './interfaces/auth.service.interface';
import { UserRepository } from './repositories/user.repository';
import { User } from './entities/user.entity';

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.userRepository.save({
      email: dto.email,
      passwordHash,
    });

    return this.buildResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildResponse(user);
  }

  async validateUser(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  private buildResponse(user: User): AuthResponseDto {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);
    return { accessToken, user: { id: user.id, email: user.email } };
  }
}
