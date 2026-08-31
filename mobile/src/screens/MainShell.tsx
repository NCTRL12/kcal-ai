import React from 'react';
import { StyleSheet, View } from 'react-native';
import PagerView from 'react-native-pager-view';

import { SideRail } from '../components/SideRail';
import { SectionNavProvider, useSectionPager } from '../state/SectionNav';
import { colors } from '../theme/theme';

import HoyScreen from './HoyScreen';
import DiarioScreen from './DiarioScreen';
import IAScreen from './IAScreen';
import ProgresoScreen from './ProgresoScreen';

export default function MainShell() {
  const { pagerRef, value } = useSectionPager();

  return (
    <SectionNavProvider value={value}>
      <View style={styles.row}>
        <SideRail />
        <PagerView
          ref={pagerRef}
          style={{ flex: 1 }}
          initialPage={0}
          onPageSelected={(e) => value.onPageSelected(e.nativeEvent.position)}
        >
          <View key="hoy" style={{ flex: 1 }}>
            <HoyScreen />
          </View>
          <View key="diario" style={{ flex: 1 }}>
            <DiarioScreen />
          </View>
          <View key="ia" style={{ flex: 1 }}>
            <IAScreen />
          </View>
          <View key="progreso" style={{ flex: 1 }}>
            <ProgresoScreen />
          </View>
        </PagerView>
      </View>
    </SectionNavProvider>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', backgroundColor: colors.white },
});
