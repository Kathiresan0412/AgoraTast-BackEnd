import { Router } from 'express';
import { body } from 'express-validator';
import { getConversations, getMessages, sendMessage, markAsRead } from '../controllers/message.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';

export const messageRoutes = Router();

messageRoutes.use(authenticate);

messageRoutes.get('/conversations', getConversations);
messageRoutes.get('/conversations/:conversationId', getMessages);
messageRoutes.post(
  '/',
  [
    body('toUserId').notEmpty().withMessage('Target user ID is required'),
    body('text').notEmpty().withMessage('Message text is required')
  ],
  validateRequest,
  sendMessage
);
messageRoutes.patch('/conversations/:conversationId/read', markAsRead);
