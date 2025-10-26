import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService, LoginResponse } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from './auth.guard';
import { ApiBearerAuth, ApiBody } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @HttpCode(HttpStatus.OK)
    @Post('login')
    @ApiBody({ type: LoginDto })
    login(@Body() loginDto: LoginDto, @Req() request: Request): Promise<LoginResponse> {
        return this.authService.login(loginDto, request);
    }

    @Post('logout')
    @UseGuards(AuthGuard)
    @ApiBearerAuth('authorization')
    logout() {
        return { success: true } as const;
    }
}
