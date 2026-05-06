"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_controller_1 = require("../controllers/auth.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const auth_middleware_1 = require("../middleware/auth.middleware");
exports.authRoutes = (0, express_1.Router)();
exports.authRoutes.post('/register', [
    (0, express_validator_1.body)('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    (0, express_validator_1.body)('role').optional().isIn(['customer', 'provider']).withMessage('Role must be customer or provider'),
], validate_middleware_1.validateRequest, auth_controller_1.register);
exports.authRoutes.post('/login', [
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('password').notEmpty().withMessage('Password is required'),
    (0, express_validator_1.body)('role').optional().isIn(['customer', 'provider', 'admin']).withMessage('Role must be customer, provider, or admin'),
], validate_middleware_1.validateRequest, auth_controller_1.login);
exports.authRoutes.post('/google', [
    (0, express_validator_1.body)('credential').notEmpty().withMessage('Google credential is required'),
    (0, express_validator_1.body)('role').optional().isIn(['customer', 'provider']).withMessage('Role must be customer or provider'),
], validate_middleware_1.validateRequest, auth_controller_1.googleLogin);
exports.authRoutes.get('/me', auth_middleware_1.authenticate, auth_controller_1.getMe);
