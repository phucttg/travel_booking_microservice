"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingCreated = exports.BookingStatus = void 0;
const class_validator_1 = require("class-validator");
const validation_constants_1 = require("../validation/validation.constants");
const validation_decorators_1 = require("../validation/validation.decorators");
const flight_contract_1 = require("./flight.contract");
var BookingStatus;
(function (BookingStatus) {
    BookingStatus[BookingStatus["PENDING_PAYMENT"] = 0] = "PENDING_PAYMENT";
    BookingStatus[BookingStatus["CONFIRMED"] = 1] = "CONFIRMED";
    BookingStatus[BookingStatus["EXPIRED"] = 2] = "EXPIRED";
    BookingStatus[BookingStatus["CANCELED"] = 3] = "CANCELED";
})(BookingStatus || (exports.BookingStatus = BookingStatus = {}));
class BookingCreated {
    id;
    flightNumber;
    flightId;
    aircraftId;
    departureAirportId;
    arriveAirportId;
    flightDate;
    price;
    seatClass;
    currency;
    description;
    seatNumber;
    passengerName;
    userId;
    passengerId;
    bookingStatus;
    createdAt;
    paymentId;
    paymentExpiresAt;
    confirmedAt;
    updatedAt;
    canceledAt;
    expiredAt;
    constructor(partial) {
        Object.assign(this, partial);
    }
}
exports.BookingCreated = BookingCreated;
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], BookingCreated.prototype, "id", void 0);
__decorate([
    (0, validation_decorators_1.TrimmedText)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Matches)(validation_constants_1.FLIGHT_NUMBER_REGEX),
    __metadata("design:type", String)
], BookingCreated.prototype, "flightNumber", void 0);
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], BookingCreated.prototype, "flightId", void 0);
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], BookingCreated.prototype, "aircraftId", void 0);
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], BookingCreated.prototype, "departureAirportId", void 0);
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], BookingCreated.prototype, "arriveAirportId", void 0);
__decorate([
    (0, validation_decorators_1.ToDate)(),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], BookingCreated.prototype, "flightDate", void 0);
__decorate([
    (0, validation_decorators_1.ToNumber)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], BookingCreated.prototype, "price", void 0);
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsEnum)(flight_contract_1.SeatClass),
    __metadata("design:type", Number)
], BookingCreated.prototype, "seatClass", void 0);
__decorate([
    (0, validation_decorators_1.TrimmedText)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(3),
    __metadata("design:type", String)
], BookingCreated.prototype, "currency", void 0);
__decorate([
    (0, validation_decorators_1.TrimmedText)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], BookingCreated.prototype, "description", void 0);
__decorate([
    (0, validation_decorators_1.UppercaseText)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Matches)(validation_constants_1.SEAT_NUMBER_REGEX),
    __metadata("design:type", String)
], BookingCreated.prototype, "seatNumber", void 0);
__decorate([
    (0, validation_decorators_1.TrimmedText)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], BookingCreated.prototype, "passengerName", void 0);
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], BookingCreated.prototype, "userId", void 0);
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], BookingCreated.prototype, "passengerId", void 0);
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsEnum)(BookingStatus),
    __metadata("design:type", Number)
], BookingCreated.prototype, "bookingStatus", void 0);
__decorate([
    (0, validation_decorators_1.ToDate)(),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], BookingCreated.prototype, "createdAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], BookingCreated.prototype, "paymentId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, validation_decorators_1.ToDate)(),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], BookingCreated.prototype, "paymentExpiresAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, validation_decorators_1.ToDate)(),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], BookingCreated.prototype, "confirmedAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, validation_decorators_1.ToDate)(),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], BookingCreated.prototype, "updatedAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, validation_decorators_1.ToDate)(),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], BookingCreated.prototype, "canceledAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, validation_decorators_1.ToDate)(),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], BookingCreated.prototype, "expiredAt", void 0);
//# sourceMappingURL=booking.contract.js.map