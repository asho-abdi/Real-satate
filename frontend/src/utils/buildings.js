/** Match SIHAM / SIHAAM building by name or code. */
export function findSihamBuilding(buildings = []) {
  return (
    buildings.find((b) => {
      const hay = `${b.name || ''} ${b.code || ''}`.toLowerCase();
      return hay.includes('siham') || hay.includes('sihaam');
    }) || null
  );
}
