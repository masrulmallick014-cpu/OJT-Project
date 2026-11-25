import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useFriendRequests } from '../../lib/supabase';
import { colors } from '../../theme/colors';
import {
    triggerHapticImpact,
    triggerHapticNotification,
    triggerHapticSelection,
} from '../../utils/haptics';

export const CrossCompanyCarousel = ({
    onOpenChatWithFriendship,
    onOpenRequestsInbox,
}) => {
    const {
        profiles,
        getRelationshipWith,
        sendRequest,
        acceptRequest,
    } = useFriendRequests();

    const handleActionPress = async (profile) => {
        const rel = getRelationshipWith(profile.id);
        if (rel.status === 'ACCEPTED' && rel.record) {
            await triggerHapticSelection();
            onOpenChatWithFriendship(rel.record.id, profile);
            return;
        }
        if (rel.status === 'PENDING_INCOMING' && rel.record) {
            await triggerHapticNotification(Haptics.NotificationFeedbackType.Success);
            const accepted = acceptRequest(rel.record.id);
            if (accepted) {
                onOpenChatWithFriendship(accepted.id, profile);
            }
            return;
        }
        if (rel.status === 'NONE') {
            await triggerHapticImpact(Haptics.ImpactFeedbackStyle.Medium);
            sendRequest(profile.id);
            return;
        }
        await triggerHapticSelection();
        onOpenRequestsInbox();
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.eyebrow}>PEER CONNECTIONS · SAMPLE PROFILES</Text>
                <Text style={styles.title}>Meet Coworkers & Peers</Text>
                <Text style={styles.subtitle}>
                    Connect 1-on-1 for coffee chats, walking breaks, or mentorship (Demo profiles).
                </Text>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {profiles.map((profile) => {
                    const rel = getRelationshipWith(profile.id);
                    let buttonLabel = '+ Connect';
                    let isSecondary = false;
                    if (rel.status === 'PENDING_OUTGOING') {
                        buttonLabel = 'Requested';
                        isSecondary = true;
                    } else if (rel.status === 'PENDING_INCOMING') {
                        buttonLabel = 'Accept Request';
                    } else if (rel.status === 'ACCEPTED') {
                        buttonLabel = 'Message 💬';
                        isSecondary = true;
                    }

                    return (
                        <View key={profile.id} style={styles.card}>
                            <View style={styles.cardTopRow}>
                                <View style={styles.avatarCircle}>
                                    <Text style={styles.avatarText}>
                                        {profile.avatar_url}
                                    </Text>
                                </View>
                                <View style={styles.demoBadge}>
                                    <Text style={styles.demoBadgeText}>Demo Profile</Text>
                                </View>
                            </View>

                            <Text style={styles.name} numberOfLines={1}>
                                {profile.full_name}
                            </Text>
                            <Text style={styles.companyRole} numberOfLines={1}>
                                {profile.company_name} · {profile.role_title}
                            </Text>

                            <View style={styles.vibePill}>
                                <Text style={styles.vibePillText}>{profile.vibe_status}</Text>
                            </View>

                            <View style={styles.interestsRow}>
                                {profile.interests.slice(0, 2).map((tag) => (
                                    <View key={tag} style={styles.interestChip}>
                                        <Text style={styles.interestChipText}>{tag}</Text>
                                    </View>
                                ))}
                            </View>

                            <TouchableOpacity
                                onPress={() => handleActionPress(profile)}
                                activeOpacity={0.85}
                                accessibilityRole="button"
                                accessibilityLabel={`${buttonLabel} with ${profile.full_name}`}
                                style={[
                                    styles.actionBtn,
                                    isSecondary && styles.actionBtnSecondary,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.actionBtnText,
                                        isSecondary && styles.actionBtnTextSecondary,
                                    ]}
                                >
                                    {buttonLabel}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FAF9F5',
        borderRadius: 20,
        paddingVertical: 16,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        marginBottom: 14,
    },
    headerRow: {
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    eyebrow: {
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 0.8,
        color: colors.primary,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary,
        marginTop: 2,
    },
    subtitle: {
        fontSize: 11.5,
        color: colors.textSecondary,
        marginTop: 2,
    },
    scrollContent: {
        paddingHorizontal: 14,
        gap: 12,
    },
    card: {
        width: 196,
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
    },
    cardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    avatarCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E3EFE0',
        borderWidth: 1,
        borderColor: '#C5DEC0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 12.5,
        fontWeight: '700',
        color: colors.primary,
    },
    demoBadge: {
        backgroundColor: '#F3EFE6',
        borderWidth: 1,
        borderColor: '#E2DDD2',
        paddingHorizontal: 7,
        paddingVertical: 2.5,
        borderRadius: 999,
    },
    demoBadgeText: {
        fontSize: 8.5,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    name: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    companyRole: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 2,
    },
    vibePill: {
        alignSelf: 'flex-start',
        backgroundColor: '#EBF3EC',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        marginTop: 8,
    },
    vibePillText: {
        fontSize: 10.5,
        fontWeight: '600',
        color: colors.primary,
    },
    interestsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 5,
        marginTop: 8,
        marginBottom: 12,
    },
    interestChip: {
        backgroundColor: '#FAF9F5',
        borderWidth: 1,
        borderColor: '#ECE9E0',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
    },
    interestChipText: {
        fontSize: 9.5,
        color: colors.textSecondary,
    },
    actionBtn: {
        marginTop: 'auto',
        backgroundColor: colors.primary,
        minHeight: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnSecondary: {
        backgroundColor: '#EBF3EC',
        borderWidth: 1,
        borderColor: '#C8DEC8',
    },
    actionBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    actionBtnTextSecondary: {
        color: colors.primary,
    },
});
