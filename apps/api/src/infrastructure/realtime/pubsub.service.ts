import { Injectable } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';

@Injectable()
export class PubSubService {
  private pubSub = new PubSub();

  publish(trigger: string, payload: unknown): void {
    this.pubSub.publish(trigger, payload);
  }

  asyncIterator(triggers: string | string[]): AsyncIterableIterator<unknown> {
    return this.pubSub.asyncIterableIterator(triggers);
  }
}
