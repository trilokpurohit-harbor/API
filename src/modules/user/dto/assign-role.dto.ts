import { RewriteValidationOptions } from '@app/common/validators/rewrite-validation-options.decorator';
import { RoleName } from '@common/enums/role-name.enum';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';

@RewriteValidationOptions({ whitelist: false, forbidNonWhitelisted: false })
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
        example: RoleName.Dealer,
        description: 'Name of the role to assign',
        enum: RoleName,
    })
    @IsEnum(RoleName)
    role!: RoleName;
}
