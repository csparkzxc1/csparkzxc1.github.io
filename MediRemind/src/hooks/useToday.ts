import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { dateKey } from '../lib/schedule';

/** Today's 'YYYY-MM-DD', updated when the app returns after midnight. */
export function useToday(): string {
  const [today, setToday] = useState(() => dateKey(new Date()));
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setToday(dateKey(new Date()));
    });
    const timer = setInterval(() => setToday(dateKey(new Date())), 60_000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);
  return today;
}
