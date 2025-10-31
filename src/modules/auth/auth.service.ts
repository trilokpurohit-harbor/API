import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { UserProfile, UserService } from '../user/user.service';
import { UserType } from '@prisma/client';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

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
    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        @InjectPinoLogger(AuthService.name) private readonly logger: PinoLogger,
    ) {
        this.jwtExpiresIn = (process.env.JWT_EXPIRATION as JwtSignOptions['expiresIn']) ?? '3600s';
        this.refreshExpiresIn = (process.env.JWT_REFRESH_EXPIRATION as JwtSignOptions['expiresIn']) ?? '7d';
        this.jwtSecret = process.env.JWT_SECRET ?? 'change-me';
        this.refreshSecret = process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh';
    }

    async login(loginInfo: LoginDto, requiredType: UserType): Promise<LoginResponse> {
        const user = await this.validateUser(loginInfo.email, loginInfo.password, requiredType);
        if (!user) {
            this.logger.warn('Authentication failed');
            throw new UnauthorizedException('Invalid credentials');
        }
        const userType = user.type;
        if (requiredType && userType !== requiredType) {
            this.logger.warn('User type mismatch');
            throw new UnauthorizedException('Invalid credentials');
        }
        this.logger.info(`User authenticated successfully ${user.email}`);
        const payload = {
            sub: user.id,
            email: user.email,
            type: userType,
            role: user.userRole?.role?.name ?? null,
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

    async refresh(refreshToken: string): Promise<LoginResponse> {
        try {
            const payload = await this.jwtService.verifyAsync<{ sub: string }>(refreshToken, {
                secret: this.refreshSecret,
            });

            const user = await this.userService.findOne(payload.sub);
            const newPayload = {
                sub: user.id,
                email: user.email,
                type: user.type,
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

            this.logger.info('Refresh token issued');

            return {
                accessToken,
                refreshToken: nextRefreshToken,
                user: this.mapUser(user),
            };
        } catch (error) {
            this.logger.error('Refresh token validation failed', error);
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    async validateUser(email: string, password: string, requiredType: UserType): Promise<UserProfile | null> {
        const user = await this.userService.findActiveUserForLogin(email, requiredType);
        if (!user) {
            return null;
        }
        const isPasswordValid = await compare(password, user.passwordHash);
        if (!isPasswordValid) {
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
}
