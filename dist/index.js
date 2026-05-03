"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const logger_1 = require("./config/logger");
const PORT = process.env.PORT || 4000;
app_1.default.listen(PORT, () => {
    console.log(`API running on port ${PORT}`);
    console.log(`API logs writing to ${logger_1.apiLogPath}`);
});
