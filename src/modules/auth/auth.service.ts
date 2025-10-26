import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import type { Request } from 'express';
import { LoginDto } from './dto/login.dto';
import { UserProfile, UserService } from '../user/user.service';

export interface LoginResponse {
    accessToken: string;
    user: UserProfile;
}

@Injectable()
export class AuthService {
    private readonly jwtExpiresIn: string;
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
    ) {
        this.jwtExpiresIn = process.env.JWT_EXPIRATION ?? '3600s';
    }

    async login(loginInfo: LoginDto, request: Request): Promise<LoginResponse> {
        // let first check if user exists in db and is active
        const user = await this.validateUser(loginInfo.email, loginInfo.password, request);
        if (!user) {
            this.logger.warn(this.formatLogMessage('auth.login.failure', request, { email: loginInfo.email }));
            throw new UnauthorizedException('Invalid credentials');
        }
        this.logger.log(this.formatLogMessage('auth.login.success', request, { userId: user.id }));
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.userRole?.role?.name ?? null,
        } as const;
        const accessToken = await this.jwtService.signAsync(payload);
        return {
            accessToken,
            user,
        };
    }

    async validateUser(email: string, password: string, request?: Request): Promise<UserProfile | null> {
        const user = await this.userService.findByEmailWithPassword(email);
        if (!user) {
            if (request) {
                this.logger.debug(this.formatLogMessage('auth.login.user_missing', request, { email }));
            }
            return null;
        }
        const isPasswordValid = await compare(password, user.passwordHash);
        if (!isPasswordValid) {
            if (request) {
                this.logger.debug(this.formatLogMessage('auth.login.password_mismatch', request, { email }));
            }
            return null;
        }
        return this.userService.findOne(user.id);
    }

    private formatLogMessage(event: string, request: Request, extra: Record<string, unknown> = {}): string {
        const context = {
            event,
            correlationId: this.extractCorrelationId(request),
            sessionId: this.getSessionId(request),
            ip: request.ip,
            userAgent: request.headers['user-agent'] ?? 'unknown',
            ...extra,
        };
        return JSON.stringify(context);
    }

    private extractCorrelationId(request: Request): string | undefined {
        const header = request.headers['x-correlation-id'] ?? request.headers['x-request-id'];
        if (Array.isArray(header)) {
            return header[0];
        }
        return header;
    }

    private getSessionId(request: Request): string | undefined {
        const candidate = request as Request & { sessionID?: string; session?: { id?: string } };
        return candidate.sessionID ?? candidate.session?.id;
    }
}
