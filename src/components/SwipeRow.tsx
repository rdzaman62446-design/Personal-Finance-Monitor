import { Feather } from '@expo/vector-icons';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';

const DELETE_THRESHOLD = 110;

// Swipe left to delete. The row slides off-screen before `onDelete` runs.
export default function SwipeRow({
  children,
  onDelete,
  dangerColor,
  dangerSoft,
}: {
  children: ReactNode;
  onDelete: () => void;
  dangerColor: string;
  dangerSoft: string;
}) {
  const [x] = useState(() => new Animated.Value(0));
  // The pan handlers are created once, so read the latest callback through a ref.
  const onDeleteRef = useRef(onDelete);
  useEffect(() => {
    onDeleteRef.current = onDelete;
  }, [onDelete]);

  // The ref is only read inside the release handler, never during render.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() =>
    PanResponder.create({
      // Only claim clearly horizontal drags so vertical scrolling still works.
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_, g) => x.setValue(Math.min(0, g.dx)),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -DELETE_THRESHOLD || g.vx < -1.2) {
          Animated.timing(x, { toValue: -500, duration: 180, useNativeDriver: true }).start(() => onDeleteRef.current());
        } else {
          Animated.spring(x, { toValue: 0, useNativeDriver: true, bounciness: 10 }).start();
        }
      },
      onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: true }).start(),
    }),
  );

  const iconScale = x.interpolate({
    inputRange: [-DELETE_THRESHOLD, -40, 0],
    outputRange: [1.2, 0.6, 0.6],
    extrapolate: 'clamp',
  });

  return (
    <View>
      <View style={[StyleSheet.absoluteFill, styles.behind, { backgroundColor: dangerSoft }]}>
        <Animated.View style={{ transform: [{ scale: iconScale }] }}>
          <Feather name="trash-2" size={20} color={dangerColor} />
        </Animated.View>
      </View>
      <Animated.View {...pan.panHandlers} style={{ transform: [{ translateX: x }] }}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  behind: { alignItems: 'flex-end', justifyContent: 'center', paddingRight: 24 },
});
