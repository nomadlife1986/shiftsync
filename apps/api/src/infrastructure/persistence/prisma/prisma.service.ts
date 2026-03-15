import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

function normalizeDatabaseUrl(value: string | undefined): string {
  const normalized = value?.trim().replace(/^['"]|['"]$/g, '');

  if (!normalized) {
    throw new Error('DATABASE_URL is not set');
  }

  return normalized;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // Prisma 7 uses the Query Compiler engine which requires a driver adapter.
    // PrismaPg uses the pg library to connect to PostgreSQL.
    const adapter = new PrismaPg({ connectionString: normalizeDatabaseUrl(process.env['DATABASE_URL']) });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
