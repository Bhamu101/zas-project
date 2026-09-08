import { Send } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Colors, FontSize, Radius, Spacing, Touch } from '@/constants/theme';
import { ApiError, api } from '@/services/api';

// Same backend endpoint (/api/assistant/chat) and "Goho AI" name as the web
// dashboard's assistant — one Gemini-backed pipeline, two clients. Lives in
// its own tab (previously the Weather forecast tab, and before that a
// sub-screen off Water — moved here per request).

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const GREETING: ChatMessage = {
  role: 'assistant',
  content: "Hi, I'm Goho AI. Ask me anything about your farm's irrigation, crops, or energy status.",
};

export default function GohoAIScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  async function send() {
    const content = input.trim();
    if (!content || busy) return;

    const nextMessages = [...messages, { role: 'user', content } as ChatMessage];
    setMessages(nextMessages);
    setInput('');
    setBusy(true);

    try {
      const { reply } = await api.assistantChat(nextMessages);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (e) {
      const message = e instanceof ApiError ? e.message : 'Something went wrong reaching Goho AI.';
      setMessages((prev) => [...prev, { role: 'assistant', content: message }]);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScreenBackground />
      <ScreenHeader title="Goho AI" subtitle="Your farm's AI assistant" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View style={[styles.bubbleRow, item.role === 'user' && styles.bubbleRowUser]}>
              <View style={[styles.bubble, item.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}>
                <Text style={[styles.bubbleText, item.role === 'user' && styles.bubbleTextUser]}>
                  {item.content}
                </Text>
              </View>
            </View>
          )}
          ListFooterComponent={
            busy ? (
              <View style={styles.bubbleRow}>
                <View style={[styles.bubble, styles.bubbleAssistant, styles.typingBubble]}>
                  <ActivityIndicator size="small" color={Colors.primaryDark} />
                </View>
              </View>
            ) : null
          }
        />

        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask Goho AI…"
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
            multiline
            editable={!busy}
          />
          <Pressable
            onPress={send}
            disabled={busy || !input.trim()}
            style={[styles.sendButton, (busy || !input.trim()) && styles.sendButtonDisabled]}>
            <Send size={18} color={Colors.primaryDark} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: 'transparent' },
  list: { padding: Spacing.xl, paddingTop: 0, gap: Spacing.md, flexGrow: 1 },
  bubbleRow: { flexDirection: 'row' },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '82%', borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  bubbleAssistant: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  bubbleUser: { backgroundColor: Colors.primary },
  typingBubble: { paddingVertical: Spacing.sm },
  bubbleText: { fontSize: FontSize.body, color: Colors.text, lineHeight: 20 },
  bubbleTextUser: { color: Colors.primaryDark },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    padding: Spacing.lg,
    paddingBottom: 100, // clears the floating pill tab bar
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: Touch.minSize,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.body,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  sendButton: {
    width: Touch.minSize,
    height: Touch.minSize,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { opacity: 0.5 },
});
