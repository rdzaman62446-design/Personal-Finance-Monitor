import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';

import { Theme } from '../theme';

export type ToastData = { id: number; message: string; actionLabel?: string; onAction?: () => void };

// A snackbar that slides up from the bottom and hides itself after a few seconds.
export default function Toast({
  theme: t,
  toast,
  onHide,
}: {
  theme: Theme;
  toast: ToastData | null;
  onHide: () => void;
}) {
  const [y] = useState(() => new Animated.Value(120));

  useEffect(() => {
    if (!toast) return;
    y.setValue(120);
    Animated.spring(y, { toValue: 0, useNativeDriver: true, bounciness: 9, speed: 14 }).start();
    const timer = setTimeout(() => {
      Animated.timing(y, { toValue: 120, duration: 220, useNativeDriver: true }).start(() => onHide());
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast, y, onHide]);

  if (!toast) return null;

  return (
    <Animated.View
      style={[styles.toast, { backgroundColor: t.text, transform: [{ translateY: y }] }]}
      pointerEvents="box-none"
    >
      <Text style={[styles.message, { color: t.bg }]} numberOfLines={2}>
        {toast.message}
      </Text>
      {toast.actionLabel && (
        <Pressable
          hitSlop={10}
          onPress={() => {
            toast.onAction?.();
            onHide();
          }}
        >
          <Text style={[styles.action, { color: t.accent }]}>{toast.actionLabel}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  message: { flex: 1, fontSize: 13, fontWeight: '500' },
  action: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
});
