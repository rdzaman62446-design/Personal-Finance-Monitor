import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

// Persists a JSON value under `key`. `loaded` is false until the first read
// finishes, so callers can avoid overwriting saved data with the default.
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (raw != null) setValue(JSON.parse(raw));
      })
      .catch((e) => console.error(`Failed to load ${key}:`, e))
      .finally(() => setLoaded(true));
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(key, JSON.stringify(value)).catch((e) =>
      console.error(`Failed to save ${key}:`, e),
    );
  }, [key, value, loaded]);

  return [value, setValue, loaded] as const;
}
