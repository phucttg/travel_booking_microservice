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
exports.ReserveSeatRequestDto = exports.SeatDto = exports.FlightDto = exports.SeatReleaseRequested = exports.SeatReserved = exports.SeatCreated = exports.AirportCreated = exports.AircraftCreated = exports.FlightCreated = exports.SeatReleaseReason = exports.SeatType = exports.SeatClass = exports.FlightStatus = void 0;
const class_validator_1 = require("class-validator");
const validation_constants_1 = require("../validation/validation.constants");
const validation_decorators_1 = require("../validation/validation.decorators");
var FlightStatus;
(function (FlightStatus) {
    FlightStatus[FlightStatus["UNKNOWN"] = 0] = "UNKNOWN";
    FlightStatus[FlightStatus["FLYING"] = 1] = "FLYING";
    FlightStatus[FlightStatus["DELAY"] = 2] = "DELAY";
    FlightStatus[FlightStatus["CANCELED"] = 3] = "CANCELED";
    FlightStatus[FlightStatus["COMPLETED"] = 4] = "COMPLETED";
    FlightStatus[FlightStatus["SCHEDULED"] = 5] = "SCHEDULED";
})(FlightStatus || (exports.FlightStatus = FlightStatus = {}));
var SeatClass;
(function (SeatClass) {
    SeatClass[SeatClass["UNKNOWN"] = 0] = "UNKNOWN";
    SeatClass[SeatClass["FIRST_CLASS"] = 1] = "FIRST_CLASS";
    SeatClass[SeatClass["BUSINESS"] = 2] = "BUSINESS";
    SeatClass[SeatClass["ECONOMY"] = 3] = "ECONOMY";
})(SeatClass || (exports.SeatClass = SeatClass = {}));
var SeatType;
(function (SeatType) {
    SeatType[SeatType["UNKNOWN"] = 0] = "UNKNOWN";
    SeatType[SeatType["WINDOW"] = 1] = "WINDOW";
    SeatType[SeatType["MIDDLE"] = 2] = "MIDDLE";
    SeatType[SeatType["AISLE"] = 3] = "AISLE";
})(SeatType || (exports.SeatType = SeatType = {}));
var SeatReleaseReason;
(function (SeatReleaseReason) {
    SeatReleaseReason[SeatReleaseReason["BOOKING_CANCELED"] = 0] = "BOOKING_CANCELED";
    SeatReleaseReason[SeatReleaseReason["BOOKING_CREATE_FAILED"] = 1] = "BOOKING_CREATE_FAILED";
})(SeatReleaseReason || (exports.SeatReleaseReason = SeatReleaseReason = {}));
class FlightCreated {
    id;
    flightNumber;
    price;
    flightStatus;
    flightDate;
    departureDate;
    departureAirportId;
    aircraftId;
    arriveDate;
    arriveAirportId;
    durationMinutes;
    createdAt;
    updatedAt;
    constructor(request = {}) {
        Object.assign(this, request);
    }
}
exports.FlightCreated = FlightCreated;
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], FlightCreated.prototype, "id", void 0);
__decorate([
    (0, validation_decorators_1.TrimmedText)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Matches)(validation_constants_1.FLIGHT_NUMBER_REGEX),
    __metadata("design:type", String)
], FlightCreated.prototype, "flightNumber", void 0);
__decorate([
    (0, validation_decorators_1.ToNumber)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], FlightCreated.prototype, "price", void 0);
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsEnum)(FlightStatus),
    __metadata("design:type", Number)
], FlightCreated.prototype, "flightStatus", void 0);
__decorate([
    (0, validation_decorators_1.ToDate)(),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], FlightCreated.prototype, "flightDate", void 0);
__decorate([
    (0, validation_decorators_1.ToDate)(),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], FlightCreated.prototype, "departureDate", void 0);
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], FlightCreated.prototype, "departureAirportId", void 0);
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], FlightCreated.prototype, "aircraftId", void 0);
__decorate([
    (0, validation_decorators_1.ToDate)(),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], FlightCreated.prototype, "arriveDate", void 0);
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], FlightCreated.prototype, "arriveAirportId", void 0);
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], FlightCreated.prototype, "durationMinutes", void 0);
__decorate([
    (0, validation_decorators_1.ToDate)(),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], FlightCreated.prototype, "createdAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, validation_decorators_1.ToDate)(),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], FlightCreated.prototype, "updatedAt", void 0);
class AircraftCreated {
    id;
    model;
    name;
    manufacturingYear;
    createdAt;
    updatedAt;
    constructor(request = {}) {
        Object.assign(this, request);
    }
}
exports.AircraftCreated = AircraftCreated;
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], AircraftCreated.prototype, "id", void 0);
__decorate([
    (0, validation_decorators_1.TrimmedText)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], AircraftCreated.prototype, "model", void 0);
