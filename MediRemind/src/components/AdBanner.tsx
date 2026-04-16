import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { getAdRemoved } from '../services/databaseService';
import { AD_CONFIG } from '../services/adService';

export default function AdBanner() {
  const [adRemoved, setAdRemoved] = useState(false);
  const [adError, setAdError] = useState(false);

  useEffect(() => {
    getAdRemoved().then(setAdRemoved);
  }, []);

  if (adRemoved || adError) return null;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={AD_CONFIG.BANNER_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={() => setAdError(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
});
