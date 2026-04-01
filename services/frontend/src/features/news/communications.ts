export type BulletinSeverity = 'Critical' | 'Warning' | 'Info';

export interface EscalationRoute {
  id: string;
  name: string;
  owner: string;
}

export interface CommunicationTemplate {
  id: string;
  name: string;
  bodyPrefix: string;
}

export const resolveEffectiveRoute = (
  severities: BulletinSeverity[],
  selectedRouteId: string,
  routes: EscalationRoute[]
): EscalationRoute => {
  const hasCriticalBulletin = severities.includes('Critical');
  const autoRoute = hasCriticalBulletin
    ? routes.find((route) => route.id === 'ROUTE-OPS-2')
    : undefined;

  return autoRoute ?? routes.find((route) => route.id === selectedRouteId) ?? routes[0];
};

export const buildBulletinPreview = (
  templateId: string,
  templates: CommunicationTemplate[],
  title: string
): string => {
  const selectedTemplate = templates.find((template) => template.id === templateId) ?? templates[0];
  return `${selectedTemplate.bodyPrefix} ${title}`;
};
