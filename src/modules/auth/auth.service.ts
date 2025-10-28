import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import type { Request } from 'express';
import { RoleName } from '@common/enums/role-name.enum';
import { LoginDto } from './dto/login.dto';
import { UserProfile, UserService } from '../user/user.service';

export interface LoginResponse {
    accessToken: string;
    refreshToken?: string;
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string | null;
    };
}

@Injectable()
export class AuthService {
    private readonly jwtExpiresIn: JwtSignOptions['expiresIn'];
    private readonly refreshExpiresIn: JwtSignOptions['expiresIn'];
    private readonly jwtSecret: string;
    private readonly refreshSecret: string;
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
    ) {
        this.jwtExpiresIn = (process.env.JWT_EXPIRATION as JwtSignOptions['expiresIn']) ?? '3600s';
        this.refreshExpiresIn = (process.env.JWT_REFRESH_EXPIRATION as JwtSignOptions['expiresIn']) ?? '7d';
        this.jwtSecret = process.env.JWT_SECRET ?? 'change-me';
        this.refreshSecret = process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh';
    }

    async login(loginInfo: LoginDto, request: Request, requiredRole?: RoleName): Promise<LoginResponse> {
        const user = await this.validateUser(loginInfo.email, loginInfo.password, request);
        if (!user) {
            this.logger.warn(this.formatLogMessage('auth.login.failure', request, { email: loginInfo.email }));
            throw new UnauthorizedException('Invalid credentials');
        }
        const userRole = user.userRole?.role?.name ?? null;
        if (requiredRole && userRole !== requiredRole) {
            this.logger.warn(
                this.formatLogMessage('auth.login.role_mismatch', request, {
                    userId: user.id,
                    expectedRole: requiredRole,
                    actualRole: userRole,
                }),
            );
            throw new UnauthorizedException('Invalid credentials');
        }
        this.logger.log(this.formatLogMessage('auth.login.success', request, { userId: user.id }));
        const payload = {
            sub: user.id,
            email: user.email,
            role: userRole,
        } as const;
        const accessToken = await this.jwtService.signAsync(payload, {
            expiresIn: this.jwtExpiresIn,
            secret: this.jwtSecret,
        });
        let refreshToken: string | undefined;
        if (loginInfo.rememberMe === true) {
            refreshToken = await this.jwtService.signAsync(payload, {
                expiresIn: this.refreshExpiresIn,
                secret: this.refreshSecret,
            });
        }
        return {
            accessToken,
            refreshToken,
            user: this.mapUser(user),
        };
    }

    async refresh(refreshToken: string, request: Request): Promise<LoginResponse> {
        try {
            const payload = await this.jwtService.verifyAsync<{ sub: string }>(refreshToken, {
                secret: this.refreshSecret,
            });

            const user = await this.userService.findOne(payload.sub);
            const newPayload = {
                sub: user.id,
                email: user.email,
                role: user.userRole?.role?.name ?? null,
            } as const;

            const accessToken = await this.jwtService.signAsync(newPayload, {
                expiresIn: this.jwtExpiresIn,
                secret: this.jwtSecret,
            });
            const nextRefreshToken = await this.jwtService.signAsync(newPayload, {
                expiresIn: this.refreshExpiresIn,
                secret: this.refreshSecret,
            });

            this.logger.log(this.formatLogMessage('auth.refresh.success', request, { userId: user.id }));

            return {
                accessToken,
                refreshToken: nextRefreshToken,
                user: this.mapUser(user),
            };
        } catch (error) {
            this.logger.warn(
                this.formatLogMessage('auth.refresh.failure', request, {
                    message: error instanceof Error ? error.message : 'unknown',
                }),
            );
            throw new UnauthorizedException('Invalid refresh token');
        }
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

    private mapUser(user: UserProfile): LoginResponse['user'] {
        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName ?? null,
        };
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
