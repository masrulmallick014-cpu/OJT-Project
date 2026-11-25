import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useFriendRequests } from '../../lib/supabase';
import { colors } from '../../theme/colors';
import {
    triggerHapticNotification,
    triggerHapticSelection,
} from '../../utils/haptics';

export const RequestsInboxModal = ({ visible, onClose, onOpenChat }) => {
    const {
        incomingPending,
        acceptedFriendships,
        acceptRequest,
        declineRequest,
    } = useFriendRequests();
    const [celebrationBanner, setCelebrationBanner] = useState(null);

    const handleAccept = async (requestId, sender) => {
        await triggerHapticNotification(Haptics.NotificationFeedbackType.Success);
        acceptRequest(requestId);
        setCelebrationBanner(
            `Connected with ${sender.full_name} (${sender.company_name}). You can now message each other in the demo chat.`
        );
        setTimeout(() => setCelebrationBanner(null), 4000);
    };

    const handleDecline = async (requestId) => {
        await triggerHapticSelection();
        declineRequest(requestId);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.backdrop}>
                <View style={styles.sheet}>
                    <View style={styles.headerRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.eyebrow}>
                                PEER CONNECTIONS · LOCAL DEMO
                            </Text>
                            <Text style={styles.title}>Coworker Connections</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={onClose}
                            accessibilityRole="button"
                            accessibilityLabel="Close connection requests"
                        >
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {celebrationBanner && (
                        <View style={styles.celebrationBox}>
                            <Text style={styles.celebrationText}>{celebrationBanner}</Text>
                        </View>
                    )}

                    <ScrollView
                        style={{ maxHeight: 420 }}
                        showsVerticalScrollIndicator={false}
                    >
                        <Text style={styles.sectionLabel}>
                            INCOMING REQUESTS ({incomingPending.length})
                        </Text>

                        {incomingPending.length === 0 ? (
                            <View style={styles.emptyBox}>
                                <Text style={styles.emptyText}>
                                    No pending incoming requests right now. You can connect with
                                    sample profiles in the feed.
                                </Text>
                            </View>
                        ) : (
                            incomingPending.map((req) => (
                                <View key={req.id} style={styles.requestCard}>
                                    <View style={styles.avatarCircle}>
                                        <Text style={styles.avatarText}>
                                            {req.sender.avatar_url}
                                        </Text>
                                    </View>

                                    <View style={{ flex: 1 }}>
                                        <View style={styles.nameTierRow}>
                                            <Text style={styles.name}>
                                                {req.sender.full_name}
                                            </Text>
                                            <View style={styles.demoChip}>
                                                <Text style={styles.demoChipText}>
                                                    Demo Profile
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={styles.companySub}>
                                            {req.sender.company_name} · {req.sender.role_title}
                                        </Text>
                                        <Text style={styles.vibeLine}>
                                            {req.sender.vibe_status}
                                        </Text>
                                    </View>

                                    <View style={styles.actionsCol}>
                                        <TouchableOpacity
                                            style={styles.acceptBtn}
                                            accessibilityRole="button"
                                            accessibilityLabel={`Accept connection request from ${req.sender.full_name}`}
                                            onPress={() => handleAccept(req.id, req.sender)}
                                        >
                                            <Text style={styles.acceptBtnText}>Accept</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.declineBtn}
                                            accessibilityRole="button"
                                            accessibilityLabel={`Decline connection request from ${req.sender.full_name}`}
                                            onPress={() => handleDecline(req.id)}
                                        >
                                            <Text style={styles.declineBtnText}>Decline</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        )}

                        <Text style={[styles.sectionLabel, { marginTop: 14 }]}>
                            YOUR CONNECTIONS ({acceptedFriendships.length})
                        </Text>

                        {acceptedFriendships.map((fr) => {
                            const partner =
                                fr.sender_id === 'usr-alex-01' ? fr.receiver : fr.sender;
                            return (
                                <View key={fr.id} style={styles.requestCard}>
                                    <View style={styles.avatarCircle}>
                                        <Text style={styles.avatarText}>
                                            {partner.avatar_url}
                                        </Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <View style={styles.nameTierRow}>
                                            <Text style={styles.name}>{partner.full_name}</Text>
                                            <View style={styles.demoChip}>
                                                <Text style={styles.demoChipText}>
                                                    Demo Profile
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={styles.companySub}>
                                            {partner.company_name} · {partner.role_title}
                                        </Text>
                                        <Text style={styles.connectedTag}>
                                            ✓ Connected · Direct Chat Available
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.messageBtn}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Message ${partner.full_name}`}
                                        onPress={() => {
                                            onClose();
                                            onOpenChat(fr.id, partner);
                                        }}
                                    >
                                        <Text style={styles.messageBtnText}>Message</Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(26, 30, 27, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    sheet: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        gap: 10,
    },
    eyebrow: {
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 0.8,
        color: colors.primary,
    },
    title: {
        fontSize: 19,
        fontWeight: '700',
        color: colors.textPrimary,
        marginTop: 2,
    },
    closeBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F2EFE9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeText: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '700',
    },
    celebrationBox: {
        backgroundColor: '#EBF3EC',
        borderWidth: 1,
        borderColor: '#C8DEC8',
        borderRadius: 14,
        padding: 12,
        marginBottom: 12,
    },
    celebrationText: {
        color: colors.primary,
        fontSize: 12,
        fontWeight: '700',
        lineHeight: 17,
    },
    sectionLabel: {
        fontSize: 10.5,
        fontWeight: '700',
        letterSpacing: 0.8,
        color: colors.textMuted,
        marginBottom: 8,
    },
    emptyBox: {
        backgroundColor: '#FAF9F5',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
    },
    emptyText: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 17,
    },
    requestCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FAF9F5',
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        marginBottom: 8,
        gap: 10,
    },
    avatarCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
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
    nameTierRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
    },
    name: {
        fontSize: 13.5,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    demoChip: {
        backgroundColor: '#EFECE6',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    demoChipText: {
        fontSize: 8.5,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    companySub: {
        fontSize: 11.5,
        color: colors.textSecondary,
        marginTop: 2,
    },
    vibeLine: {
        fontSize: 11,
        color: colors.primary,
        marginTop: 2,
        fontWeight: '600',
    },
    connectedTag: {
        fontSize: 10.5,
        fontWeight: '700',
        color: colors.primary,
        marginTop: 3,
    },
    actionsCol: {
        gap: 6,
    },
    acceptBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: 12,
        minHeight: 44,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    acceptBtnText: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    declineBtn: {
        backgroundColor: '#EFECE6',
        paddingHorizontal: 12,
        minHeight: 44,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    declineBtnText: {
        fontSize: 11.5,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    messageBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: 14,
        minHeight: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    messageBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
