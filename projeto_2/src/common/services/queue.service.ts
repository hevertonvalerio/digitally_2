import { Injectable } from '@nestjs/common';

export interface IQueueOptions {
  attempts: number;
  backoff: {
    type: string;
    delay: number;
  };
}

export interface IQueueJob<T> {
  data: T;
  options?: IQueueOptions;
}

@Injectable()
export class QueueService {
  private queues: Map<string, any[]> = new Map();

  async add(queueName: string, data: any, options?: IQueueOptions) {
    if (!this.queues.has(queueName)) {
      this.queues.set(queueName, []);
    }
    const queue = this.queues.get(queueName);
    if (queue) {
      queue.push({ data, options });
    }
  }

  async process(queueName: string, processor: (job: any) => Promise<void>) {
    const queue = this.queues.get(queueName);
    if (queue) {
      for (const job of queue) {
        await processor(job);
      }
    }
  }

  getQueueLength(queueName: string): number {
    return this.queues.get(queueName)?.length || 0;
  }

  clearQueue(queueName: string) {
    this.queues.delete(queueName);
  }
} 