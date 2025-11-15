// routes/channels.js
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyToken, requireVerified, requireAdmin, requireInstructor } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all channels for current user
router.get('/', verifyToken, requireVerified, async (req, res) => {
  try {
    const channels = await prisma.channel.findMany({
      where: {
        members: {
          some: {
            id: req.user.id
          }
        }
      },
      include: {
        members: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            avatar: true,
            role: true
          }
        },
        _count: {
          select: {
            messages: true,
            members: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: channels
    });
  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch channels'
    });
  }
});

// Get all available channels (for joining)
router.get('/available', verifyToken, requireVerified, async (req, res) => {
  try {
    const channels = await prisma.channel.findMany({
      where: {
        members: {
          none: {
            id: req.user.id
          }
        }
      },
      include: {
        _count: {
          select: {
            messages: true,
            members: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: channels
    });
  } catch (error) {
    console.error('Get available channels error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available channels'
    });
  }
});

// Get channel by ID
router.get('/:id', verifyToken, requireVerified, async (req, res) => {
  try {
    const { id } = req.params;

    const channel = await prisma.channel.findFirst({
      where: {
        id,
        members: {
          some: {
            id: req.user.id
          }
        }
      },
      include: {
        members: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            avatar: true,
            role: true
          }
        },
        messages: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true,
                role: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          },
          take: 50 // Last 50 messages
        }
      }
    });

    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found or access denied'
      });
    }

    res.json({
      success: true,
      data: channel
    });
  } catch (error) {
    console.error('Get channel error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch channel'
    });
  }
});

// Create new channel
router.post('/', verifyToken, requireVerified, async (req, res) => {
  try {
    const { name, description, isPublic = true } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Channel name is required'
      });
    }

    const channel = await prisma.channel.create({
      data: {
        name,
        description,
        members: {
          connect: [{ id: req.user.id }] // Creator automatically joins
        }
      },
      include: {
        members: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            avatar: true,
            role: true
          }
        },
        _count: {
          select: {
            messages: true,
            members: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Channel created successfully',
      data: channel
    });
  } catch (error) {
    console.error('Create channel error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create channel'
    });
  }
});

// Join channel
router.post('/:id/join', verifyToken, requireVerified, async (req, res) => {
  try {
    const { id } = req.params;

    const channel = await prisma.channel.update({
      where: { id },
      data: {
        members: {
          connect: { id: req.user.id }
        }
      },
      include: {
        members: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            avatar: true,
            role: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Joined channel successfully',
      data: channel
    });
  } catch (error) {
    console.error('Join channel error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join channel'
    });
  }
});

// Leave channel
router.post('/:id/leave', verifyToken, requireVerified, async (req, res) => {
  try {
    const { id } = req.params;

    const channel = await prisma.channel.update({
      where: { id },
      data: {
        members: {
          disconnect: { id: req.user.id }
        }
      }
    });

    res.json({
      success: true,
      message: 'Left channel successfully'
    });
  } catch (error) {
    console.error('Leave channel error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave channel'
    });
  }
});

// Add member to channel (Instructor/Admin only)
router.post('/:id/members', verifyToken, requireVerified, requireInstructor, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const channel = await prisma.channel.update({
      where: { id },
      data: {
        members: {
          connect: { id: userId }
        }
      },
      include: {
        members: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            avatar: true,
            role: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'User added to channel successfully',
      data: channel
    });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add user to channel'
    });
  }
});

// Remove member from channel (Instructor/Admin only)
router.delete('/:id/members/:userId', verifyToken, requireVerified, requireInstructor, async (req, res) => {
  try {
    const { id, userId } = req.params;

    const channel = await prisma.channel.update({
      where: { id },
      data: {
        members: {
          disconnect: { id: userId }
        }
      }
    });

    res.json({
      success: true,
      message: 'User removed from channel successfully'
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove user from channel'
    });
  }
});

export default router;