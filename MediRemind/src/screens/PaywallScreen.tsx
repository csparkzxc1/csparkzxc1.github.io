import React from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../types';
import Paywall from '../components/Paywall';

export default function PaywallScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'Paywall'>>();
  return <Paywall reason={route.params?.reason} onDismiss={() => navigation.goBack()} />;
}
