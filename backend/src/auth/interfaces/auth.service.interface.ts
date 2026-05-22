import { AuthResponseDto } from '../dto/auth-response.dto';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { User } from '../entities/user.entity';

export const AUTH_SERVICE_TOKEN = 'AUTH_SERVICE_TOKEN';

export interface IAuthService {
  register(dto: RegisterDto): Promise<AuthResponseDto>;
  login(dto: LoginDto): Promise<AuthResponseDto>;
  validateUser(id: string): Promise<User>;
}
