import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { WellnessProvider } from './src/context/WellnessContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme/colors';
export default function App() {
    return (<View style={styles.rootContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} translucent={false}/>
      <WellnessProvider>
        <RootNavigator />
      </WellnessProvider>
    </View>);
}
const styles = StyleSheet.create({
    rootContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },
});
