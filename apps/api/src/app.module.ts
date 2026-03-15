import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './infrastructure/persistence/prisma/prisma.module';
import { AuthModule } from './modules/auth.module';
import { UserModule } from './modules/user.module';
import { LocationModule } from './modules/location.module';
import { SchedulingModule } from './modules/scheduling.module';
import { CoverageModule } from './modules/coverage.module';
import { AnalyticsModule } from './modules/analytics.module';
import { NotificationModule } from './modules/notification.module';
import { EventStoreModule } from './modules/event-store.module';
import { RealtimeModule } from './modules/realtime.module';

@Module({
  imports: [
    // GraphQL with Apollo + graphql-ws for subscriptions
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      subscriptions: {
        'graphql-ws': true,
      },
      context: ({ req }: { req: Request }) => ({ req }),
    }),
    // Cron jobs
    ScheduleModule.forRoot(),
    // Database
    PrismaModule,
    // Feature modules
    AuthModule,
    UserModule,
    LocationModule,
    EventStoreModule,
    RealtimeModule,
    SchedulingModule,
    CoverageModule,
    AnalyticsModule,
    NotificationModule,
  ],
})
export class AppModule {}
