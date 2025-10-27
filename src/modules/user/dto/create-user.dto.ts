import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleName } from '@common/enums/role-name.enum';
import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    email!: string;

    @ApiProperty({ minLength: 8, example: 'StrongPass123!' })
    @IsString()
    @MinLength(8)
    password!: string;

    @ApiProperty({ example: 'Alex' })
    @IsString()
    @IsNotEmpty()
    firstName!: string;

    @ApiPropertyOptional({ example: 'Doe' })
    @IsOptional()
    @IsString()
    lastName?: string | null;

    @ApiPropertyOptional({ example: true, default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ enum: RoleName, example: RoleName.Broker })
    @IsEnum(RoleName)
    role?: RoleName;
}
