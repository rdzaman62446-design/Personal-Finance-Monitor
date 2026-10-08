import { ReactNode, useEffect, useState } from 'react';
import { Animated, Easing, Pressable, PressableProps, StyleProp, Text, TextStyle, ViewStyle } from 'react-native';

// Shared animation building blocks. Everything here uses React Native's
// built-in Animated API, so it ships over the air with no new native code.

type PressableScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  children: ReactNode;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// A button that springs down slightly while pressed.
export function PressableScale({ style, scaleTo = 0.95, children, ...rest }: PressableScaleProps) {
  const [scale] = useState(() => new Animated.Value(1));
  const spring = (toValue: number) =>
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness: 8 }).start();
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        spring(scaleTo);
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        spring(1);
        rest.onPressOut?.(e);
      }}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}

// Fades and slides its children up when first mounted. `delay` staggers lists.
export function FadeInView({
  delay = 0,
  from = 14,
  style,
  children,
}: {
  delay?: number;
  from?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 380,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress, delay]);
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [from, 0] });
  return <Animated.View style={[style, { opacity: progress, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

// Text that counts smoothly from its previous value to the new one.
export function AnimatedNumber({
  value,
  format,
  style,
  numberOfLines,
}: {
  value: number;
  format: (n: number) => string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const [anim] = useState(() => new Animated.Value(0));
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setDisplay(v));
    return () => anim.removeListener(id);
  }, [anim]);
  useEffect(() => {
    Animated.timing(anim, {
      toValue: value,
      duration: 700,
      // poly(4) ends exactly at 1. (Easing.exp stops at 0.999, showing ₱99.90 for ₱100.)
      easing: Easing.out(Easing.poly(4)),
      useNativeDriver: false,
    }).start(({ finished }) => {
      // Land on the exact value so rounding in the animation never shows.
      if (finished) setDisplay(value);
    });
  }, [anim, value]);
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {format(display)}
    </Text>
  );
}

// A progress bar whose fill grows to `percent` (0–100).
export function AnimatedBar({
  percent,
  color,
  trackColor,
  height = 8,
  delay = 0,
}: {
  percent: number;
  color: string;
  trackColor: string;
  height?: number;
  delay?: number;
}) {
  const [width] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(width, {
      toValue: Math.max(0, Math.min(100, percent)),
      duration: 800,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [width, percent, delay]);
  return (
    <Animated.View style={{ height, borderRadius: 999, overflow: 'hidden', backgroundColor: trackColor }}>
      <Animated.View
        style={{
          height: '100%',
          borderRadius: 999,
          backgroundColor: color,
          width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
        }}
      />
    </Animated.View>
  );
}
