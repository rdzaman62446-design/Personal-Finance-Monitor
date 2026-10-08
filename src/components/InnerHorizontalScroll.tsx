import { createContext, ReactNode, useContext } from 'react';
import { ScrollView, ScrollViewProps } from 'react-native';

// Lets a horizontal list inside a swipeable page pause the page pager while the
// user's finger is on it, so swiping the list scrolls the list instead of the page.
export const PagerLockContext = createContext<(locked: boolean) => void>(() => {});

export default function InnerHorizontalScroll({ children, ...rest }: ScrollViewProps & { children: ReactNode }) {
  const setLocked = useContext(PagerLockContext);
  const unlock = () => setLocked(false);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      nestedScrollEnabled
      {...rest}
      onTouchStart={() => setLocked(true)}
      onTouchEnd={unlock}
      onTouchCancel={unlock}
      onScrollEndDrag={unlock}
      onMomentumScrollEnd={unlock}
    >
      {children}
    </ScrollView>
  );
}
