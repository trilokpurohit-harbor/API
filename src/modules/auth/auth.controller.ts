import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthService, LoginResponse } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from './auth.guard';
import { ApiBearerAuth, ApiBody, ApiOperation } from '@nestjs/swagger';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UserType } from '@prisma/client';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @HttpCode(HttpStatus.OK)
    @Post('login/admin')
    @ApiBody({ type: LoginDto })
    @ApiOperation({ summary: 'Admin login' })
    loginAdmin(@Body() loginDto: LoginDto): Promise<LoginResponse> {
        return this.authService.login(loginDto, UserType.Admin);
    }

    @HttpCode(HttpStatus.OK)
    @Post('login/dealer')
    @ApiBody({ type: LoginDto })
    @ApiOperation({ summary: 'Dealer login' })
    loginDealer(@Body() loginDto: LoginDto): Promise<LoginResponse> {
        return this.authService.login(loginDto, UserType.Dealer);
    }

    @HttpCode(HttpStatus.OK)
    @Post('login/broker')
    @ApiBody({ type: LoginDto })
    @ApiOperation({ summary: 'Broker login' })
    loginBroker(@Body() loginDto: LoginDto): Promise<LoginResponse> {
        return this.authService.login(loginDto, UserType.Broker);
    }

    @HttpCode(HttpStatus.OK)
    @Post('refresh')
    @ApiBody({ type: RefreshTokenDto })
    refresh(@Body() dto: RefreshTokenDto): Promise<LoginResponse> {
        return this.authService.refresh(dto.refreshToken);
    }

    @Post('logout')
    @UseGuards(AuthGuard)
    @ApiBearerAuth('authorization')
    logout() {
        return { success: true } as const;
    }
}
