import * as Updates from 'expo-updates';

export interface UpdateResult {
  isAvailable: boolean;
  isError: boolean;
  errorMessage?: string;
}

/**
 * EAS OTA 업데이트를 확인하고 있으면 다운로드 후 재시작.
 * 개발 환경(expo go / dev client)에서는 무조건 스킵.
 */
export async function checkAndApplyUpdate(): Promise<UpdateResult> {
  // 개발 빌드 또는 Expo Go에서는 OTA 업데이트 불필요
  if (__DEV__ || Updates.isEmbeddedLaunch === undefined) {
    return { isAvailable: false, isError: false };
  }

  try {
    const check = await Updates.checkForUpdateAsync();

    if (!check.isAvailable) {
      return { isAvailable: false, isError: false };
    }

    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();

    return { isAvailable: true, isError: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('[Update] OTA check failed:', message);
    return { isAvailable: false, isError: true, errorMessage: message };
  }
}

/** 현재 실행 중인 번들 정보를 반환 */
export function getBuildInfo(): {
  updateId: string | null;
  channel: string | null;
  runtimeVersion: string | null;
  isEmbedded: boolean;
} {
  return {
    updateId: Updates.updateId ?? null,
    channel: Updates.channel ?? null,
    runtimeVersion: Updates.runtimeVersion ?? null,
    isEmbedded: Updates.isEmbeddedLaunch ?? true,
  };
}
