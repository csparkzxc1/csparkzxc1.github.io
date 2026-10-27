import React from 'react';
import { useNavigation } from '@react-navigation/native';
import Paywall from '../components/Paywall';

export default function PaywallScreen() {
  const navigation = useNavigation();
  return <Paywall dismissible onDismiss={() => navigation.goBack()} />;
}
