import { Injectable, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IDropRequestRepository, DROP_REQUEST_REPOSITORY } from '../../domain/coverage/repositories/drop-request.repository.interface';

@Injectable()
export class DropExpiryCron {
  constructor(
    @Inject(DROP_REQUEST_REPOSITORY) private dropRepo: IDropRequestRepository,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiry(): Promise<void> {
    const now = new Date();
    const expiringDrops = await this.dropRepo.findExpiring(now);
    for (const drop of expiringDrops) {
      drop.expire();
      await this.dropRepo.save(drop);
    }
  }
}
