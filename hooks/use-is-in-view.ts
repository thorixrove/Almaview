import * as React from 'react';
import { useInView, type UseInViewOptions } from 'motion/react';

type MarginType = UseInViewOptions['margin'];

export interface UseIsInViewOptions {
  inView?: boolean;
  inViewOnce?: boolean;
  inViewMargin?: MarginType;
}

function useIsInView<T extends HTMLElement = HTMLElement>(
  ref: React.Ref<T> | undefined,
  options: UseIsInViewOptions = {}
) {
  const { inView, inViewOnce = false, inViewMargin = '0px' } = options;
  const localRef = React.useRef<T>(null);
  React.useImperativeHandle(ref, () => localRef.current as T);
  const inViewResult = useInView(localRef, {
    once: inViewOnce,
    margin: inViewMargin,
  });
  const isInView = !inView || inViewResult;
  return { ref: localRef, isInView };
}

export { useIsInView };