import { PropertyManagementModule } from "../../components/property-management/property-management-module";
import { fetchPropertyHydration } from "../../services/property-data";

export default async function PropertiesPage() {
  const hydration = await fetchPropertyHydration();

  if (!hydration) {
    return <PropertyManagementModule dataSourceLabel="Demo data (configure .env.local anon key)" />;
  }

  return (
    <PropertyManagementModule
      initialBuildings={hydration.buildings}
      initialFloors={hydration.floors}
      initialUnits={hydration.units}
      initialCategories={hydration.categories}
      initialAmenities={hydration.amenities}
      initialImages={hydration.images}
      dataSourceLabel="Supabase real_estate schema"
    />
  );
}
