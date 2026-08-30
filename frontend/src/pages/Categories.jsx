import toast from 'react-hot-toast';
import CrudPage from '../components/ui/CrudPage.jsx';
import { mockCategories } from '../services/mockData.js';

export default function Categories() {
  return (
    <CrudPage
      title="Categories"
      subtitle="Top-level asset groupings for your inventory."
      breadcrumbs={[{ label: 'Inventory' }, { label: 'Categories' }]}
      rows={mockCategories}
      searchKeys={['name', 'description']}
      primaryAction={{ label: 'Add category', onClick: () => toast('Category form coming soon') }}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'description', label: 'Description' },
        { key: 'propertyCount', label: 'Properties' },
      ]}
    />
  );
}
