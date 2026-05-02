import { Router } from 'express';
import { body } from 'express-validator';
import { deleteMessage, getConversations, getMessages, markAsRead, sendMessage, updateMessage } from '../controllers/message.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';

export const messageRoutes = Router();

messageRoutes.use(authenticate);

messageRoutes.get('/conversations', getConversations);
messageRoutes.get('/conversations/:conversationId', getMessages);
messageRoutes.post(
  '/',
  [
    body('toUserId').optional().isUUID().withMessage('Target user ID must be valid'),
    body('toEmail').optional().isEmail().withMessage('Target email must be valid'),
    body('toEmail').custom((_value, { req }) => {
      if (!req.body.toUserId && !req.body.toEmail) {
        throw new Error('Target user ID or email is required');
      }
      return true;
    }),
    body('text').notEmpty().withMessage('Message text is required')
  ],
  validateRequest,
  sendMessage
);
messageRoutes.put(
  '/:messageId',
  [
    body('text').notEmpty().withMessage('Message text is required')
  ],
  validateRequest,
  updateMessage
);
messageRoutes.delete('/:messageId', deleteMessage);
messageRoutes.patch('/conversations/:conversationId/read', markAsRead);
