import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Animated,
  PanResponder,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { RootStackParamList, Medicine } from '../types';
import { useMedicines } from '../hooks/useMedicines';
import MedicineCard from '../components/MedicineCard';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Simple swipeable row with delete reveal
function SwipeableRow({
  medicine,
  onPress,
  onToggleActive,
  onDelete,
}: {
  medicine: Medicine;
  onPress: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [swiped, setSwiped] = useState(false);
  const DELETE_THRESHOLD = -80;
  const OPEN_OFFSET = -80;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, { dx, dy }) => {
      return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8;
    },
    onPanResponderMove: (_, { dx }) => {
      const newX = (swiped ? OPEN_OFFSET : 0) + dx;
      translateX.setValue(Math.max(Math.min(newX, 0), -120));
    },
    onPanResponderRelease: (_, { dx }) => {
      const currentX = swiped ? OPEN_OFFSET + dx : dx;
      if (currentX < DELETE_THRESHOLD) {
        Animated.spring(translateX, { toValue: OPEN_OFFSET, useNativeDriver: true }).start();
        setSwiped(true);
      } else {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        setSwiped(false);
      }
    },
  });

  const closeSwipe = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    setSwiped(false);
  };

  return (
    <View style={swipeStyles.wrapper}>
      {/* Delete button revealed on swipe */}
      <TouchableOpacity
        style={swipeStyles.deleteBtn}
        onPress={() => {
          closeSwipe();
          onDelete();
        }}
      >
        <Ionicons name="trash" size={22} color="#FFF" />
        <Text style={swipeStyles.deleteBtnText}>삭제</Text>
      </TouchableOpacity>

      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        <MedicineCard
          medicine={medicine}
          onPress={() => {
            closeSwipe();
            onPress();
          }}
          onToggleActive={() => {
            closeSwipe();
            onToggleActive();
          }}
        />
      </Animated.View>
    </View>
  );
}

const swipeStyles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 18,
    marginVertical: 6,
  },
  deleteBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  deleteBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});

export default function MedicineListScreen() {
  const navigation = useNavigation<Nav>();
  const { medicines, isLoading, deleteMedicine, toggleActive } = useMedicines();

  const handleDelete = (medicine: Medicine) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      '약 삭제',
      `"${medicine.name}"을(를) 삭제하시겠어요?\n복용 기록도 모두 삭제됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => deleteMedicine(medicine.id),
        },
      ]
    );
  };

  const handleToggleActive = (medicine: Medicine) => {
    Haptics.selectionAsync();
    toggleActive(medicine.id);
  };

  const handlePress = (medicine: Medicine) => {
    navigation.navigate('MedicineForm', { medicineId: medicine.id });
  };

  if (medicines.length === 0 && !isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>내 약 목록</Text>
          <TouchableOpacity
            style={styles.addFab}
            onPress={() => navigation.navigate('MedicineForm', undefined)}
          >
            <Ionicons name="add" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.empty}>
          <Ionicons name="medical-outline" size={72} color="#D0D0D0" />
          <Text style={styles.emptyTitle}>등록된 약이 없어요</Text>
          <Text style={styles.emptyDesc}>
            약을 등록하면 정해진 시간에{'\n'}복용 알림을 드려요
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => navigation.navigate('MedicineForm', undefined)}
          >
            <Ionicons name="add-circle" size={18} color="#FFF" />
            <Text style={styles.emptyBtnText}>첫 약 등록하기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>내 약 목록</Text>
        <TouchableOpacity
          style={styles.addFab}
          onPress={() => navigation.navigate('MedicineForm', undefined)}
        >
          <Ionicons name="add" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={medicines}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <SwipeableRow
            medicine={item}
            onPress={() => handlePress(item)}
            onToggleActive={() => handleToggleActive(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
        ListFooterComponent={<View style={{ height: 24 }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F4F6FB',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F4F6FB',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 27,
    fontWeight: '800',
    color: '#1A1D2B',
    letterSpacing: -0.5,
  },
  addFab: {
    backgroundColor: '#4A6CF7',
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4A6CF7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  list: {
    padding: 16,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#555',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  emptyBtn: {
    flexDirection: 'row',
    backgroundColor: '#4A6CF7',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 13,
    alignItems: 'center',
    gap: 8,
  },
  emptyBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
