import {
  InterstitialAd,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';
import { getAdRemoved } from './databaseService';

// ─── Ad Unit IDs ─────────────────────────────────────────────────────────────

export const AD_CONFIG = {
  BANNER_ID:
    Platform.OS === 'ios'
      ? 'ca-app-pub-3940256099942544/2934735716'
      : 'ca-app-pub-3940256099942544/6300978111',
  INTERSTITIAL_ID:
    Platform.OS === 'ios'
      ? 'ca-app-pub-3940256099942544/4411468910'
      : 'ca-app-pub-3940256099942544/1033173712',
} as const;

// ─── Interstitial Ad ─────────────────────────────────────────────────────────

let interstitialAd: InterstitialAd | null = null;
let isInterstitialLoaded = false;
let calendarOpenCount = 0;

function loadInterstitial(): void {
  try {
    interstitialAd = InterstitialAd.createForAdRequest(AD_CONFIG.INTERSTITIAL_ID, {
      requestNonPersonalizedAdsOnly: true,
    });

    interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
      isInterstitialLoaded = true;
    });

    interstitialAd.addAdEventListener(AdEventType.ERROR, () => {
      isInterstitialLoaded = false;
      interstitialAd = null;
    });

    interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      isInterstitialLoaded = false;
      interstitialAd = null;
      // Preload next
      loadInterstitial();
    });

    interstitialAd.load();
  } catch (error) {
    console.error('[AdService] loadInterstitial error:', error);
  }
}

export function initAds(): void {
  loadInterstitial();
}

export async function showCalendarInterstitial(): Promise<void> {
  try {
    const adRemoved = await getAdRemoved();
    if (adRemoved) return;

    calendarOpenCount += 1;

    // Show every 3rd open
    if (calendarOpenCount % 3 !== 0) return;

    if (isInterstitialLoaded && interstitialAd) {
      await interstitialAd.show();
    }
  } catch (error) {
    // Silently fail — never interrupt user
    console.error('[AdService] showCalendarInterstitial error:', error);
  }
}
