import { CreateAlertDto } from '../dto/create-alert.dto';
import { AlertResponseDto } from '../dto/alert-response.dto';

export const ALERTS_SERVICE_TOKEN = 'ALERTS_SERVICE_TOKEN';

export interface IAlertsService {
  create(userId: string, dto: CreateAlertDto): Promise<AlertResponseDto>;
  findAllByUser(userId: string): Promise<AlertResponseDto[]>;
  remove(id: string, userId: string): Promise<void>;
}
