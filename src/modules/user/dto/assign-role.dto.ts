import { RewriteValidationOptions } from '@app/common/validators/rewrite-validation-options.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { type Role } from '@prisma/client';
import { IsUUID } from 'class-validator';

@RewriteValidationOptions({ whitelist: false, forbidNonWhitelisted: false })
export class AssignRoleDto {
    @ApiProperty({
        description: 'Id of the user',
        example: '1be69fb0-164a-49a9-90ca-3df98a25a885',
        type: 'string',
        format: 'uuid',
    })
    @IsUUID()
    userId: string;

    @ApiProperty({
        examples: ['1', '2', '3'],
        description: 'Id of the role to assign',
        format: 'int',
        type: 'number',
    })
    roleId: Role['id'];
}
