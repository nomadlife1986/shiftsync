import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'npx tsx src/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
