import { INestApplication, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);
    private readonly prisma = new PrismaClient();

    get client(): PrismaClient {
        return this.prisma;
    }

    async onModuleInit(): Promise<void> {
        await this.prisma.$connect();
        this.logger.log('Database connection established');
    }

    async onModuleDestroy(): Promise<void> {
        await this.prisma.$disconnect();
        this.logger.log('Database connection closed');
    }

    enableShutdownHooks(app: INestApplication): void {
        app.enableShutdownHooks?.();
    }
}
