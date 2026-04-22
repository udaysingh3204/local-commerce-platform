const Notification = require('../models/Notification');
const Order = require('../models/Order');
const User = require('../models/User');

/**
 * Chat Service - Live messaging for customers, drivers, and support agents
 * Handles room management, message persistence, agent assignment, and escalation
 */
class ChatService {
  constructor() {
    this.activeChats = new Map(); // Maps roomId → { participants, createdAt, status }
    this.supportAgents = new Map(); // Maps agentId → { name, status, activeChats, capacity }
    this.conversationCache = new Map(); // Caches recent messages for performance
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get or create a chat room
   * @param {string} type - 'order' (customer-driver), 'support' (customer-agent), 'delivery' (driver-agent)
   * @param {object} context - { orderId, userId, driverId, agentId }
   * @returns {object} Room with id, participants, createdAt, status
   */
  async getOrCreateRoom(type, context) {
    const roomId = this.generateRoomId(type, context);

    if (this.activeChats.has(roomId)) {
      return this.activeChats.get(roomId);
    }

    const room = {
      id: roomId,
      type,
      context,
      participants: await this.getParticipants(type, context),
      createdAt: new Date(),
      status: 'active',
      messages: [],
      unreadCounts: {}
    };

    this.activeChats.set(roomId, room);
    return room;
  }

  /**
   * Generate unique room ID based on type and context
   */
  generateRoomId(type, context) {
    if (type === 'order') {
      return `order_${context.orderId}`;
    } else if (type === 'support') {
      return `support_${context.userId}_${context.agentId || 'queue'}`;
    } else if (type === 'delivery') {
      return `delivery_${context.driverId}_${context.agentId || 'hub'}`;
    }
    return `chat_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get participants for a chat room
   */
  async getParticipants(type, context) {
    const participants = [];

    if (type === 'order') {
      const order = await Order.findById(context.orderId).populate(['userId', 'driverId']);
      if (order && order.userId) participants.push({ userId: order.userId._id, name: order.userId.name, role: 'customer' });
      if (order && order.driverId) participants.push({ userId: order.driverId._id, name: order.driverId.name, role: 'driver' });
    } else if (type === 'support') {
      const user = await User.findById(context.userId);
      if (user) participants.push({ userId: user._id, name: user.name, role: 'customer' });
      // Agent assigned later
    } else if (type === 'delivery') {
      const driver = await User.findById(context.driverId);
      if (driver) participants.push({ userId: driver._id, name: driver.name, role: 'driver' });
      // Agent assigned later
    }

    return participants;
  }

  /**
   * Send a message to a room
   * @param {string} roomId - Chat room ID
   * @param {object} message - { senderId, senderName, senderRole, text, attachments[], priority }
   * @returns {object} Saved message with timestamp
   */
  async sendMessage(roomId, message) {
    try {
      const room = this.activeChats.get(roomId);
      if (!room) {
        throw new Error(`Room ${roomId} not found`);
      }

      const savedMessage = {
        id: this.generateMessageId(),
        roomId,
        senderId: message.senderId,
        senderName: message.senderName,
        senderRole: message.senderRole,
        text: message.text,
        attachments: message.attachments || [],
        priority: message.priority || 'normal',
        timestamp: new Date(),
        isRead: false,
        readByUsers: [],
        editedAt: null,
        deletedAt: null
      };

      room.messages.push(savedMessage);

      // Cache update
      if (!this.conversationCache.has(roomId)) {
        this.conversationCache.set(roomId, []);
      }
      this.conversationCache.get(roomId).push(savedMessage);

      // Persist to database (async)
      await this.persistMessage(roomId, savedMessage);

      // Update unread counts for other participants
      room.participants.forEach(p => {
        if (p.userId.toString() !== message.senderId.toString()) {
          room.unreadCounts[p.userId] = (room.unreadCounts[p.userId] || 0) + 1;
        }
      });

      // Notify relevant parties
      await this.notifyNewMessage(roomId, savedMessage);

      return savedMessage;
    } catch (err) {
      console.error('[ChatService] sendMessage error:', err.message);
      throw err;
    }
  }

  /**
   * Mark messages as read
   */
  async markAsRead(roomId, userId) {
    const room = this.activeChats.get(roomId);
    if (!room) return;

    room.messages.forEach(msg => {
      if (!msg.readByUsers.includes(userId.toString())) {
        msg.readByUsers.push(userId.toString());
      }
    });

    room.unreadCounts[userId] = 0;

    // Persist to database
    await this.persistReadStatus(roomId, userId);
  }

  /**
   * Assign a support agent to a chat
   * @param {string} roomId - Chat room ID
   * @param {string} agentId - Support agent user ID
   * @returns {object} Updated room with agent
   */
  async assignAgent(roomId, agentId) {
    try {
      const room = this.activeChats.get(roomId);
      if (!room) throw new Error(`Room ${roomId} not found`);

      const agent = await User.findById(agentId);
      if (!agent) throw new Error(`Agent ${agentId} not found`);

      // Check agent availability
      const agentChat = this.supportAgents.get(agentId.toString());
      if (agentChat && agentChat.activeChats.length >= agentChat.capacity) {
        throw new Error(`Agent ${agent.name} is at capacity`);
      }

      // Add agent to room
      const agentParticipant = {
        userId: agent._id,
        name: agent.name,
        role: 'support_agent',
        assignedAt: new Date()
      };

      if (!room.participants.find(p => p.userId.toString() === agentId.toString())) {
        room.participants.push(agentParticipant);
      }

      // Update agent load
      if (!this.supportAgents.has(agentId.toString())) {
        this.supportAgents.set(agentId.toString(), {
          name: agent.name,
          status: 'active',
          activeChats: [],
          capacity: 10 // Default capacity
        });
      }

      const agentRecord = this.supportAgents.get(agentId.toString());
      if (!agentRecord.activeChats.includes(roomId)) {
        agentRecord.activeChats.push(roomId);
      }

      // Persist assignment
      await this.persistAgentAssignment(roomId, agentId);

      // Notify customer
      await this.sendSystemMessage(
        roomId,
        `Support agent ${agent.name} has joined the chat`,
        'system'
      );

      return room;
    } catch (err) {
      console.error('[ChatService] assignAgent error:', err.message);
      throw err;
    }
  }

  /**
   * Escalate a support chat to specialist
   * @param {string} roomId - Chat room ID
   * @param {string} escalationReason - Reason for escalation
   * @returns {object} Updated room with escalation flag
   */
  async escalateChat(roomId, escalationReason) {
    const room = this.activeChats.get(roomId);
    if (!room) throw new Error(`Room ${roomId} not found`);

    room.escalated = true;
    room.escalationReason = escalationReason;
    room.escalatedAt = new Date();

    // Find specialist agent
    const specialist = await this.findAvailableSpecialist(escalationReason);
    if (specialist) {
      await this.assignAgent(roomId, specialist._id);
    }

    await this.sendSystemMessage(
      roomId,
      `Chat escalated: ${escalationReason}. A specialist will take over shortly.`,
      'system'
    );

    return room;
  }

  /**
   * Close a chat room
   */
  async closeChat(roomId, reason = 'completed') {
    const room = this.activeChats.get(roomId);
    if (!room) return;

    room.status = 'closed';
    room.closedAt = new Date();
    room.closeReason = reason;

    // Remove agent from active chats
    room.participants.forEach(p => {
      if (p.role === 'support_agent') {
        const agentChat = this.supportAgents.get(p.userId.toString());
        if (agentChat) {
          agentChat.activeChats = agentChat.activeChats.filter(id => id !== roomId);
        }
      }
    });

    // Persist closure
    await this.persistChatClosure(roomId, reason);

    // Clear cache after delay
    setTimeout(() => {
      this.conversationCache.delete(roomId);
    }, this.cacheTimeout);
  }

  /**
   * Get conversation history with pagination
   */
  async getConversation(roomId, limit = 50, offset = 0) {
    const room = this.activeChats.get(roomId);
    if (!room) return [];

    // Check cache first
    if (this.conversationCache.has(roomId)) {
      const cached = this.conversationCache.get(roomId);
      return cached.slice(-limit);
    }

    // Fetch from database
    const messages = await this.fetchMessagesFromDb(roomId, limit, offset);
    this.conversationCache.set(roomId, messages);

    return messages;
  }

  /**
   * Get support queue statistics
   */
  async getQueueStats() {
    const stats = {
      totalActiveChats: this.activeChats.size,
      waitingChats: 0,
      assignedChats: 0,
      escalatedChats: 0,
      agentCapacity: {}
    };

    this.activeChats.forEach((room) => {
      if (room.status === 'active') {
        const hasAgent = room.participants.some(p => p.role === 'support_agent');
        if (hasAgent) {
          stats.assignedChats++;
        } else {
          stats.waitingChats++;
        }

        if (room.escalated) {
          stats.escalatedChats++;
        }
      }
    });

    // Agent capacity
    this.supportAgents.forEach((agent, agentId) => {
      stats.agentCapacity[agentId] = {
        name: agent.name,
        active: agent.activeChats.length,
        capacity: agent.capacity,
        utilization: Math.round((agent.activeChats.length / agent.capacity) * 100)
      };
    });

    return stats;
  }

  /**
   * Get active chats for an agent
   */
  getAgentChats(agentId) {
    const agentRecord = this.supportAgents.get(agentId.toString());
    if (!agentRecord) return [];

    return agentRecord.activeChats.map(roomId => {
      const room = this.activeChats.get(roomId);
      return {
        roomId,
        type: room.type,
        unreadCount: room.unreadCounts[agentId] || 0,
        lastMessage: room.messages[room.messages.length - 1],
        participants: room.participants
      };
    });
  }

  /**
   * Send system message
   */
  async sendSystemMessage(roomId, text, sender = 'support') {
    return this.sendMessage(roomId, {
      senderId: 'system',
      senderName: 'System',
      senderRole: sender,
      text,
      priority: 'normal'
    });
  }

  /**
   * Private: Generate message ID
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Private: Find available specialist
   */
  async findAvailableSpecialist(specialization) {
    // Find user with role 'support_specialist' and availability
    const specialists = await User.find({
      role: 'support_specialist',
      isActive: true
    });

    if (!specialists.length) return null;

    // Find least loaded specialist
    let minLoad = Infinity;
    let selected = null;

    specialists.forEach(spec => {
      const agentChat = this.supportAgents.get(spec._id.toString()) || {
        activeChats: []
      };
      if (agentChat.activeChats.length < minLoad) {
        minLoad = agentChat.activeChats.length;
        selected = spec;
      }
    });

    return selected;
  }

  /**
   * Private: Notify about new message (integrates with WebSocket)
   */
  async notifyNewMessage(roomId, message) {
    // This will be emitted via WebSocket from calling route
    // Notification structure for integration
    return {
      event: 'messageReceived',
      roomId,
      message,
      timestamp: new Date()
    };
  }

  /**
   * Private: Persist message to database
   */
  async persistMessage(roomId, message) {
    try {
      const notification = new Notification({
        userId: message.senderId,
        type: 'chat_message',
        title: `New message from ${message.senderName}`,
        message: message.text.substring(0, 100),
        data: {
          roomId,
          messageId: message.id,
          senderRole: message.senderRole
        },
        isRead: false
      });
      await notification.save();
    } catch (err) {
      console.error('[ChatService] persistMessage error:', err.message);
    }
  }

  /**
   * Private: Persist read status
   */
  async persistReadStatus(roomId, userId) {
    // Update notifications as read for this room
    await Notification.updateMany(
      { 'data.roomId': roomId, userId },
      { isRead: true }
    ).catch(err => console.error('[ChatService] persistReadStatus error:', err));
  }

  /**
   * Private: Persist agent assignment
   */
  async persistAgentAssignment(roomId, agentId) {
    // Log agent assignment in order or chat message
    // Useful for analytics
  }

  /**
   * Private: Persist chat closure
   */
  async persistChatClosure(roomId, reason) {
    // Record chat closure with reason for analytics
    // Track resolution time, satisfaction, etc.
  }

  /**
   * Private: Fetch messages from database
   */
  async fetchMessagesFromDb(roomId, limit, offset) {
    // Query database for historical messages
    // Returns empty for now - would query chat_messages collection
    return [];
  }
}

// Export singleton
module.exports = new ChatService();
