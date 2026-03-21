import { Grid } from 'antd';

const DESKTOP_MIN_WIDTH = 992;

export const useIsDesktop = () => {
  const screens = Grid.useBreakpoint();

  if (typeof screens.lg === 'boolean') {
    return screens.lg;
  }

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`).matches;
  }

  return true;
};
