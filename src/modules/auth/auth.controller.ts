import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
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
    loginAdmin(@Body() loginDto: LoginDto, @Req() request: Request): Promise<LoginResponse> {
        return this.authService.login(loginDto, request, UserType.Admin);
    }

    @HttpCode(HttpStatus.OK)
    @Post('login/dealer')
    @ApiBody({ type: LoginDto })
    @ApiOperation({ summary: 'Dealer login' })
    loginDealer(@Body() loginDto: LoginDto, @Req() request: Request): Promise<LoginResponse> {
        return this.authService.login(loginDto, request, UserType.Dealer);
    }

    @HttpCode(HttpStatus.OK)
    @Post('login/broker')
    @ApiBody({ type: LoginDto })
    @ApiOperation({ summary: 'Broker login' })
    loginBroker(@Body() loginDto: LoginDto, @Req() request: Request): Promise<LoginResponse> {
        return this.authService.login(loginDto, request, UserType.Broker);
    }

    @HttpCode(HttpStatus.OK)
    @Post('refresh')
    @ApiBody({ type: RefreshTokenDto })
    refresh(@Body() dto: RefreshTokenDto, @Req() request: Request): Promise<LoginResponse> {
        return this.authService.refresh(dto.refreshToken, request);
    }

    @Post('logout')
    @UseGuards(AuthGuard)
    @ApiBearerAuth('authorization')
    logout() {
        return { success: true } as const;
    }
}
