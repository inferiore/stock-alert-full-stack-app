import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient<Socket>();
    const token =
      (client.handshake.auth as Record<string, string>).token ??
      client.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) throw new WsException('Missing token');

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.config.get<string>('JWT_SECRET', 'dev_secret'),
      });
      // Attach user payload to socket data for downstream use
      client.data = { userId: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new WsException('Invalid token');
    }
  }
}
