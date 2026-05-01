"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewRoutes = void 0;
const express_1 = require("express");
exports.reviewRoutes = (0, express_1.Router)();
exports.reviewRoutes.get('/', (req, res) => {
    res.json({ message: 'Review routes' });
});
