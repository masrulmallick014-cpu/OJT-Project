import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '../../theme/colors';
export const ProgressRing = ({ radius = 54, strokeWidth = 10, progress = 0, color = colors.primary, gradientColors, trackColor = colors.surfaceBorder, children, }) => {
    const normalizedRadius = radius - strokeWidth / 2;
    const circumference = 2 * Math.PI * normalizedRadius;
    const clampedProgress = Math.min(Math.max(progress, 0), 100);
    const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;
    const size = radius * 2;
    const gradientId = `grad-${color.replace('#', '')}-${radius}`;
    return (<View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          {gradientColors && (<LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={gradientColors[0]}/>
              <Stop offset="100%" stopColor={gradientColors[1]}/>
            </LinearGradient>)}
        </Defs>

        <G rotation="-90" origin={`${radius}, ${radius}`}>
          {/* Background track */}
          <Circle stroke={trackColor} fill="transparent" strokeWidth={strokeWidth} r={normalizedRadius} cx={radius} cy={radius}/>
          {/* Active progress */}
          <Circle stroke={gradientColors ? `url(#${gradientId})` : color} fill="transparent" strokeWidth={strokeWidth} strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={strokeDashoffset} strokeLinecap="round" r={normalizedRadius} cx={radius} cy={radius}/>
        </G>
      </Svg>

      {children && <View style={styles.content}>{children}</View>}
    </View>);
};
const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
