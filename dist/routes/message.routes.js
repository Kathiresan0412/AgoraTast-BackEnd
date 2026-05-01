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
    (0, express_validator_1.body)('toUserId').notEmpty().withMessage('Target user ID is required'),
    (0, express_validator_1.body)('text').notEmpty().withMessage('Message text is required')
], validate_middleware_1.validateRequest, message_controller_1.sendMessage);
exports.messageRoutes.patch('/conversations/:conversationId/read', message_controller_1.markAsRead);
