import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { RoleName } from 'src/common/enums/role-name.enum';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

interface SeedUser {
    email: string;
    password: string;
    firstName: string;
    lastName?: string | null;
    role: RoleName;
    isActive?: boolean;
}

async function main(): Promise<void> {
    const users: SeedUser[] = buildSeedUsers();

    await Promise.all(
        Object.values(RoleName).map((roleName) =>
            prisma.role.upsert({
                where: { name: roleName },
                update: {},
                create: {
                    name: roleName,
                    description: `${roleName.charAt(0).toUpperCase()}${roleName.slice(1)} role`,
                    createdBy: 'seed',
                },
            }),
        ),
    );

    for (const user of users) {
        const passwordHash = await hash(user.password, SALT_ROUNDS);
        const role = await prisma.role.findUniqueOrThrow({ where: { name: user.role } });

        const savedUser = await prisma.user.upsert({
            where: { email: user.email },
            update: {
                firstName: user.firstName,
                lastName: user.lastName ?? null,
                isActive: user.isActive ?? true,
                passwordHash,
            },
            create: {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName ?? null,
                isActive: user.isActive ?? true,
                passwordHash,
            },
        });

        await prisma.userRole.upsert({
            where: { userId: savedUser.id },
            update: { roleId: role.id },
            create: { userId: savedUser.id, roleId: role.id },
        });
    }
}

function buildSeedUsers(): SeedUser[] {
    const masterUser: SeedUser = {
        email: envOrThrow('MASTER_USER_EMAIL'),
        password: envOrThrow('MASTER_USER_PASSWORD'),
        firstName: envOrDefault('MASTER_USER_FIRST_NAME', 'Master'),
        lastName: envOrDefault('MASTER_USER_LAST_NAME', 'Admin'),
        role: RoleName.Admin,
    };

    const dealerUser: SeedUser = {
        email: envOrDefault('DEALER_USER_EMAIL', 'dealer@example.com'),
        password: envOrDefault('DEALER_USER_PASSWORD', 'DealerPass123!'),
        firstName: envOrDefault('DEALER_USER_FIRST_NAME', 'Daphne'),
        lastName: envOrDefault('DEALER_USER_LAST_NAME', 'Dealer'),
        role: RoleName.Dealer,
    };

    const brokerUser: SeedUser = {
        email: envOrDefault('BROKER_USER_EMAIL', 'broker@example.com'),
        password: envOrDefault('BROKER_USER_PASSWORD', 'BrokerPass123!'),
        firstName: envOrDefault('BROKER_USER_FIRST_NAME', 'Brandon'),
        lastName: envOrDefault('BROKER_USER_LAST_NAME', 'Broker'),
        role: RoleName.Broker,
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
