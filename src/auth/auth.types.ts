import { UserRole } from '@prisma/client';

export interface AccessTokenPayload {
  sub: string;
  tenantId: string;
  roles: UserRole[];
}
