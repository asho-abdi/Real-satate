import { useEffect, useState } from 'react';
import { getCatalog } from '../../services/publicApi.js';

export function useCatalog() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getCatalog()
      .then((catalog) => {
        if (alive) setData(catalog);
      })
      .catch((err) => {
        if (alive) setError(err.message || 'Could not load properties');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { data, error, loading };
}
