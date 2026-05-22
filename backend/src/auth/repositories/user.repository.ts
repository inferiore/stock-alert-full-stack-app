import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  save(user: Partial<User>): Promise<User> {
    return this.repo.save(user);
  }

  async updateFcmToken(userId: string, fcmToken: string): Promise<void> {
    await this.repo.update(userId, { fcmToken });
  }
}
