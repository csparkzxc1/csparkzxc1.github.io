/** Node stub for expo-sqlite: pure-logic tests never open the database. */
export async function openDatabaseAsync(): Promise<never> {
  throw new Error('expo-sqlite is mocked in tests; DB access is not available');
}
