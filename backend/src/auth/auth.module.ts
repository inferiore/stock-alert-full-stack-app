import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserRepository } from './repositories/user.repository';
import { AUTH_SERVICE_TOKEN } from './interfaces/auth.service.interface';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'dev_secret'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    UserRepository,
    JwtStrategy,
    { provide: AUTH_SERVICE_TOKEN, useClass: AuthService },
  ],
  exports: [UserRepository, AUTH_SERVICE_TOKEN],
})
export class AuthModule {}
