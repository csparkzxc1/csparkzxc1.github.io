/**
 * What the family I watch did today, for the settings row and the home
 * banner. Loads on focus; nothing is fetched until the user has linked up.
 */
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { dateKey } from '../lib/schedule';
import { getLinks, isActive, patientHistory, type Patient } from './guardian';
import { todaySummary, type TodaySummary } from './slots';

export interface FamilyMember extends TodaySummary {
  patient: Patient;
}

// Kept between screens so a revisit doesn't flash empty.
let cache: FamilyMember[] | null = null;

export function useFamilySummary(): FamilyMember[] | null {
  const [family, setFamily] = useState<FamilyMember[] | null>(cache);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        if (!(await isActive())) return;
        const links = await getLinks();
        if (!links) return;
        const now = new Date();
        const today = dateKey(now);
        const members = await Promise.all(
          links.patients.map(async (p) => ({
            patient: p,
            ...todaySummary(await patientHistory(p.id, 1), today, now, p.alertDelay),
          }))
        );
        cache = members;
        if (alive) setFamily(members);
      })().catch((e) => console.warn('[family] summary failed', e));
      return () => {
        alive = false;
      };
    }, [])
  );

  return family;
}
