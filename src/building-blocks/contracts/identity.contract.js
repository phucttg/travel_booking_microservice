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
exports.UserUpdated = exports.UserDeleted = exports.UserCreated = exports.PassengerType = exports.TokenType = exports.Role = void 0;
const class_validator_1 = require("class-validator");
const validation_decorators_1 = require("../validation/validation.decorators");
const validation_constants_1 = require("../validation/validation.constants");
var Role;
(function (Role) {
    Role[Role["USER"] = 0] = "USER";
    Role[Role["ADMIN"] = 1] = "ADMIN";
})(Role || (exports.Role = Role = {}));
var TokenType;
(function (TokenType) {
    TokenType[TokenType["ACCESS"] = 0] = "ACCESS";
    TokenType[TokenType["REFRESH"] = 1] = "REFRESH";
})(TokenType || (exports.TokenType = TokenType = {}));
var PassengerType;
(function (PassengerType) {
    PassengerType[PassengerType["UNKNOWN"] = 0] = "UNKNOWN";
    PassengerType[PassengerType["MALE"] = 1] = "MALE";
    PassengerType[PassengerType["FEMALE"] = 2] = "FEMALE";
    PassengerType[PassengerType["BABY"] = 3] = "BABY";
})(PassengerType || (exports.PassengerType = PassengerType = {}));
class UserCreated {
    id;
    email;
    name;
    isEmailVerified;
    role;
    passportNumber;
    age;
    passengerType;
    createdAt;
    updatedAt;
    constructor(partial) {
        Object.assign(this, partial);
    }
}
exports.UserCreated = UserCreated;
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UserCreated.prototype, "id", void 0);
__decorate([
    (0, validation_decorators_1.TrimmedText)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], UserCreated.prototype, "email", void 0);
__decorate([
    (0, validation_decorators_1.TrimmedText)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], UserCreated.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UserCreated.prototype, "isEmailVerified", void 0);
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsEnum)(Role),
    __metadata("design:type", Number)
], UserCreated.prototype, "role", void 0);
__decorate([
    (0, validation_decorators_1.TrimmedText)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Matches)(validation_constants_1.PASSPORT_NUMBER_REGEX),
    __metadata("design:type", String)
], UserCreated.prototype, "passportNumber", void 0);
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UserCreated.prototype, "age", void 0);
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsEnum)(PassengerType),
    __metadata("design:type", Number)
], UserCreated.prototype, "passengerType", void 0);
__decorate([
    (0, validation_decorators_1.ToDate)(),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], UserCreated.prototype, "createdAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, validation_decorators_1.ToDate)(),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], UserCreated.prototype, "updatedAt", void 0);
class UserDeleted {
    id;
    email;
    name;
    isEmailVerified;
    role;
    passportNumber;
    createdAt;
    updatedAt;
    constructor(partial) {
        Object.assign(this, partial);
    }
}
exports.UserDeleted = UserDeleted;
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UserDeleted.prototype, "id", void 0);
__decorate([
    (0, validation_decorators_1.TrimmedText)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], UserDeleted.prototype, "email", void 0);
__decorate([
    (0, validation_decorators_1.TrimmedText)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], UserDeleted.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UserDeleted.prototype, "isEmailVerified", void 0);
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsEnum)(Role),
    __metadata("design:type", Number)
], UserDeleted.prototype, "role", void 0);
__decorate([
    (0, validation_decorators_1.TrimmedText)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Matches)(validation_constants_1.PASSPORT_NUMBER_REGEX),
    __metadata("design:type", String)
], UserDeleted.prototype, "passportNumber", void 0);
__decorate([
    (0, validation_decorators_1.ToDate)(),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], UserDeleted.prototype, "createdAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, validation_decorators_1.ToDate)(),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], UserDeleted.prototype, "updatedAt", void 0);
class UserUpdated {
    id;
    email;
    name;
    isEmailVerified;
    role;
    passportNumber;
    age;
    passengerType;
    createdAt;
    updatedAt;
    constructor(partial) {
        Object.assign(this, partial);
    }
}
exports.UserUpdated = UserUpdated;
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UserUpdated.prototype, "id", void 0);
__decorate([
    (0, validation_decorators_1.TrimmedText)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], UserUpdated.prototype, "email", void 0);
__decorate([
    (0, validation_decorators_1.TrimmedText)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], UserUpdated.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UserUpdated.prototype, "isEmailVerified", void 0);
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsEnum)(Role),
    __metadata("design:type", Number)
], UserUpdated.prototype, "role", void 0);
__decorate([
    (0, validation_decorators_1.TrimmedText)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Matches)(validation_constants_1.PASSPORT_NUMBER_REGEX),
    __metadata("design:type", String)
], UserUpdated.prototype, "passportNumber", void 0);
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UserUpdated.prototype, "age", void 0);
__decorate([
    (0, validation_decorators_1.ToInteger)(),
    (0, class_validator_1.IsEnum)(PassengerType),
    __metadata("design:type", Number)
], UserUpdated.prototype, "passengerType", void 0);
__decorate([
    (0, validation_decorators_1.ToDate)(),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], UserUpdated.prototype, "createdAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, validation_decorators_1.ToDate)(),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], UserUpdated.prototype, "updatedAt", void 0);
//# sourceMappingURL=identity.contract.js.map