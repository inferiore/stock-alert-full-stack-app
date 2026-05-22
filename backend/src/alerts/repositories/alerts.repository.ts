import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alert } from '../entities/alert.entity';

@Injectable()
export class AlertsRepository {
  constructor(
    @InjectRepository(Alert)
    private readonly repo: Repository<Alert>,
  ) {}

  findByUser(userId: string): Promise<Alert[]> {
    return this.repo.find({ where: { userId, active: true } });
  }

  findActiveBySymbol(symbol: string): Promise<Alert[]> {
    return this.repo.find({
      where: { symbol, active: true },
      relations: ['user'],
    });
  }

  findOneByUser(id: string, userId: string): Promise<Alert | null> {
    return this.repo.findOne({ where: { id, userId } });
  }

  save(alert: Partial<Alert>): Promise<Alert> {
    return this.repo.save(alert);
  }

  async deactivate(id: string): Promise<void> {
    await this.repo.update(id, { active: false });
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
