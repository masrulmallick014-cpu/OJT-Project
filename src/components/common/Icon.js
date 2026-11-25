import React from 'react';
import Svg, { Path, Circle, Rect, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '../../theme/colors';
export const Icon = ({ name, size = 22, color = colors.textPrimary }) => {
    switch (name) {
        case 'home':
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M3 10.5L12 3l9 7.5"/>
          <Path d="M5 9.5V19a2 2 0 002 2h10a2 2 0 002-2V9.5"/>
          <Path d="M9.5 21v-6h5v6"/>
        </Svg>);
        case 'lotus':
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 4C9.5 7.5 9 11.5 12 15c3-3.5 2.5-7.5 0-11z"/>
          <Path d="M12 15c-3.5-2.5-7-2.5-9 1 3 2.5 6.5 2.5 9-1z"/>
          <Path d="M12 15c3.5-2.5 7-2.5 9 1-3 2.5-6.5 2.5-9-1z"/>
          <Path d="M5 19c4 1.5 10 1.5 14 0"/>
        </Svg>);
        case 'bell':
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <Path d="M13.73 21a2 2 0 01-3.46 0"/>
        </Svg>);
        case 'sun':
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <Circle cx="12" cy="12" r="4"/>
          <Path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
        </Svg>);
        case 'arrowRight':
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M5 12h14"/>
          <Path d="M13 6l6 6-6 6"/>
        </Svg>);
        case 'smile':
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <Circle cx="12" cy="12" r="9"/>
          <Path d="M8.5 14.5s1.5 2 3.5 2 3.5-2 3.5-2"/>
          <Circle cx="9" cy="9.5" r="0.8" fill={color}/>
          <Circle cx="15" cy="9.5" r="0.8" fill={color}/>
        </Svg>);
        case 'download':
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <Path d="M7 10l5 5 5-5"/>
          <Path d="M12 15V3"/>
        </Svg>);
        case 'folder':
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
        </Svg>);
        case 'play':
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <Path d="M8 5v14l11-7z"/>
        </Svg>);
        case 'pause':
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <Rect x="6" y="4" width="4" height="16" rx="1"/>
          <Rect x="14" y="4" width="4" height="16" rx="1"/>
        </Svg>);
        case 'flame':
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 3z"/>
        </Svg>);
        case 'steps':
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M4 16v-2.38C4 11.5 6 9.5 8 9.5s3.5 1.5 3.5 3.5v3"/>
          <Path d="M12.5 10v-2.38c0-2.12 2-4.12 4-4.12s3.5 1.5 3.5 3.5v3"/>
          <Circle cx="8" cy="18" r="2" fill={color}/>
          <Circle cx="16.5" cy="12" r="2" fill={color}/>
        </Svg>);
        case 'heart':
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
        </Svg>);
        case 'calories':
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </Svg>);
        case 'sleep':
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
        </Svg>);
        case 'oxygen':
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9">
          <Circle cx="12" cy="12" r="9"/>
          <Circle cx="9" cy="10" r="2" fill={color}/>
          <Circle cx="15" cy="14" r="3"/>
        </Svg>);
        case 'stress':
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </Svg>);
        case 'watch':
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <Circle cx="12" cy="12" r="6"/>
          <Path d="M12 9.5V12l1.5 1.5"/>
          <Path d="M9 2h6l1 4.5H8L9 2z"/>
          <Path d="M8 17.5h8L15 22H9l-1-4.5z"/>
        </Svg>);
        case 'check':
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M20 6L9 17l-5-5"/>
        </Svg>);
        case 'refresh':
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M23 4v6h-6"/>
          <Path d="M1 20v-6h6"/>
          <Path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
        </Svg>);
        case 'shield':
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </Svg>);
        case 'trophy':
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M6 9H4.5a2.5 2.5 0 010-5H6"/>
          <Path d="M18 9h1.5a2.5 2.5 0 000-5H18"/>
          <Path d="M4 22h16"/>
          <Path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
          <Path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
          <Path d="M18 2H6v7a6 6 0 0012 0V2z"/>
        </Svg>);
        case 'settings':
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <Circle cx="12" cy="12" r="3"/>
          <Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
        </Svg>);
        case 'sparkles':
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z"/>
        </Svg>);
        case 'user':
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
          <Circle cx="12" cy="7" r="4"/>
        </Svg>);
        case 'chevronRight':
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M9 18l6-6-6-6"/>
        </Svg>);
        case 'close':
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M18 6L6 18M6 6l12 12"/>
        </Svg>);
        case 'chat':
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
        </Svg>);
        case 'calendar':
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <Rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <Path d="M16 2v4M8 2v4M3 10h18"/>
        </Svg>);
        case 'lock':
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <Rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <Path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </Svg>);
        case 'plus':
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 5v14M5 12h14"/>
        </Svg>);
        case 'send':
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
        </Svg>);
        case 'crown':
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/>
        </Svg>);
        case 'info':
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <Circle cx="12" cy="12" r="10"/>
          <Path d="M12 16v-4"/>
          <Path d="M12 8h.01"/>
        </Svg>);
        case 'zap':
        default:
            return (<Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </Svg>);
    }
};
/**
 * Custom 3D-styled Blooming Flower SVG Illustration (from Reference Hero Card)
 */
