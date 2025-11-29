"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormValidationService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let FormValidationService = class FormValidationService {
    validateSubmission(formFields, submissionData) {
        const errors = [];
        for (const field of formFields) {
            const value = submissionData[field.fieldKey];
            if (field.isRequired && this.isEmpty(value)) {
                errors.push({
                    field: field.fieldKey,
                    message: `${field.label} is required`,
                    code: 'REQUIRED_FIELD_MISSING',
                });
                continue;
            }
            if (this.isEmpty(value)) {
                continue;
            }
            const typeError = this.validateFieldType(field, value);
            if (typeError) {
                errors.push(typeError);
                continue;
            }
            const ruleErrors = this.validateRules(field, value);
            errors.push(...ruleErrors);
        }
        return {
            isValid: errors.length === 0,
            errors,
        };
    }
    isEmpty(value) {
        return (value === null ||
            value === undefined ||
            value === '' ||
            (Array.isArray(value) && value.length === 0));
    }
    validateFieldType(field, value) {
        switch (field.fieldType) {
            case client_1.FieldType.EMAIL:
                return this.validateEmail(field, value);
            case client_1.FieldType.NUMBER:
                return this.validateNumber(field, value);
            case client_1.FieldType.DATE:
                return this.validateDate(field, value);
            case client_1.FieldType.DROPDOWN:
                return this.validateDropdown(field, value);
            case client_1.FieldType.CHECKBOX:
                return this.validateCheckbox(field, value);
            case client_1.FieldType.TEXT:
            case client_1.FieldType.TEXTAREA:
                return this.validateText(field, value);
            default:
                return null;
        }
    }
    validateEmail(field, value) {
        if (typeof value !== 'string') {
            return {
                field: field.fieldKey,
                message: `${field.label} must be a string`,
                code: 'INVALID_TYPE',
            };
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            return {
                field: field.fieldKey,
                message: `${field.label} must be a valid email address`,
                code: 'INVALID_EMAIL',
            };
        }
        return null;
    }
    validateNumber(field, value) {
        const numValue = Number(value);
        if (isNaN(numValue)) {
            return {
                field: field.fieldKey,
                message: `${field.label} must be a valid number`,
                code: 'INVALID_NUMBER',
            };
        }
        return null;
    }
    validateDate(field, value) {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
            return {
                field: field.fieldKey,
                message: `${field.label} must be a valid date`,
                code: 'INVALID_DATE',
            };
        }
        return null;
    }
    validateDropdown(field, value) {
        if (typeof value !== 'string') {
            return {
                field: field.fieldKey,
                message: `${field.label} must be a string`,
                code: 'INVALID_TYPE',
            };
        }
        const options = field.options;
        if (!options || !Array.isArray(options)) {
            return null;
        }
        const validValues = options.map((opt) => opt.value);
        if (!validValues.includes(value)) {
            return {
                field: field.fieldKey,
                message: `${field.label} must be one of: ${validValues.join(', ')}`,
                code: 'INVALID_OPTION',
            };
        }
        return null;
    }
    validateCheckbox(field, value) {
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
            return {
                field: field.fieldKey,
                message: `${field.label} must be a boolean`,
                code: 'INVALID_TYPE',
            };
        }
        return null;
    }
    validateText(field, value) {
        if (typeof value !== 'string') {
            return {
                field: field.fieldKey,
                message: `${field.label} must be a string`,
                code: 'INVALID_TYPE',
            };
        }
        return null;
    }
    validateRules(field, value) {
        const errors = [];
        const rules = field.validationRules;
        if (!rules) {
            return errors;
        }
        if (typeof value === 'string') {
            if (rules.minLength && value.length < rules.minLength) {
                errors.push({
                    field: field.fieldKey,
                    message: `${field.label} must be at least ${rules.minLength} characters`,
                    code: 'MIN_LENGTH',
                });
            }
            if (rules.maxLength && value.length > rules.maxLength) {
                errors.push({
                    field: field.fieldKey,
                    message: `${field.label} must be at most ${rules.maxLength} characters`,
                    code: 'MAX_LENGTH',
                });
            }
            if (rules.pattern) {
                try {
                    const regex = new RegExp(rules.pattern);
                    if (!regex.test(value)) {
                        errors.push({
                            field: field.fieldKey,
                            message: `${field.label} does not match the required format`,
                            code: 'PATTERN_MISMATCH',
                        });
                    }
                }
                catch (e) {
                }
            }
        }
        if (typeof value === 'number' || !isNaN(Number(value))) {
            const numValue = Number(value);
            if (rules.min !== undefined && numValue < rules.min) {
                errors.push({
                    field: field.fieldKey,
                    message: `${field.label} must be at least ${rules.min}`,
                    code: 'MIN_VALUE',
                });
            }
            if (rules.max !== undefined && numValue > rules.max) {
                errors.push({
                    field: field.fieldKey,
                    message: `${field.label} must be at most ${rules.max}`,
                    code: 'MAX_VALUE',
                });
            }
            if (rules.step !== undefined && numValue % rules.step !== 0) {
                errors.push({
                    field: field.fieldKey,
                    message: `${field.label} must be a multiple of ${rules.step}`,
                    code: 'STEP_MISMATCH',
                });
            }
        }
        if (field.fieldType === client_1.FieldType.DATE) {
            const dateValue = new Date(value);
            if (rules.minDate) {
                const minDate = new Date(rules.minDate);
                if (dateValue < minDate) {
                    errors.push({
                        field: field.fieldKey,
                        message: `${field.label} must be on or after ${rules.minDate}`,
                        code: 'MIN_DATE',
                    });
                }
            }
            if (rules.maxDate) {
                const maxDate = new Date(rules.maxDate);
                if (dateValue > maxDate) {
                    errors.push({
                        field: field.fieldKey,
                        message: `${field.label} must be on or before ${rules.maxDate}`,
                        code: 'MAX_DATE',
                    });
                }
            }
        }
        return errors;
    }
    sanitizeValue(fieldType, value) {
        if (this.isEmpty(value)) {
            return null;
        }
        switch (fieldType) {
            case client_1.FieldType.EMAIL:
                return typeof value === 'string' ? value.trim().toLowerCase() : value;
            case client_1.FieldType.TEXT:
            case client_1.FieldType.TEXTAREA:
                return typeof value === 'string' ? value.trim() : value;
            case client_1.FieldType.NUMBER:
                return Number(value);
            case client_1.FieldType.CHECKBOX:
                return value === true || value === 'true';
            case client_1.FieldType.DATE:
                return new Date(value).toISOString();
            default:
                return value;
        }
    }
};
exports.FormValidationService = FormValidationService;
exports.FormValidationService = FormValidationService = __decorate([
    (0, common_1.Injectable)()
], FormValidationService);
//# sourceMappingURL=form-validation.service.js.map