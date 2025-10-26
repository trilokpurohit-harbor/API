import { CanActivate, ExecutionContext, ForbiddenException, Injectable, mixin, Type } from '@nestjs/common';
import type { Request } from 'express';
import { RoleName } from '@common/enums/role-name.enum';

type RequestWithUser = Request & { user?: { role?: string | RoleName } };

export function RolesGuard(...allowedRoles: RoleName[]): Type<CanActivate> {
    const normalizedAllowed = allowedRoles.map((role) => role.toLowerCase() as RoleName);

    @Injectable()
    class RolesGuardMixin implements CanActivate {
        canActivate(context: ExecutionContext): boolean {
            if (normalizedAllowed.length === 0) {
                return true;
            }

            const request = context.switchToHttp().getRequest<RequestWithUser>();
            const userRole = request.user?.role;
            const normalizedRole = typeof userRole === 'string' ? (userRole.toLowerCase() as RoleName) : userRole;

            if (!normalizedRole || !normalizedAllowed.includes(normalizedRole)) {
                throw new ForbiddenException('Insufficient role permissions for this resource');
            }

            return true;
        }
    }

    return mixin(RolesGuardMixin);
}
