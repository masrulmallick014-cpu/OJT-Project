import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
export const Card = ({ children, style, highlight = false }) => {
    return (<View style={[
            styles.card,
            highlight && styles.highlight,
            style,
        ]}>
      {children}
    </View>);
};
const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        shadowColor: '#2B332C',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 2,
    },
    highlight: {
        borderColor: colors.sageBorder,
        backgroundColor: '#F3F8F1',
    },
});
