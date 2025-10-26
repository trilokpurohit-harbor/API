import { Injectable, NotFoundException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import type { Prisma, Role, User } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { hash } from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { RoleName } from '@common/enums/role-name.enum';

const userSelect = {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    userRole: {
        include: {
            role: true,
        },
    },
} satisfies Prisma.UserSelect;

export type UserProfile = Prisma.UserGetPayload<{ select: typeof userSelect }>;

@Injectable()
export class UserService {
    private static readonly SALT_ROUNDS = 12;

    constructor(private readonly prisma: PrismaService) {}

    async create(dto: CreateUserDto): Promise<UserProfile> {
        const passwordHash = await this.hashPassword(dto.password);
        const role = await this.findRole(dto.role ?? RoleName.Broker);
        const user = await this.prisma.client.user.create({
            data: {
                email: dto.email,
                firstName: dto.firstName,
                lastName: dto.lastName ?? null,
                isActive: dto.isActive ?? true,
                passwordHash,
            },
            select: userSelect,
        });
        await this.prisma.client.userRole.upsert({
            where: { userId: user.id },
            update: { roleId: role.id },
            create: { userId: user.id, roleId: role.id },
            select: { id: true },
        });
        return this.findOne(user.id);
    }

    async findAll(): Promise<UserProfile[]> {
        const users = await this.prisma.client.user.findMany({ select: userSelect });
        return users.map((user) => this.toEntity(user));
    }

    async findOne(identifier: string): Promise<UserProfile> {
        const where: Prisma.UserWhereUniqueInput = isUUID(identifier) ? { id: identifier } : { email: identifier };
        const user = await this.prisma.client.user.findUnique({ where, select: userSelect });
        if (!user) {
            throw new NotFoundException(`User with identifier '${identifier}' not found`);
        }
        return this.toEntity(user);
    }

    async update(id: string, dto: UpdateUserDto): Promise<UserProfile> {
        const data: Prisma.UserUpdateInput = {};
        if (dto.email !== undefined) {
            data.email = dto.email;
        }
        if (dto.firstName !== undefined) {
            data.firstName = dto.firstName;
        }
        if (dto.lastName !== undefined) {
            data.lastName = dto.lastName ?? null;
        }
        if (dto.isActive !== undefined) {
            data.isActive = dto.isActive;
        }
        if (dto.password) {
            data.passwordHash = await this.hashPassword(dto.password);
        }
        try {
            const user = await this.prisma.client.user.update({
                where: { id },
                data,
                select: userSelect,
            });
            if (dto.role) {
                const role = await this.findRole(dto.role);
                await this.prisma.client.userRole.upsert({
                    where: { userId: user.id },
                    update: { roleId: role.id },
                    create: { userId: user.id, roleId: role.id },
                    select: { id: true },
                });
            }
            return this.findOne(user.id);
        } catch (error) {
            this.rethrowNotFound(error, id);
            throw error;
        }
    }

    async assignRole(userId: string, roleName: RoleName): Promise<UserProfile> {
        await this.findOne(userId);
        const role = await this.findRole(roleName);

        await this.prisma.client.userRole.upsert({
            where: { userId },
            update: { roleId: role.id },
            create: { userId, roleId: role.id },
            select: { id: true },
        });

        return this.findOne(userId);
    }

    async remove(id: string): Promise<UserProfile> {
        try {
            const user = await this.prisma.client.user.delete({ where: { id }, select: userSelect });
            return this.toEntity(user);
        } catch (error) {
            this.rethrowNotFound(error, id);
            throw error;
        }
    }

    findByEmailWithPassword(email: string): Promise<User | null> {
        return this.prisma.client.user.findUnique({ where: { email } });
    }

    async findByEmail(email: string): Promise<UserProfile | null> {
        const user = await this.prisma.client.user.findUnique({ where: { email }, select: userSelect });
        return user ? this.toEntity(user) : null;
    }

    private async hashPassword(password: string): Promise<string> {
        return hash(password, UserService.SALT_ROUNDS);
    }

    private rethrowNotFound(error: unknown, id: string): asserts error is never {
        if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
            throw new NotFoundException(`User with id ${id} not found`);
        }
    }

    private async findRole(name: RoleName): Promise<Role> {
        const role = await this.prisma.client.role.findUnique({ where: { name } });
        if (!role) {
            throw new NotFoundException(`Role '${name}' not found`);
        }
        return role;
    }

    private toEntity(user: UserProfile): UserProfile {
        return { ...user };
    }
}
