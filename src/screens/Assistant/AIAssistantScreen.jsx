import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {radius} from '../../theme/radius';
import {shadows} from '../../theme/shadows';

import {
  ArrowBackIcon,
  BrainIcon,
  SendIcon,
} from '../../assets/icons/Icons';

import {sendMessageToAssistant} from '../../services/AIAssistantService';

const INITIAL_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  text:
    'Hi, I am SmartCare AI. I can help you understand symptoms, medical terms, reports, and general health questions. I cannot diagnose conditions or prescribe medicines.',
};

const QUICK_PROMPTS = [
  'I have a headache',
  'I have a fever',
  'Explain my medical report',
  'How can I improve my sleep?',
];

export default function AIAssistantScreen({navigation}) {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const askAssistant = async messageText => {
    const text = String(messageText || '').trim();

    if (!text || loading) {
      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
    };

    const conversation = [
      ...messages,
      userMessage,
    ].map(message => ({
      role: message.role,
      content: message.text,
    }));

    setMessages(previous => [...previous, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const reply = await sendMessageToAssistant(conversation);

      setMessages(previous => [
        ...previous,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: reply,
        },
      ]);
    } catch (error) {
      setMessages(previous => [
        ...previous,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          text:
            error.message ||
            'I could not connect right now. Please try again later.',
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
            activeOpacity={0.75}>
            <ArrowBackIcon size={23} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerIcon}>
            <BrainIcon size={23} color={colors.primary} />
          </View>

          <View style={styles.headerText}>
            <Text style={styles.title}>SmartCare AI</Text>
            <Text style={styles.subtitle}>Health guidance assistant</Text>
          </View>

          <View style={styles.onlineDot} />
        </View>

        {/* Safety notice */}
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Important health notice</Text>
          <Text style={styles.noticeText}>
            This assistant provides general information only. It does not
            diagnose diseases, prescribe medicines, or replace a doctor.
          </Text>
        </View>

        {/* Conversation */}
        <ScrollView
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {messages.map(message => (
            <View
              key={message.id}
              style={[
                styles.messageRow,
                message.role === 'user' && styles.userMessageRow,
              ]}>

              {message.role === 'assistant' && (
                <View style={styles.assistantAvatar}>
                  <BrainIcon size={17} color={colors.primary} />
                </View>
              )}

              <View
                style={[
                  styles.messageBubble,
                  message.role === 'user'
                    ? styles.userBubble
                    : styles.assistantBubble,
                  message.error && styles.errorBubble,
                ]}>
                <Text
                  style={[
                    styles.messageText,
                    message.role === 'user' && styles.userMessageText,
                  ]}>
                  {message.text}
                </Text>
              </View>
            </View>
          ))}

          {messages.length === 1 && (
            <View style={styles.quickPromptSection}>
              <Text style={styles.quickPromptTitle}>Try asking</Text>

              <View style={styles.quickPromptWrap}>
                {QUICK_PROMPTS.map(prompt => (
                  <TouchableOpacity
                    key={prompt}
                    style={styles.quickPrompt}
                    onPress={() => askAssistant(prompt)}
                    activeOpacity={0.8}>
                    <Text style={styles.quickPromptText}>{prompt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {loading && (
            <View style={styles.loadingRow}>
              <View style={styles.assistantAvatar}>
                <BrainIcon size={17} color={colors.primary} />
              </View>

              <View style={styles.loadingBubble}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Thinking...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Composer */}
        <View style={styles.composerArea}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Describe your symptoms or ask a question..."
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
            maxLength={1000}
            editable={!loading}
            onSubmitEditing={() => askAssistant(input)}
            blurOnSubmit={false}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!input.trim() || loading) && styles.sendButtonDisabled,
            ]}
            onPress={() => askAssistant(input)}
            disabled={!input.trim() || loading}
            accessibilityLabel="Send message"
            activeOpacity={0.8}>
            <SendIcon size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>
          For emergencies, contact local emergency services immediately.
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },

  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    marginLeft: spacing.md,
  },

  headerText: {
    flex: 1,
    marginLeft: spacing.sm,
  },

  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },

  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },

  onlineDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.success,
  },

  notice: {
    margin: spacing.base,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#FFF8E6',
    borderWidth: 1,
    borderColor: '#F4D98C',
  },

  noticeTitle: {
    color: '#8A6412',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },

  noticeText: {
    color: '#806B3B',
    fontSize: 11,
    lineHeight: 16,
  },

  messages: {
    flex: 1,
  },

  messagesContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
  },

  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },

  userMessageRow: {
    justifyContent: 'flex-end',
  },

  assistantAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    marginRight: spacing.sm,
  },

  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 18,
  },

  assistantBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 5,
    ...shadows.sm,
  },

  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 5,
  },

  errorBubble: {
    backgroundColor: colors.errorLight,
  },

  messageText: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 21,
  },

  userMessageText: {
    color: '#FFFFFF',
  },

  quickPromptSection: {
    marginTop: spacing.sm,
  },

  quickPromptTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },

  quickPromptWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  quickPrompt: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
  },

  quickPromptText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 18,
  },

  loadingText: {
    color: colors.textSecondary,
    fontSize: 13,
  },

  composerArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 110,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: 23,
    backgroundColor: colors.background,
    color: colors.textPrimary,
    fontSize: 14,
    marginRight: spacing.sm,
  },

  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },

  sendButtonDisabled: {
    opacity: 0.45,
  },

  footerText: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 10,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
});