"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeHealthService = void 0;
const common_1 = require("@nestjs/common");
let RuntimeHealthService = class RuntimeHealthService {
    components = new Map();
    setComponentStatus(name, state, details) {
        this.components.set(name, {
            state,
            details,
            updatedAt: new Date().toISOString()
        });
    }
    getComponentStatuses() {
        return Array.from(this.components.entries()).reduce((accumulator, [name, status]) => {
            accumulator[name] = status;
            return accumulator;
        }, {});
    }
};
exports.RuntimeHealthService = RuntimeHealthService;
exports.RuntimeHealthService = RuntimeHealthService = __decorate([
    (0, common_1.Injectable)()
], RuntimeHealthService);
//# sourceMappingURL=runtime-health.service.js.map