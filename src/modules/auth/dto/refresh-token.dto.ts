import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsString } from 'class-validator';

export class RefreshTokenDto {
    @ApiProperty({ description: 'Refresh token issued during login' })
    @IsString()
    @IsJWT()
    refreshToken!: string;
}
