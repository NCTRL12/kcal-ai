import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import PagerView from 'react-native-pager-view';

export const SECTIONS = ['Hoy', 'Diario', 'IA', 'Progreso'] as const;
export type SectionName = (typeof SECTIONS)[number];

interface SectionNavApi {
  index: number;
  current: SectionName;
  goTo: (name: SectionName) => void;
  goToIndex: (index: number) => void;
  onPageSelected: (index: number) => void;
}

const Ctx = createContext<SectionNavApi | null>(null);

export function useSectionNav() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSectionNav must be used within SectionNavProvider');
  return ctx;
}

export function useSectionPager() {
  const [index, setIndex] = useState(0);
  const pagerRef = useRef<PagerView>(null);

  const goToIndex = useCallback((i: number) => {
    pagerRef.current?.setPage(i);
    setIndex(i);
  }, []);
  const goTo = useCallback((name: SectionName) => goToIndex(SECTIONS.indexOf(name)), [goToIndex]);
  const onPageSelected = useCallback((i: number) => setIndex(i), []);

  const value: SectionNavApi = useMemo(
    () => ({ index, current: SECTIONS[index], goTo, goToIndex, onPageSelected }),
    [index, goTo, goToIndex]
  );

  return { pagerRef, value };
}

export const SectionNavProvider = Ctx.Provider;
