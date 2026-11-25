import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    TextInput,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { CURRENT_USER_PROFILE, useRealtimeChat } from '../../lib/supabase';
import { colors } from '../../theme/colors';
import {
    triggerHapticImpact,
    triggerHapticSelection,
} from '../../utils/haptics';

const REACTION_EMOJIS = ['👏', '💧', '👟', '🌿'];

export const ChatRoomScreen = ({ visible, friendshipId, partner, onClose }) => {
    const {
        rlsAllowed,
        rlsError,
        messages,
        typingUser,
        sendMessage,
        reactToMessage,
    } = useRealtimeChat(friendshipId);
    const [draft, setDraft] = useState('');

    const conversationStarters = partner
        ? [
            `Hi ${partner.full_name.split(' ')[0]}! Would love to hear your tips on ${partner.interests[0] || 'healthy work habits'}.`,
            `Up for a 15-minute walking call or coffee chat this week?`,
            `Thanks for connecting here in the PulseCorp community!`,
        ]
        : [];

    const handleSend = async (customText) => {
        const textToSend = customText ?? draft;
        if (!textToSend.trim()) return;
        await triggerHapticImpact(Haptics.ImpactFeedbackStyle.Light);
        const res = sendMessage(textToSend);
        if (res.ok && !customText) {
            setDraft('');
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.backdrop}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.partnerRow}>
                            <View style={styles.avatarCircle}>
                                <Text style={styles.avatarText}>
                                    {partner?.avatar_url || '💬'}
                                </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <View style={styles.nameBadgeRow}>
                                    <Text style={styles.partnerName}>
                                        {partner?.full_name || 'Coworker Chat'}
                                    </Text>
                                    <View style={styles.demoBadge}>
                                        <Text style={styles.demoBadgeText}>
                                            Demo Profile
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.partnerMeta}>
                                    {partner
                                        ? `${partner.company_name} · ${partner.role_title}`
                                        : 'Local Demo Chat'}
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={onClose}
                            accessibilityRole="button"
                            accessibilityLabel="Close chat"
                        >
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Honest Local Demo Status Banner */}
                    <View
                        style={[
                            styles.statusBanner,
                            !rlsAllowed && styles.statusBannerBlocked,
                        ]}
                    >
                        <Text style={styles.statusBannerText}>
                            {rlsAllowed
                                ? `Local Demo Chat · Connected with ${partner?.full_name || 'Coworker'} (Sample auto-reply enabled)`
                                : rlsError || 'Accept the connection request before messaging.'}
                        </Text>
                    </View>

                    {/* Messages Feed */}
                    <ScrollView
                        style={styles.messagesScroll}
                        contentContainerStyle={{ paddingVertical: 10, gap: 10 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {messages.map((msg) => {
                            const isMine = msg.sender_id === CURRENT_USER_PROFILE.id;
                            return (
                                <View
                                    key={msg.id}
                                    style={[
                                        styles.msgWrap,
                                        isMine ? styles.msgWrapRight : styles.msgWrapLeft,
                                    ]}
                                >
                                    <View
                                        style={[
                                            styles.msgBubble,
                                            isMine
                                                ? styles.msgBubbleMine
                                                : styles.msgBubblePartner,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.msgText,
                                                isMine && { color: '#FFFFFF' },
                                            ]}
                                        >
                                            {msg.content}
                                        </Text>
                                        <View style={styles.msgFooter}>
                                            <Text
                                                style={[
                                                    styles.msgTime,
                                                    isMine && { color: '#DFECE2' },
                                                ]}
                                            >
                                                {new Date(msg.created_at).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                                {!isMine ? ' · Demo' : ''}
                                            </Text>
                                            {msg.reaction && (
                                                <View style={styles.activeReactionPill}>
                                                    <Text style={{ fontSize: 11 }}>
                                                        {msg.reaction}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    {/* Quick Reaction Tap Bar */}
                                    <View style={styles.reactionBar}>
                                        {REACTION_EMOJIS.map((emoji) => (
                                            <TouchableOpacity
                                                key={emoji}
                                                accessibilityRole="button"
                                                accessibilityLabel={`React with ${emoji}`}
                                                onPress={async () => {
                                                    await triggerHapticSelection();
                                                    reactToMessage(msg.id, emoji);
                                                }}
                                                style={styles.reactionMiniBtn}
                                            >
                                                <Text style={{ fontSize: 12 }}>{emoji}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            );
                        })}

                        {typingUser && (
                            <View style={styles.typingPill}>
                                <Text style={styles.typingText}>
                                    💬 {typingUser} is typing (Demo auto-reply)...
                                </Text>
                            </View>
                        )}
                    </ScrollView>

                    {/* Helpful Conversation Starters */}
                    {rlsAllowed && conversationStarters.length > 0 && (
                        <View style={styles.startersSection}>
                            <Text style={styles.starterLabel}>
                                QUICK CONVERSATION STARTERS
                            </Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.starterRow}
                            >
                                {conversationStarters.map((prompt) => (
                                    <TouchableOpacity
                                        key={prompt}
                                        onPress={() => handleSend(prompt)}
                                        activeOpacity={0.85}
                                        style={styles.starterPill}
                                    >
                                        <Text style={styles.starterText}>{prompt}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* Message Input Bar */}
                    {rlsAllowed && (
                        <View style={styles.inputRow}>
                            <TextInput
                                style={styles.input}
                                value={draft}
                                onChangeText={setDraft}
                                placeholder={`Message ${partner?.full_name || 'coworker'}...`}
                                placeholderTextColor={colors.textMuted}
                                accessibilityLabel="Chat message input"
                            />
                            <TouchableOpacity
                                onPress={() => handleSend()}
                                activeOpacity={0.85}
                                style={styles.sendBtn}
                                accessibilityRole="button"
                                accessibilityLabel="Send message"
                            >
                                <Text style={styles.sendBtnText}>Send</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(26, 30, 27, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 14,
    },
    container: {
        width: '100%',
        maxWidth: 406,
        maxHeight: 680,
        backgroundColor: '#FFFFFF',
        borderRadius: 26,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#EFECE6',
    },
    partnerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
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
        color: colors.primary,
        fontSize: 13,
        fontWeight: '700',
    },
    nameBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
    },
    partnerName: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    demoBadge: {
        backgroundColor: '#F3EFE6',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 999,
    },
    demoBadgeText: {
        fontSize: 8.5,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    partnerMeta: {
        fontSize: 11.5,
        color: colors.textSecondary,
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
    statusBanner: {
        backgroundColor: '#EBF3EC',
        borderWidth: 1,
        borderColor: '#C8DEC8',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 7,
        marginTop: 10,
    },
    statusBannerBlocked: {
        backgroundColor: '#FDECEC',
        borderColor: '#F2B8B5',
    },
    statusBannerText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: colors.primary,
    },
    messagesScroll: {
        flex: 1,
        marginVertical: 6,
    },
    msgWrap: {
        maxWidth: '85%',
    },
    msgWrapRight: {
        alignSelf: 'flex-end',
        alignItems: 'flex-end',
    },
    msgWrapLeft: {
        alignSelf: 'flex-start',
        alignItems: 'flex-start',
    },
    msgBubble: {
        borderRadius: 16,
        padding: 12,
    },
    msgBubbleMine: {
        backgroundColor: colors.primary,
    },
    msgBubblePartner: {
        backgroundColor: '#FAF9F5',
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
    },
    msgText: {
        color: colors.textPrimary,
        fontSize: 12.5,
        lineHeight: 18,
    },
    msgFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 5,
        gap: 8,
    },
    msgTime: {
        fontSize: 9.5,
        color: colors.textMuted,
    },
    activeReactionPill: {
        backgroundColor: 'rgba(255,255,255,0.8)',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 999,
    },
    reactionBar: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 4,
    },
    reactionMiniBtn: {
        backgroundColor: '#FAF9F5',
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        paddingHorizontal: 8,
        minHeight: 34,
        justifyContent: 'center',
        borderRadius: 8,
    },
    typingPill: {
        backgroundColor: '#FAF9F5',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
    },
    typingText: {
        fontSize: 11,
        color: colors.primary,
        fontWeight: '600',
    },
    startersSection: {
        marginBottom: 10,
    },
    starterLabel: {
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 0.7,
        color: colors.textMuted,
        marginBottom: 6,
    },
    starterRow: {
        gap: 8,
    },
    starterPill: {
        backgroundColor: '#FAF9F5',
        paddingHorizontal: 12,
        minHeight: 44,
        justifyContent: 'center',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
    },
    starterText: {
        fontSize: 11.5,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    input: {
        flex: 1,
        backgroundColor: '#FAF9F5',
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        borderRadius: 14,
        paddingHorizontal: 12,
        minHeight: 48,
        fontSize: 13,
        color: colors.textPrimary,
    },
    sendBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: 18,
        minHeight: 48,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 14,
    },
    sendBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
});
