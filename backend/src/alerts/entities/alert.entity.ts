import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export type AlertCondition = 'above' | 'below';

@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  user: User;

  @Column()
  userId: string;

  @Column()
  symbol: string;

  @Column('decimal', { precision: 18, scale: 4 })
  targetPrice: number;

  @Column({ type: 'enum', enum: ['above', 'below'], default: 'above' })
  condition: AlertCondition;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
