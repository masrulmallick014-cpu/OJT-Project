import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

interface BadgeProps {
  label: string;
  variant?: 'emerald' | 'cyan' | 'amber' | 'rose' | 'slate' | 'violet';
  style?: ViewStyle;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'emerald',
  style,
  icon,
}) => {
  const getColors = () => {
    switch (variant) {
      case 'emerald':
        return { bg: '#E7F1E5', text: '#2E5C3E', border: '#D1E4CD' };
      case 'cyan':
        return { bg: '#E4F2EF', text: '#246358', border: '#C9E3DD' };
      case 'amber':
        return { bg: '#F8F2E7', text: '#8C6232', border: '#EADBC5' };
      case 'rose':
        return { bg: '#F9ECEC', text: '#A84E4E', border: '#EED6D6' };
      case 'violet':
        return { bg: '#EFEcf7', text: '#5D5088', border: '#DFD9EE' };
      case 'slate':
      default:
        return { bg: '#F2F0EA', text: '#5C645D', border: '#E3E0D6' };
    }
  };

  const scheme = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: scheme.bg, borderColor: scheme.border }, style]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={[styles.text, { color: scheme.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 9999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  iconContainer: {
    marginRight: 5,
  },
  text: {
    fontSize: typography.sizes.micro,
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.3,
  },
});
