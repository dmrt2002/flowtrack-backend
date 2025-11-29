import { Injectable, BadRequestException } from '@nestjs/common';
import { FieldType } from '@prisma/client';

interface ValidationError {
  field: string;
  message: string;
  code: string;
}

interface FormField {
  fieldKey: string;
  label: string;
  fieldType: FieldType;
  isRequired: boolean;
  options?: any;
  validationRules?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    step?: number;
    minDate?: string;
    maxDate?: string;
  };
}

@Injectable()
export class FormValidationService {
  /**
   * Validate form submission data against form field schema
   */
  validateSubmission(
    formFields: FormField[],
    submissionData: Record<string, any>,
  ): { isValid: boolean; errors: ValidationError[] } {
    const errors: ValidationError[] = [];

    // Validate each form field
    for (const field of formFields) {
      const value = submissionData[field.fieldKey];

      // Check required fields
      if (field.isRequired && this.isEmpty(value)) {
        errors.push({
          field: field.fieldKey,
          message: `${field.label} is required`,
          code: 'REQUIRED_FIELD_MISSING',
        });
        continue;
      }

      // Skip validation if value is empty and field is not required
      if (this.isEmpty(value)) {
        continue;
      }

      // Type-specific validation
      const typeError = this.validateFieldType(field, value);
      if (typeError) {
        errors.push(typeError);
        continue;
      }

      // Custom validation rules
      const ruleErrors = this.validateRules(field, value);
      errors.push(...ruleErrors);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if value is empty (null, undefined, empty string, empty array)
   */
  private isEmpty(value: any): boolean {
    return (
      value === null ||
      value === undefined ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)
    );
  }

  /**
   * Validate field type constraints
   */
  private validateFieldType(
    field: FormField,
    value: any,
  ): ValidationError | null {
    switch (field.fieldType) {
      case FieldType.EMAIL:
        return this.validateEmail(field, value);

      case FieldType.NUMBER:
        return this.validateNumber(field, value);

      case FieldType.DATE:
        return this.validateDate(field, value);

      case FieldType.DROPDOWN:
        return this.validateDropdown(field, value);

      case FieldType.CHECKBOX:
        return this.validateCheckbox(field, value);

      case FieldType.TEXT:
      case FieldType.TEXTAREA:
        return this.validateText(field, value);

      default:
        return null;
    }
  }

  /**
   * Validate email format
   */
  private validateEmail(field: FormField, value: any): ValidationError | null {
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

  /**
   * Validate number value
   */
  private validateNumber(field: FormField, value: any): ValidationError | null {
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

  /**
   * Validate date value
   */
  private validateDate(field: FormField, value: any): ValidationError | null {
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

  /**
   * Validate dropdown selection
   */
  private validateDropdown(
    field: FormField,
    value: any,
  ): ValidationError | null {
    if (typeof value !== 'string') {
      return {
        field: field.fieldKey,
        message: `${field.label} must be a string`,
        code: 'INVALID_TYPE',
      };
    }

    // Check if value is in allowed options
    const options = field.options as Array<{ value: string; label: string }>;
    if (!options || !Array.isArray(options)) {
      return null; // Skip if options not properly configured
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

  /**
   * Validate checkbox value
   */
  private validateCheckbox(
    field: FormField,
    value: any,
  ): ValidationError | null {
    if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
      return {
        field: field.fieldKey,
        message: `${field.label} must be a boolean`,
        code: 'INVALID_TYPE',
      };
    }

    return null;
  }

  /**
   * Validate text/textarea value
   */
  private validateText(field: FormField, value: any): ValidationError | null {
    if (typeof value !== 'string') {
      return {
        field: field.fieldKey,
        message: `${field.label} must be a string`,
        code: 'INVALID_TYPE',
      };
    }

    return null;
  }

  /**
   * Validate custom validation rules
   */
  private validateRules(field: FormField, value: any): ValidationError[] {
    const errors: ValidationError[] = [];
    const rules = field.validationRules;

    if (!rules) {
      return errors;
    }

    // String length validation
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

      // Pattern validation
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
        } catch (e) {
          // Invalid regex pattern - skip validation
        }
      }
    }

    // Number range validation
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

    // Date range validation
    if (field.fieldType === FieldType.DATE) {
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

  /**
   * Sanitize and normalize form values
   */
  sanitizeValue(fieldType: FieldType, value: any): any {
    if (this.isEmpty(value)) {
      return null;
    }

    switch (fieldType) {
      case FieldType.EMAIL:
        return typeof value === 'string' ? value.trim().toLowerCase() : value;

      case FieldType.TEXT:
      case FieldType.TEXTAREA:
        return typeof value === 'string' ? value.trim() : value;

      case FieldType.NUMBER:
        return Number(value);

      case FieldType.CHECKBOX:
        return value === true || value === 'true';

      case FieldType.DATE:
        return new Date(value).toISOString();

      default:
        return value;
    }
  }
}
