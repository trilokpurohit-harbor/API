import { CanActivate, ExecutionContext, ForbiddenException, Injectable, mixin, Type } from '@nestjs/common';
import { UserType } from '@prisma/client';
import type { Request } from 'express';

type RequestWithUser = Request & { user?: { type?: string | UserType } };

export function UserTypeGuard(...allowedTypes: UserType[]): Type<CanActivate> {
    const normalizedAllowed = allowedTypes.map((type) => type.toLowerCase() as UserType);

    @Injectable()
    class UserTypeGuardMixin implements CanActivate {
        canActivate(context: ExecutionContext): boolean {
            if (normalizedAllowed.length === 0) {
                return true;
            }

            const request = context.switchToHttp().getRequest<RequestWithUser>();
            const userType = request.user?.type;
            const normalizedType = typeof userType === 'string' ? (userType.toLowerCase() as UserType) : userType;

            if (!normalizedType || !normalizedAllowed.includes(normalizedType)) {
                throw new ForbiddenException('Insufficient user type permissions for this resource');
            }

            return true;
        }
    }

    return mixin(UserTypeGuardMixin);
}