export const BloomingFlowerIllustration = ({ size = 126 }) => {
    return (<Svg width={size} height={size} viewBox="0 0 140 140" fill="none">
      <Defs>
        <LinearGradient id="petalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#E4EFE0"/>
          <Stop offset="100%" stopColor="#B8CEB2"/>
        </LinearGradient>
        <LinearGradient id="petalInner" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#F4F8F2"/>
          <Stop offset="100%" stopColor="#C7DBC1"/>
        </LinearGradient>
        <LinearGradient id="centerSun" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#F9E8A2"/>
          <Stop offset="100%" stopColor="#E3C66B"/>
        </LinearGradient>
      </Defs>

      {/* Soft ambient aura */}
      <Circle cx="76" cy="72" r="52" fill="#D5E5CE" opacity="0.45"/>

      {/* 8 Soft Sage Petals */}
      <G>
        <Circle cx="76" cy="34" r="19" fill="url(#petalInner)" stroke="#BFD4B9" strokeWidth="1"/>
        <Circle cx="76" cy="110" r="19" fill="url(#petalGrad)" stroke="#BFD4B9" strokeWidth="1"/>
        <Circle cx="38" cy="72" r="19" fill="url(#petalInner)" stroke="#BFD4B9" strokeWidth="1"/>
        <Circle cx="114" cy="72" r="19" fill="url(#petalGrad)" stroke="#BFD4B9" strokeWidth="1"/>
        <Circle cx="49" cy="45" r="19" fill="url(#petalGrad)" stroke="#BFD4B9" strokeWidth="1"/>
        <Circle cx="103" cy="45" r="19" fill="url(#petalInner)" stroke="#BFD4B9" strokeWidth="1"/>
        <Circle cx="49" cy="99" r="19" fill="url(#petalInner)" stroke="#BFD4B9" strokeWidth="1"/>
        <Circle cx="103" cy="99" r="19" fill="url(#petalGrad)" stroke="#BFD4B9" strokeWidth="1"/>
      </G>

      {/* Smiling Warm Yellow Center */}
      <Circle cx="76" cy="72" r="24" fill="url(#centerSun)" stroke="#EAD382" strokeWidth="1.5"/>
      <Circle cx="68" cy="68" r="2" fill="#5A4B2C"/>
      <Circle cx="84" cy="68" r="2" fill="#5A4B2C"/>
      <Path d="M71 75.5C72.5 77.5 79.5 77.5 81 75.5" stroke="#5A4B2C" strokeWidth="1.8" strokeLinecap="round"/>

      {/* Floating Sparkle & Dew Drops */}
      <Path d="M24 38L26.2 43.2L31.5 45.5L26.2 47.8L24 53L21.8 47.8L16.5 45.5L21.8 43.2L24 38Z" stroke="#9AB394" strokeWidth="1.3" fill="#EEF5EC"/>
      <Circle cx="22" cy="105" r="6" fill="#E8CFA6" opacity="0.85"/>
      <Circle cx="128" cy="42" r="7" fill="#C9DEC3" opacity="0.8"/>
    </Svg>);
};
