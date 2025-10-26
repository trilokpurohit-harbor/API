import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
    @ApiProperty({
        example: 'admin@example.com',
        description: 'Email of the user',
        type: 'string',
        format: 'email',
    })
    @IsEmail()
    email!: string;

    @ApiProperty({
        example: 'ChangeMe123!',
        description: 'Password of the user',
        type: 'string',
        format: 'password',
    })
    @IsString()
    @MinLength(8)
    password!: string;
}
