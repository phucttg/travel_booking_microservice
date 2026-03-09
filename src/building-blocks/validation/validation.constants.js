"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SEAT_NUMBER_REGEX = exports.FLIGHT_NUMBER_REGEX = exports.AIRPORT_CODE_REGEX = exports.PASSPORT_NUMBER_REGEX = exports.PASSWORD_REGEX = exports.MAX_PAGE_SIZE = void 0;
exports.MAX_PAGE_SIZE = 100;
exports.PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).+$/;
exports.PASSPORT_NUMBER_REGEX = /^[A-Z0-9]{6,20}$/i;
exports.AIRPORT_CODE_REGEX = /^[A-Z0-9-]{2,10}$/;
exports.FLIGHT_NUMBER_REGEX = /^[A-Z0-9-]{2,20}$/i;
exports.SEAT_NUMBER_REGEX = /^[1-9]\d*[A-Z]$/;
//# sourceMappingURL=validation.constants.js.map