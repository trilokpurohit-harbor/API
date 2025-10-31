import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type Role, UserType } from '@prisma/client';
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

    @ApiProperty({ enum: UserType, enumName: 'UserType', example: UserType.Broker, default: UserType.Dealer })
    @IsEnum(UserType)
    type?: UserType;

    @ApiPropertyOptional({ examples: ['1', '2', '3'] })
    @IsOptional()
    roleId?: Role['id'];
}
