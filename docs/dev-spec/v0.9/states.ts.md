export function updateFortify(unit:any): void {
  unit.fortified = (!unit.hasMovedThisTurn && !unit.hasAttackedThisTurn);
}

export function healUnit(unit:any, inCity:boolean): void {
  if (unit.hasMovedThisTurn || unit.hasAttackedThisTurn) return;
  unit.hp = Math.min(unit.maxHP, unit.hp + (inCity ? 5 : 3));
}