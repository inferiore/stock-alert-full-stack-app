import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from '../src/auth/auth.controller';
import { UsersController } from '../src/auth/users.controller';
import { AuthService } from '../src/auth/auth.service';
import { UserRepository } from '../src/auth/repositories/user.repository';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { AUTH_SERVICE_TOKEN } from '../src/auth/interfaces/auth.service.interface';
import { User } from '../src/auth/entities/user.entity';
import { Alert } from '../src/alerts/entities/alert.entity';
import { AlertsController } from '../src/alerts/alerts.controller';
import { AlertsService } from '../src/alerts/alerts.service';
import { AlertsRepository } from '../src/alerts/repositories/alerts.repository';
import { FINNHUB_SERVICE_TOKEN } from '../src/finnhub/interfaces/finnhub.service.interface';

// Stub Finnhub — prevents real WebSocket connection during tests
class FinnhubServiceStub {
  subscribe() {}
  unsubscribe() {}
}

// Stub Notifications — prevents firebase-admin init during tests
class NotificationsServiceStub {
  async sendPushNotification() {}
  async handleAlertTriggered() {}
}

export async function createTestApp(): Promise<{
  app: INestApplication;
  module: TestingModule;
}> {
  // Ensure JWT_SECRET matches across JwtModule and JwtStrategy in tests
  process.env.JWT_SECRET = 'test_secret';

  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
      EventEmitterModule.forRoot(),
      TypeOrmModule.forRoot({
        type: 'better-sqlite3',
        database: ':memory:',
        entities: [User, Alert],
        synchronize: true,
        dropSchema: true,
      }),
      TypeOrmModule.forFeature([User, Alert]),
      PassportModule.register({ defaultStrategy: 'jwt' }),
      JwtModule.register({
        secret: 'test_secret',
        signOptions: { expiresIn: '1h' },
      }),
    ],
    controllers: [AuthController, UsersController, AlertsController],
    providers: [
      UserRepository,
      AlertsRepository,
      JwtStrategy,
      AlertsService,
      { provide: AUTH_SERVICE_TOKEN, useClass: AuthService },
      { provide: FINNHUB_SERVICE_TOKEN, useClass: FinnhubServiceStub },
      {
        provide: 'NOTIFICATIONS_SERVICE_TOKEN',
        useClass: NotificationsServiceStub,
      },
    ],
  }).compile();

  const app = module.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();

  return { app, module };
}
