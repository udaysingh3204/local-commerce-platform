const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const chatService = require('../services/chatService');

const router = express.Router();

/**
 * Chat Routes - Live messaging for orders, support, and delivery
 * Protected endpoints require authentication
 */

/**
 * GET /api/chat/rooms/:type
 * Get all active chat rooms for authenticated user
 */
router.get('/rooms/:type', authMiddleware, async (req, res) => {
  try {
    const { type } = req.params;
    const { userId } = req.user;

    // Get all chat rooms where user is participant (from active chats)
    const userRooms = [];

    // This would typically query the database for persistent room list
    // For now, return structure that client expects
    res.json({
      success: true,
      rooms: userRooms,
      total: userRooms.length
    });
  } catch (err) {
    console.error('[ChatRoutes] GET rooms error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/chat/room
 * Create or get existing chat room
 */
router.post('/room', authMiddleware, async (req, res) => {
  try {
    const { type, orderId, driverId, agentId } = req.body;
    const { userId } = req.user;

    const context = { orderId, userId, driverId, agentId };
    const room = await chatService.getOrCreateRoom(type, context);

    res.json({
      success: true,
      room: {
        id: room.id,
        type: room.type,
        participants: room.participants,
        createdAt: room.createdAt,
        status: room.status
      }
    });
  } catch (err) {
    console.error('[ChatRoutes] POST room error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/chat/message
 * Send message to a chat room
 */
router.post('/message', authMiddleware, async (req, res) => {
  try {
    const { roomId, text, attachments, priority } = req.body;
    const { userId, name } = req.user;

    if (!roomId || !text) {
      return res.status(400).json({
        success: false,
        error: 'roomId and text are required'
      });
    }

    const message = await chatService.sendMessage(roomId, {
      senderId: userId,
      senderName: name,
      senderRole: req.user.role || 'customer',
      text,
      attachments: attachments || [],
      priority: priority || 'normal'
    });

    res.json({
      success: true,
      message
    });
  } catch (err) {
    console.error('[ChatRoutes] POST message error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/chat/conversation/:roomId
 * Get chat history with pagination
 */
router.get('/conversation/:roomId', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const messages = await chatService.getConversation(
      roomId,
      Math.min(parseInt(limit), 100), // Cap at 100
      parseInt(offset)
    );

    res.json({
      success: true,
      messages,
      total: messages.length
    });
  } catch (err) {
    console.error('[ChatRoutes] GET conversation error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/chat/read/:roomId
 * Mark messages as read in a room
 */
router.put('/read/:roomId', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.user;

    await chatService.markAsRead(roomId, userId);

    res.json({
      success: true,
      message: 'Marked as read'
    });
  } catch (err) {
    console.error('[ChatRoutes] PUT read error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/chat/assign-agent/:roomId
 * Assign support agent to chat (support staff only)
 */
router.post('/assign-agent/:roomId', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'support_agent' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only support staff can assign agents'
      });
    }

    const { roomId } = req.params;
    const { agentId } = req.body;

    const room = await chatService.assignAgent(roomId, agentId);

    res.json({
      success: true,
      room: {
        id: room.id,
        participants: room.participants,
        status: room.status
      }
    });
  } catch (err) {
    console.error('[ChatRoutes] POST assign-agent error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/chat/escalate/:roomId
 * Escalate a support chat
 */
router.post('/escalate/:roomId', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'support_agent' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only support staff can escalate chats'
      });
    }

    const { roomId } = req.params;
    const { reason } = req.body;

    const room = await chatService.escalateChat(roomId, reason);

    res.json({
      success: true,
      room: {
        id: room.id,
        escalated: room.escalated,
        escalationReason: room.escalationReason
      }
    });
  } catch (err) {
    console.error('[ChatRoutes] POST escalate error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/chat/close/:roomId
 * Close a chat room
 */
router.put('/close/:roomId', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { reason } = req.body;

    await chatService.closeChat(roomId, reason);

    res.json({
      success: true,
      message: 'Chat closed',
      reason
    });
  } catch (err) {
    console.error('[ChatRoutes] PUT close error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/chat/queue-stats
 * Get support queue statistics (admin/support only)
 */
router.get('/queue-stats', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'support_agent' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only support staff can view queue stats'
      });
    }

    const stats = await chatService.getQueueStats();

    res.json({
      success: true,
      stats
    });
  } catch (err) {
    console.error('[ChatRoutes] GET queue-stats error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/chat/agent-chats
 * Get chats assigned to authenticated agent
 */
router.get('/agent-chats', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'support_agent' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only support staff can view agent chats'
      });
    }

    const chats = chatService.getAgentChats(req.user.userId);

    res.json({
      success: true,
      chats,
      total: chats.length
    });
  } catch (err) {
    console.error('[ChatRoutes] GET agent-chats error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
