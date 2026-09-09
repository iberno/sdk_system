export type UserRoleType = 'ADMIN' | 'MANAGER' | 'AGENT' | 'USER';

export interface UserContext {
  sub: string;
  email: string;
  name: string;
  role: UserRoleType;
  companyId: string | null;
  solverGroupId: string | null;
  locale?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRoleType;
  companyId: string | null;
  solverGroupId: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
}
