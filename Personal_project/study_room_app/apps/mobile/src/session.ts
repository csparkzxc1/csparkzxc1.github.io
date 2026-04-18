import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "study_room.session";

export interface Session {
  academyId: string;
  teacherId: string;
  academyName: string;
  teacherPhone: string;
}

/**
 * Mutable session singleton populated from AsyncStorage at app boot.
 * Screens read from this directly. Onboarding flow writes to it via
 * installSession() after calling /api/onboarding/setup.
 */
export const session: Session = {
  academyId: "",
  teacherId: "",
  academyName: "",
  teacherPhone: "",
};

export async function loadSession(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  try {
    Object.assign(session, JSON.parse(raw));
    return Boolean(session.academyId && session.teacherId);
  } catch {
    return false;
  }
}

export async function installSession(next: Session): Promise<void> {
  Object.assign(session, next);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function clearSession(): Promise<void> {
  Object.assign(session, {
    academyId: "",
    teacherId: "",
    academyName: "",
    teacherPhone: "",
  });
  await AsyncStorage.removeItem(STORAGE_KEY);
}
