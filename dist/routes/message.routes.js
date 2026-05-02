"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageRoutes = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const message_controller_1 = require("../controllers/message.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
exports.messageRoutes = (0, express_1.Router)();
exports.messageRoutes.use(auth_middleware_1.authenticate);
exports.messageRoutes.get('/conversations', message_controller_1.getConversations);
exports.messageRoutes.get('/conversations/:conversationId', message_controller_1.getMessages);
exports.messageRoutes.post('/', [
    (0, express_validator_1.body)('toUserId').optional().isUUID().withMessage('Target user ID must be valid'),
    (0, express_validator_1.body)('toEmail').optional().isEmail().withMessage('Target email must be valid'),
    (0, express_validator_1.body)('toEmail').custom((_value, { req }) => {
        if (!req.body.toUserId && !req.body.toEmail) {
            throw new Error('Target user ID or email is required');
        }
        return true;
    }),
    (0, express_validator_1.body)('text').notEmpty().withMessage('Message text is required')
], validate_middleware_1.validateRequest, message_controller_1.sendMessage);
exports.messageRoutes.put('/:messageId', [
    (0, express_validator_1.body)('text').notEmpty().withMessage('Message text is required')
], validate_middleware_1.validateRequest, message_controller_1.updateMessage);
exports.messageRoutes.delete('/:messageId', message_controller_1.deleteMessage);
exports.messageRoutes.patch('/conversations/:conversationId/read', message_controller_1.markAsRead);
