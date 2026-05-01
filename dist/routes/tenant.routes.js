"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantRoutes = void 0;
const express_1 = require("express");
exports.tenantRoutes = (0, express_1.Router)();
exports.tenantRoutes.get('/', (req, res) => {
    res.json({ message: 'Tenant routes' });
});
