import 'dotenv/config';
import { PrismaClient, UserType } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

interface SeedUser {
    email: string;
    password: string;
    firstName: string;
    lastName?: string | null;
    type: UserType;
    isActive?: boolean;
}

async function main(): Promise<void> {
    const users: SeedUser[] = buildSeedUsers();
    for (const user of users) {
        const passwordHash = await hash(user.password, SALT_ROUNDS);

        await prisma.user.upsert({
            where: { email: user.email },
            update: {
                firstName: user.firstName,
                lastName: user.lastName ?? null,
                isActive: user.isActive ?? true,
                type: user.type,
                passwordHash,
            },
            create: {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName ?? null,
                isActive: user.isActive ?? true,
                type: user.type,
                passwordHash,
            },
        });
    }
}

function buildSeedUsers(): SeedUser[] {
    const masterUser: SeedUser = {
        email: envOrThrow('MASTER_USER_EMAIL'),
        password: envOrThrow('MASTER_USER_PASSWORD'),
        firstName: envOrDefault('MASTER_USER_FIRST_NAME', 'Master'),
        lastName: envOrDefault('MASTER_USER_LAST_NAME', 'Admin'),
        type: UserType.Admin,
    };

    const dealerUser: SeedUser = {
        email: envOrDefault('DEALER_USER_EMAIL', 'dealer@example.com'),
        password: envOrDefault('DEALER_USER_PASSWORD', 'DealerPass123!'),
        firstName: envOrDefault('DEALER_USER_FIRST_NAME', 'Daphne'),
        lastName: envOrDefault('DEALER_USER_LAST_NAME', 'Dealer'),
        type: UserType.Dealer,
    };

    const brokerUser: SeedUser = {
        email: envOrDefault('BROKER_USER_EMAIL', 'broker@example.com'),
        password: envOrDefault('BROKER_USER_PASSWORD', 'BrokerPass123!'),
        firstName: envOrDefault('BROKER_USER_FIRST_NAME', 'Brandon'),
        lastName: envOrDefault('BROKER_USER_LAST_NAME', 'Broker'),
        type: UserType.Broker,
    };

    return [masterUser, dealerUser, brokerUser];
}

function envOrThrow(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable ${key}`);
    }
    return value;
}

function envOrDefault(key: string, fallback: string): string {
    return process.env[key] ?? fallback;
}

main()
    .then(() => {
        console.log('Database seeding completed successfully');
    })
    .catch((error) => {
        console.error('Database seeding failed', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
