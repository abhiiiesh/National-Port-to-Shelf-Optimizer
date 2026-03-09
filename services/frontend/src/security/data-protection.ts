export interface SensitiveDataPolicy {
  maskChar: string;
  visibleTailLength: number;
}

export const defaultSensitiveDataPolicy: SensitiveDataPolicy = {
  maskChar: '*',
  visibleTailLength: 4,
};

export const maskSensitiveValue = (
  value: string,
  policy: SensitiveDataPolicy = defaultSensitiveDataPolicy
): string => {
  const tail = value.slice(-policy.visibleTailLength);
  const maskLength = Math.max(0, value.length - policy.visibleTailLength);
  return `${policy.maskChar.repeat(maskLength)}${tail}`;
};

export const redactLogPayload = (payload: Record<string, unknown>): Record<string, unknown> => {
  const redacted: Record<string, unknown> = {};

  Object.entries(payload).forEach(([key, value]) => {
    if (/(token|password|secret|authorization)/i.test(key)) {
      redacted[key] = '[REDACTED]';
      return;
    }

    redacted[key] = value;
  });

  return redacted;
};

export interface AuditableAction {
  action: 'APPROVE_SLOT' | 'OVERRIDE_ETA' | 'FINALIZE_AUCTION';
  actorUserId: string;
  tenantId: string;
  referenceId: string;
  comment?: string;
}

export const buildAuditMessage = (event: AuditableAction): string => {
  const commentSegment = event.comment ? ` comment="${event.comment}"` : '';
  return `[AUDIT] action=${event.action} actor=${event.actorUserId} tenant=${event.tenantId} ref=${event.referenceId}${commentSegment}`;
};
