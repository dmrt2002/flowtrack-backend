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
export declare class FormValidationService {
    validateSubmission(formFields: FormField[], submissionData: Record<string, any>): {
        isValid: boolean;
        errors: ValidationError[];
    };
    private isEmpty;
    private validateFieldType;
    private validateEmail;
    private validateNumber;
    private validateDate;
    private validateDropdown;
    private validateCheckbox;
    private validateText;
    private validateRules;
    sanitizeValue(fieldType: FieldType, value: any): any;
}
export {};
