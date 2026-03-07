export enum Role {
  RETAILER = 'RETAILER',
  PORT_OPERATOR = 'PORT_OPERATOR',
  TRANSPORT_COORDINATOR = 'TRANSPORT_COORDINATOR',
  SYSTEM_ADMINISTRATOR = 'SYSTEM_ADMINISTRATOR',
}

export interface Credentials {
  username: string;
  password: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
  roles: Role[];
}

export interface TokenValidation {
  valid: boolean;
  userId?: string;
  roles?: Role[];
  expiresAt?: Date;
}

export interface User {
  id: string;
  username: string;
  roles: Role[];
  createdAt: Date;
  updatedAt: Date;
}
