import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, Role } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RoleService {
    constructor(private readonly prisma: PrismaService) {}

    async create(dto: CreateRoleDto, actorId?: string): Promise<Role> {
        try {
            return await this.prisma.client.role.create({
                data: {
                    name: dto.name,
                    description: dto.description ?? null,
                    createdBy: actorId ?? null,
                    isActive: true,
                },
            });
        } catch (error) {
            this.rethrowUniqueConstraint(error, dto.name);
            throw error;
        }
    }

    async findAll(includeInactive = false): Promise<Role[]> {
        const where: Prisma.RoleWhereInput | undefined = includeInactive
            ? undefined
            : {
                  deletedAt: null,
                  isActive: true,
              };

        return this.prisma.client.role.findMany({
            where,
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: number): Promise<Role> {
        return this.getActiveRoleOrThrow(id);
    }

    async update(id: number, dto: UpdateRoleDto, actorId?: string): Promise<Role> {
        await this.getActiveRoleOrThrow(id);

        const data: Prisma.RoleUpdateInput = {};
        if (dto.name !== undefined) {
            data.name = dto.name;
        }
        if (dto.description !== undefined) {
            data.description = dto.description ?? null;
        }
        if (actorId !== undefined) {
            data.updatedBy = actorId;
        }

        try {
            return await this.prisma.client.role.update({
                where: { id },
                data,
            });
        } catch (error) {
            this.rethrowUniqueConstraint(error, dto.name);
            this.rethrowNotFound(error, id);
            throw error;
        }
    }

    async remove(id: number, actorId?: string): Promise<Role> {
        await this.getActiveRoleOrThrow(id);

        const linkedUsers = await this.prisma.client.userRole.count({ where: { roleId: id } });
        if (linkedUsers > 0) {
            throw new BadRequestException(
                'Cannot delete role while users are assigned. Deactivate or reassign users first.',
            );
        }

        try {
            return await this.prisma.client.role.update({
                where: { id },
                data: {
                    deletedAt: new Date(),
                    deletedBy: actorId ?? null,
                    isActive: false,
                },
            });
        } catch (error) {
            this.rethrowNotFound(error, id);
            throw error;
        }
    }

    private async getActiveRoleOrThrow(id: number): Promise<Role> {
        const role = await this.prisma.client.role.findFirst({
            where: {
                id,
                deletedAt: null,
                isActive: true,
            },
        });

        if (!role) {
            throw new NotFoundException(`Role with id ${id} not found`);
        }

        return role;
    }

    private rethrowUniqueConstraint(error: unknown, name?: string): void {
        if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new BadRequestException(`Role name '${name}' is already in use`);
        }
    }

    private rethrowNotFound(error: unknown, id: number): void {
        if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
            throw new NotFoundException(`Role with id ${id} not found`);
        }
    }
}
