import { EntityType, ActionType } from '@prisma/client';

function normalizeEnumName(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getEntityActionsMap() {
  const entities = Object.keys(EntityType) as (keyof typeof EntityType)[];
  const actions = Object.keys(ActionType) as (keyof typeof ActionType)[];

  return entities.map((entity) => ({
    entity: normalizeEnumName(entity),
    actions: actions.map((action) => normalizeEnumName(action)),
  }));
}
