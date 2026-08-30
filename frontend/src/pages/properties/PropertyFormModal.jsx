import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../../components/ui/Modal.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Button from '../../components/ui/Button.jsx';
import ImageUploader from '../../components/properties/ImageUploader.jsx';
import { getAmenities, listOwners, listAgents } from '../../services/dataService.js';
import { mockCategories, mockPropertyTypes } from '../../services/mockData.js';

const STATUS_OPTIONS = ['Available', 'Occupied', 'Pending', 'Sold', 'Rented'];

const defaultValues = {
  title: '',
  code: '',
  category: 'Residential',
  type: 'Apartment',
  status: 'Available',
  price: '',
  rent: '',
  bedrooms: 0,
  bathrooms: 0,
  area: '',
  city: '',
  address: '',
  ownerId: '',
  agentId: '',
  description: '',
  lat: '',
  lng: '',
  amenities: [],
};

export default function PropertyFormModal({ open, onClose, property, onSubmit, saving = false }) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({ defaultValues });

  const [owners, setOwners] = useState([]);
  const [agents, setAgents] = useState([]);
  const [amenityOptions, setAmenityOptions] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const selectedAmenities = watch('amenities') || [];
  const selectedCategory = watch('category');

  const typeOptions = mockPropertyTypes.filter(
    (pt) =>
      !selectedCategory ||
      mockCategories.find((c) => c.name === selectedCategory)?.id === pt.categoryId ||
      selectedCategory === 'Mixed-Use',
  );

  useEffect(() => {
    if (!open) return;

    Promise.all([listOwners(), listAgents(), getAmenities()]).then(([ownersRes, agentsRes, amenities]) => {
      setOwners(ownersRes.data || []);
      setAgents(agentsRes.data || []);
      setAmenityOptions(amenities);
    });

    if (property) {
      reset({
        title: property.title || '',
        code: property.code || '',
        category: property.category || 'Residential',
        type: property.type || 'Apartment',
        status: property.status || 'Available',
        price: property.price ?? '',
        rent: property.rent ?? '',
        bedrooms: property.bedrooms ?? 0,
        bathrooms: property.bathrooms ?? 0,
        area: property.area ?? '',
        city: property.city || '',
        address: property.address || '',
        ownerId: property.ownerId || '',
        agentId: property.agentId || '',
        description: property.description || '',
        lat: property.lat ?? '',
        lng: property.lng ?? '',
        amenities: property.amenities || [],
      });
      setImageFiles([]);
    } else {
      reset(defaultValues);
      setImageFiles([]);
    }
  }, [open, property, reset]);

  function toggleAmenity(name) {
    const next = selectedAmenities.includes(name)
      ? selectedAmenities.filter((a) => a !== name)
      : [...selectedAmenities, name];
    setValue('amenities', next, { shouldDirty: true });
  }

  function submit(values) {
    const owner = owners.find((o) => o.id === values.ownerId);
    const agent = agents.find((a) => a.id === values.agentId);
    const existingImages = property?.images || [];

    const payload = {
      ...values,
      price: Number(values.price) || 0,
      rent: Number(values.rent) || 0,
      bedrooms: Number(values.bedrooms) || 0,
      bathrooms: Number(values.bathrooms) || 0,
      area: Number(values.area) || 0,
      lat: values.lat === '' ? null : Number(values.lat),
      lng: values.lng === '' ? null : Number(values.lng),
      owner: owner?.name || property?.owner || '',
      agent: agent?.name || property?.agent || '',
      images: existingImages,
      priceHistory: property?.priceHistory || [
        { date: new Date().toISOString().slice(0, 10), price: Number(values.price) || 0 },
      ],
      imageFiles,
    };

    onSubmit?.(payload);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={property ? 'Edit property' : 'Add property'}
      size="xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={handleSubmit(submit)}>
            {property ? 'Save changes' : 'Create property'}
          </Button>
        </div>
      }
    >
      <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(submit)}>
        <div className="md:col-span-2">
          <Input
            label="Title"
            error={errors.title?.message}
            {...register('title', { required: 'Title is required' })}
          />
        </div>
        <Input
          label="Code"
          error={errors.code?.message}
          {...register('code', { required: 'Code is required' })}
        />
        <Select label="Status" {...register('status')}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select label="Category" {...register('category')}>
          {mockCategories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select label="Type" {...register('type')}>
          {(typeOptions.length ? typeOptions : mockPropertyTypes).map((t) => (
            <option key={t.id} value={t.name}>
              {t.name}
            </option>
          ))}
        </Select>
        <Input label="Sale price (AED)" type="number" {...register('price')} />
        <Input label="Annual rent (AED)" type="number" {...register('rent')} />
        <Input label="Bedrooms" type="number" {...register('bedrooms')} />
        <Input label="Bathrooms" type="number" {...register('bathrooms')} />
        <Input label="Area (sqft)" type="number" {...register('area')} />
        <Input label="City" {...register('city')} />
        <div className="md:col-span-2">
          <Input label="Address" {...register('address')} />
        </div>
        <Select label="Owner" {...register('ownerId')}>
          <option value="">Select owner</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Select>
        <Select label="Agent" {...register('agentId')}>
          <option value="">Select agent</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
        <Input label="Latitude" type="number" step="any" {...register('lat')} />
        <Input label="Longitude" type="number" step="any" {...register('lng')} />

        <div className="md:col-span-2">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--text)]">Description</span>
            <textarea
              rows={4}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              {...register('description')}
            />
          </label>
        </div>

        <div className="md:col-span-2 space-y-2">
          <p className="text-sm font-medium text-[var(--text)]">Amenities</p>
          <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto rounded-xl border border-[var(--border)] p-3">
            {amenityOptions.map((name) => {
              const active = selectedAmenities.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleAmenity(name)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    active
                      ? 'bg-brand-700 text-white dark:bg-brand-400 dark:text-ink-950'
                      : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="md:col-span-2">
          <ImageUploader
            value={imageFiles}
            onChange={({ files }) => setImageFiles(files)}
          />
          {property?.images?.length ? (
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Existing gallery ({property.images.length} images) is kept; new uploads attach for local preview.
            </p>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}
