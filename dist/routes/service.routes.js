"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceRoutes = void 0;
const express_1 = require("express");
exports.serviceRoutes = (0, express_1.Router)();
exports.serviceRoutes.get('/', (req, res) => {
    res.json({ message: 'Service routes' });
});