__decorate([
    (0, validation_decorators_1.TrimmedText)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], AircraftCreated.prototype, "name", void 0);
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], AircraftCreated.prototype, "manufacturingYear", void 0);
__decorate([
    (0, validation_decorators_1.ToDate)(),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], AircraftCreated.prototype, "createdAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, validation_decorators_1.ToDate)(),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], AircraftCreated.prototype, "updatedAt", void 0);
class AirportCreated {
    id;
    code;
    name;
    address;
    createdAt;
    updatedAt;
    constructor(request = {}) {
        Object.assign(this, request);
    }
}
exports.AirportCreated = AirportCreated;
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], AirportCreated.prototype, "id", void 0);
__decorate([
    (0, validation_decorators_1.UppercaseText)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(10),
    __metadata("design:type", String)
], AirportCreated.prototype, "code", void 0);
__decorate([
    (0, validation_decorators_1.TrimmedText)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], AirportCreated.prototype, "name", void 0);
__decorate([
    (0, validation_decorators_1.TrimmedText)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], AirportCreated.prototype, "address", void 0);
__decorate([
    (0, validation_decorators_1.ToDate)(),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], AirportCreated.prototype, "createdAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, validation_decorators_1.ToDate)(),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], AirportCreated.prototype, "updatedAt", void 0);
class SeatCreated {
    id;
    seatNumber;
    seatClass;
    seatType;
    flightId;
    isReserved;
    createdAt;
    updatedAt;
    constructor(request = {}) {
        Object.assign(this, request);
    }
}
exports.SeatCreated = SeatCreated;
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], SeatCreated.prototype, "id", void 0);
__decorate([
    (0, validation_decorators_1.UppercaseText)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Matches)(validation_constants_1.SEAT_NUMBER_REGEX),
    __metadata("design:type", String)
], SeatCreated.prototype, "seatNumber", void 0);
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsEnum)(SeatClass),
    __metadata("design:type", Number)
], SeatCreated.prototype, "seatClass", void 0);
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsEnum)(SeatType),
    __metadata("design:type", Number)
], SeatCreated.prototype, "seatType", void 0);
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], SeatCreated.prototype, "flightId", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SeatCreated.prototype, "isReserved", void 0);
__decorate([
    (0, validation_decorators_1.ToDate)(),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], SeatCreated.prototype, "createdAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, validation_decorators_1.ToDate)(),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], SeatCreated.prototype, "updatedAt", void 0);
class SeatReserved {
    id;
    seatNumber;
    seatClass;
    seatType;
    flightId;
    isReserved;
    createdAt;
    updatedAt;
    constructor(request = {}) {
        Object.assign(this, request);
    }
}
exports.SeatReserved = SeatReserved;
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], SeatReserved.prototype, "id", void 0);
__decorate([
    (0, validation_decorators_1.UppercaseText)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Matches)(validation_constants_1.SEAT_NUMBER_REGEX),
    __metadata("design:type", String)
], SeatReserved.prototype, "seatNumber", void 0);
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsEnum)(SeatClass),
    __metadata("design:type", Number)
], SeatReserved.prototype, "seatClass", void 0);
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsEnum)(SeatType),
    __metadata("design:type", Number)
], SeatReserved.prototype, "seatType", void 0);
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], SeatReserved.prototype, "flightId", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SeatReserved.prototype, "isReserved", void 0);
__decorate([
    (0, validation_decorators_1.ToDate)(),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], SeatReserved.prototype, "createdAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, validation_decorators_1.ToDate)(),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], SeatReserved.prototype, "updatedAt", void 0);
class SeatReleaseRequested {
    bookingId;
    seatNumber;
    flightId;
    reason;
    requestedAt;
    constructor(request = {}) {
        Object.assign(this, request);
    }
}
exports.SeatReleaseRequested = SeatReleaseRequested;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], SeatReleaseRequested.prototype, "bookingId", void 0);
__decorate([
    (0, validation_decorators_1.UppercaseText)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Matches)(validation_constants_1.SEAT_NUMBER_REGEX),
    __metadata("design:type", String)
], SeatReleaseRequested.prototype, "seatNumber", void 0);
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], SeatReleaseRequested.prototype, "flightId", void 0);
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsEnum)(SeatReleaseReason),
    __metadata("design:type", Number)
], SeatReleaseRequested.prototype, "reason", void 0);
__decorate([
    (0, validation_decorators_1.ToDate)(),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], SeatReleaseRequested.prototype, "requestedAt", void 0);
class FlightDto {
    id;
    flightNumber;
    price;
    flightStatus;
    flightDate;
    departureDate;
    departureAirportId;
    aircraftId;
    arriveDate;
    arriveAirportId;
    durationMinutes;
    createdAt;
    updatedAt;
    constructor(request = {}) {
        Object.assign(this, request);
    }
}
exports.FlightDto = FlightDto;
class SeatDto {
    id;
    seatNumber;
    seatClass;
    seatType;
    flightId;
    isReserved;
    createdAt;
    updatedAt;
    constructor(request = {}) {
        Object.assign(this, request);
    }
}
exports.SeatDto = SeatDto;
class ReserveSeatRequestDto {
    seatNumber;
    flightId;
    constructor(request = {}) {
        Object.assign(this, request);
    }
}
exports.ReserveSeatRequestDto = ReserveSeatRequestDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, validation_decorators_1.OptionalUppercaseText)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(validation_constants_1.SEAT_NUMBER_REGEX),
    __metadata("design:type", String)
], ReserveSeatRequestDto.prototype, "seatNumber", void 0);
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], ReserveSeatRequestDto.prototype, "flightId", void 0);
//# sourceMappingURL=flight.contract.js.map