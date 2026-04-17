/**
 * Minimal session singleton. MVP assumes one logged-in teacher per device.
 * Values come from Expo env (EXPO_PUBLIC_*) for development; replace with
 * auth flow before beta.
 */
export const session = {
  academyId: process.env.EXPO_PUBLIC_ACADEMY_ID ?? "",
  teacherId: process.env.EXPO_PUBLIC_TEACHER_ID ?? "",
  academyName: process.env.EXPO_PUBLIC_ACADEMY_NAME ?? "공부방",
};
