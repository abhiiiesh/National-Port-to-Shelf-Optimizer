import { Role } from '@port-to-shelf/shared-types';

export interface AuthorizationContext {
  userId: string;
  roles: Role[];
}

export interface ResourcePermissions {
  resource: string;
  action: string;
  requiredRoles: Role[];
}

/**
 * Authorization service for role-based access control
 */
export class AuthorizationService {
  private permissions: Map<string, ResourcePermissions>;

  constructor() {
    this.permissions = new Map();
    this.initializePermissions();
  }

  /**
   * Check if user is authorized to perform action on resource
   */
  authorize(context: AuthorizationContext, resource: string, action: string): boolean {
    const isKnownResource = Array.from(this.permissions.values()).some(
      (permission) => permission.resource === resource
    );

    // System administrators have access to all known resources except for retailer-only bidding.
    if (
      context.roles.includes(Role.SYSTEM_ADMINISTRATOR) &&
      isKnownResource &&
      !(resource === 'auction' && action === 'bid')
    ) {
      return true;
    }

    const key = this.getPermissionKey(resource, action);
    const permission = this.permissions.get(key);

    if (!permission) {
      // If no specific permission is defined, deny by default
      return false;
    }

    // Check if user has any of the required roles
    return permission.requiredRoles.some((role) => context.roles.includes(role));
  }

  /**
   * Check if user has specific role
   */
  hasRole(context: AuthorizationContext, role: Role): boolean {
    return context.roles.includes(role);
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(context: AuthorizationContext, roles: Role[]): boolean {
    return roles.some((role) => context.roles.includes(role));
  }

  /**
   * Check if user has all of the specified roles
   */
  hasAllRoles(context: AuthorizationContext, roles: Role[]): boolean {
    return roles.every((role) => context.roles.includes(role));
  }

  /**
   * Register a permission
   */
  registerPermission(resource: string, action: string, requiredRoles: Role[]): void {
    const key = this.getPermissionKey(resource, action);
    this.permissions.set(key, { resource, action, requiredRoles });
  }

  /**
   * Initialize default permissions
   */
  private initializePermissions(): void {
    // Vessel tracking permissions
    this.registerPermission('vessel', 'read', [
      Role.PORT_OPERATOR,
      Role.TRANSPORT_COORDINATOR,
      Role.SYSTEM_ADMINISTRATOR,
    ]);
    this.registerPermission('vessel', 'write', [
      Role.PORT_OPERATOR,
      Role.SYSTEM_ADMINISTRATOR,
    ]);

    // Container tracking permissions
    this.registerPermission('container', 'read', [
      Role.RETAILER,
      Role.PORT_OPERATOR,
      Role.TRANSPORT_COORDINATOR,
      Role.SYSTEM_ADMINISTRATOR,
    ]);
    this.registerPermission('container', 'write', [
      Role.PORT_OPERATOR,
      Role.TRANSPORT_COORDINATOR,
      Role.SYSTEM_ADMINISTRATOR,
    ]);

    // Auction permissions
    this.registerPermission('auction', 'read', [
      Role.RETAILER,
      Role.TRANSPORT_COORDINATOR,
      Role.SYSTEM_ADMINISTRATOR,
    ]);
    this.registerPermission('auction', 'create', [
      Role.TRANSPORT_COORDINATOR,
      Role.SYSTEM_ADMINISTRATOR,
    ]);
    this.registerPermission('auction', 'bid', [Role.RETAILER]);

    // Slot management permissions
    this.registerPermission('slot', 'read', [
      Role.RETAILER,
      Role.TRANSPORT_COORDINATOR,
      Role.SYSTEM_ADMINISTRATOR,
    ]);
    this.registerPermission('slot', 'write', [
      Role.TRANSPORT_COORDINATOR,
      Role.SYSTEM_ADMINISTRATOR,
    ]);

    // User management permissions
    this.registerPermission('user', 'read', [Role.SYSTEM_ADMINISTRATOR]);
    this.registerPermission('user', 'write', [Role.SYSTEM_ADMINISTRATOR]);

    // Reports permissions
    this.registerPermission('report', 'read', [
      Role.TRANSPORT_COORDINATOR,
      Role.SYSTEM_ADMINISTRATOR,
    ]);
  }

  /**
   * Get permission key
   */
  private getPermissionKey(resource: string, action: string): string {
    return `${resource}:${action}`;
  }
}
