import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserRepository } from './repositories/user.repository';
import { User } from './entities/user.entity';

const mockUser: User = {
  id: 'uuid-1',
  email: 'test@example.com',
  passwordHash: 'hashed_password',
  fcmToken: null,
  createdAt: new Date(),
};

const mockUserRepository = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  save: jest.fn(),
  updateFcmToken: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('signed_token'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      mockUserRepository as unknown as UserRepository,
      mockJwtService as unknown as JwtService,
    );
  });

  describe('register', () => {
    it('should create a user and return an access token', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await service.register({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.accessToken).toBe('signed_token');
      expect(result.user.email).toBe('test@example.com');
      expect(mockUserRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should return an access token for valid credentials', async () => {
      const hash = await bcrypt.hash('password123', 10);
      mockUserRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        passwordHash: hash,
      });

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.accessToken).toBe('signed_token');
    });

    it('should throw UnauthorizedException for unknown email', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const hash = await bcrypt.hash('correct_password', 10);
      mockUserRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        passwordHash: hash,
      });

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'wrong_password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    it('should return user by id', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      const user = await service.validateUser('uuid-1');
      expect(user.id).toBe('uuid-1');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);
      await expect(service.validateUser('bad-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
