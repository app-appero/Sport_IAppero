import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/** A per-device on/off preference, remembered across launches. Storage failures fall back to the default. */
export function usePersistedBoolean(key: string, defaultValue: boolean): [boolean, () => void] {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (!cancelled && (raw === '1' || raw === '0')) setValue(raw === '1');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [key]);

  const toggle = useCallback(() => {
    setValue((current) => {
      const next = !current;
      AsyncStorage.setItem(key, next ? '1' : '0').catch(() => {});
      return next;
    });
  }, [key]);

  return [value, toggle];
}
