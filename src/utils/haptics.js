import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
/**
 * Triggers safe haptic feedback on iOS/Android while silently no-oping on Web
 * or older devices without haptic engines.
 */
export async function triggerHapticImpact(style = Haptics.ImpactFeedbackStyle.Light) {
    if (Platform.OS === 'web') {
        return;
    }
    try {
        await Haptics.impactAsync(style);
    }
    catch {
        // Graceful no-op when haptic engine is unavailable
    }
}
export async function triggerHapticSelection() {
    if (Platform.OS === 'web') {
        return;
    }
    try {
        await Haptics.selectionAsync();
    }
    catch {
        // Graceful no-op
    }
}
export async function triggerHapticNotification(type = Haptics.NotificationFeedbackType.Success) {
    if (Platform.OS === 'web') {
        return;
    }
    try {
        await Haptics.notificationAsync(type);
    }
    catch {
        // Graceful no-op
    }
}
