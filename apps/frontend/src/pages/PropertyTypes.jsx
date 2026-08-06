import toast from 'react-hot-toast';
import CrudPage from '../components/ui/CrudPage.jsx';
import { mockPropertyTypes, mockCategories } from '../services/mockData.js';

const categoryName = Object.fromEntries(mockCategories.map((c) => [c.id, c.name]));

export default function PropertyTypes() {
  const rows = mockPropertyTypes.map((row) => ({
    ...row,
    category: categoryName[row.categoryId] || row.categoryId,
  }));

  return (
    <CrudPage
      title="Property types"
      subtitle="Specific listing types nested under categories."
      breadcrumbs={[{ label: 'Inventory' }, { label: 'Property Types' }]}
      rows={rows}
      searchKeys={['name', 'description', 'category']}
      primaryAction={{ label: 'Add type', onClick: () => toast('Property type form coming soon') }}
      columns={[
        { key: 'name', label: 'Type' },
        { key: 'category', label: 'Category' },
        { key: 'description', label: 'Description' },
      ]}
    />
  );
}
