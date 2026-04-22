import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  type ListRenderItemInfo,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config/env';

/**
 * Mobile Chat Screen Component
 * Real-time messaging with agents, escalation, queue tracking
 */
type RouteParams = {
  orderId?: string
  roomId?: string
}

type ChatMessage = {
  id?: string
  senderId?: string
  senderName?: string
  senderType?: 'agent' | 'customer' | 'system' | string
  type?: 'system' | 'message' | string
  text?: string
  message?: string
  timestamp: string | number | Date
  isAlert?: boolean
}

type AgentInfo = {
  id?: string
  name: string
}

type ConversationResponse = {
  messages?: ChatMessage[]
  assignedAgent?: AgentInfo | null
}

type ChatScreenProps = {
  route: {
    params?: RouteParams
  }
  navigation: {
    goBack: () => void
  }
}

const ChatScreen = ({ route, navigation }: ChatScreenProps) => {
  const { orderId, roomId } = route.params || {};
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [roomStatus, setRoomStatus] = useState('active');
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const flatListRef = useRef<FlatList<ChatMessage> | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const userToken = (globalThis as { authToken?: string }).authToken || '';
  const currentUserId = (globalThis as { userId?: string }).userId || '';

  useEffect(() => {
    // Fetch existing messages
    if (roomId) {
      fetchConversation();
    }

    // Connect to Socket.IO
    socketRef.current = io(API_BASE_URL, {
      query: { token: userToken },
      reconnection: true,
    });

    socketRef.current.on('connect', () => console.log('[Chat] Connected to socket'));
    socketRef.current.on('disconnect', () => console.log('[Chat] Disconnected from socket'));

    // Listen for new messages
    socketRef.current.on('chatMessage', (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    });

    // Listen for agent assigned
    socketRef.current.on('agentAssigned', (agentData: AgentInfo) => {
      setAgent(agentData);
      setMessages(prev => [...prev, {
        id: `sys_${Date.now()}`,
        type: 'system',
        text: `Agent ${agentData.name} assigned to your chat`,
        timestamp: new Date()
      }]);
    });

    // Listen for escalation
    socketRef.current.on('chatEscalated', (data: { reason?: string }) => {
      setMessages(prev => [...prev, {
        id: `sys_${Date.now()}`,
        type: 'system',
        text: `Chat escalated: ${data.reason}`,
        timestamp: new Date()
      }]);
    });

    // Listen for room closed
    socketRef.current.on('chatClosed', () => {
      setRoomStatus('closed');
      setMessages(prev => [...prev, {
        id: `sys_${Date.now()}`,
        type: 'system',
        text: 'Chat has been closed',
        timestamp: new Date(),
        isAlert: true
      }]);
    });

    // Join room
    if (roomId) {
      socketRef.current.emit('joinRoom', { roomId });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [roomId, userToken]);

  const fetchConversation = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/api/chat/conversation/${roomId}`,
        {
          headers: { Authorization: `Bearer ${userToken}` }
        }
      );
      const data = await response.json() as ConversationResponse;
      setMessages(data.messages || []);
      setAgent(data.assignedAgent || null);
      scrollToBottom();
    } catch (err) {
      console.error('[Chat] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !roomId) return;

    const messageText = inputText;
    setInputText('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({
          roomId,
          message: messageText
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Socket will handle the broadcast
      socketRef.current?.emit('sendChatMessage', { roomId, message: messageText });
    } catch (err) {
      console.error('[Chat] Send error:', err);
      setInputText(messageText); // Restore text on error
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const escalateChat = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/chat/escalate/${roomId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({ reason: 'Customer requested escalation' })
      });

      setMessages(prev => [...prev, {
        id: `sys_${Date.now()}`,
        type: 'system',
        text: 'Escalation requested',
        timestamp: new Date()
      }]);
    } catch (err) {
      console.error('[Chat] Escalation error:', err);
    }
  };

  const closeChat = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/chat/close/${roomId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        }
      });

      setRoomStatus('closed');
      navigation.goBack();
    } catch (err) {
      console.error('[Chat] Close error:', err);
    }
  };

  const renderMessage = ({ item }: ListRenderItemInfo<ChatMessage>) => {
    const isUserMessage = item.senderId === currentUserId;
    const isSystemMessage = item.type === 'system';

    return (
      <View style={[
        styles.messageContainer,
        isSystemMessage && styles.systemMessageContainer,
        isUserMessage && styles.userMessageContainer
      ]}>
        {!isUserMessage && !isSystemMessage && (
          <View style={styles.senderInfo}>
            <MaterialCommunityIcons
              name={item.senderType === 'agent' ? 'headset' : 'account'}
              size={16}
              color="#666"
            />
            <Text style={styles.senderName}>{item.senderName}</Text>
          </View>
        )}

        <View style={[
          styles.messageBubble,
          isSystemMessage && styles.systemBubble,
          isUserMessage && styles.userBubble
        ]}>
          <Text style={[
            styles.messageText,
            isUserMessage && styles.userMessageText,
            isSystemMessage && styles.systemMessageText,
            item.isAlert && styles.alertMessageText
          ]}>
            {item.text || item.message}
          </Text>
        </View>

        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={28} color="#333" />
        </TouchableOpacity>

        <View style={styles.headerTitle}>
          <Text style={styles.headerText}>Support Chat</Text>
          {agent && (
            <Text style={styles.headerSubtext}>
              <MaterialCommunityIcons name="check-circle" size={12} color="#10b981" /> Agent: {agent.name}
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={escalateChat}
          disabled={roomStatus === 'closed'}
          style={roomStatus === 'closed' && styles.disabledButton}
        >
          <MaterialCommunityIcons name="alert-circle" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
        style={styles.messagesContainer}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="chat-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No messages yet. Say hello! 👋</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id || `${item.timestamp}`}
            renderItem={renderMessage}
            onEndReached={() => scrollToBottom()}
            onEndReachedThreshold={0.3}
            scrollEnabled={true}
          />
        )}
      </KeyboardAvoidingView>

      {/* Input */}
      {roomStatus !== 'closed' && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            value={inputText}
            onChangeText={setInputText}
            editable={roomStatus !== 'closed'}
            multiline={true}
            maxLength={500}
          />

          <TouchableOpacity
            onPress={sendMessage}
            disabled={!inputText.trim() || roomStatus === 'closed'}
            style={[styles.sendButton, (!inputText.trim() || roomStatus === 'closed') && styles.disabledButton]}
          >
            <MaterialCommunityIcons
              name="send"
              size={20}
              color={inputText.trim() && roomStatus !== 'closed' ? '#6366f1' : '#ccc'}
            />
          </TouchableOpacity>
        </View>
      )}

      {roomStatus === 'closed' && (
        <View style={styles.closedBanner}>
          <MaterialCommunityIcons name="check-circle" size={16} color="#10b981" />
          <Text style={styles.closedText}>Chat closed. Feel free to reach out anytime! 😊</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    flex: 1,
    marginLeft: 12,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerSubtext: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 2,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
  messageContainer: {
    marginVertical: 6,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  systemMessageContainer: {
    alignItems: 'center',
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginLeft: 8,
  },
  senderName: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  userBubble: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
    borderBottomRightRadius: 4,
  },
  systemBubble: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
    borderRadius: 8,
    maxWidth: '90%',
  },
  messageText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
  },
  systemMessageText: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
  },
  alertMessageText: {
    color: '#ef4444',
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
    marginHorizontal: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    fontSize: 14,
    color: '#333',
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 8,
    padding: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#dcfce7',
    borderTopWidth: 1,
    borderTopColor: '#86efac',
  },
  closedText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#166534',
    fontWeight: '500',
  },
});

export default ChatScreen;
