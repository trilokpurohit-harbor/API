import { ApiProperty } from '@nestjs/swagger';
import { type Role } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsInt, IsUUID } from 'class-validator';

export class AssignRoleDto {
    @ApiProperty({
        description: 'Id of the user',
        example: '1be69fb0-164a-49a9-90ca-3df98a25a885',
        type: 'string',
        format: 'uuid',
    })
    @IsUUID()
    userId!: string;

    @ApiProperty({
        examples: ['1', '2', '3'],
        example: 1,
        description: 'Id of the role to assign',
        format: 'int',
        type: 'number',
    })
    @Type(() => Number)
    @IsInt()
    roleId!: Role['id'];
}
