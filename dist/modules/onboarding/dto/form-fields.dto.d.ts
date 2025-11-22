import { z } from 'zod';
declare const formFieldSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    fieldKey: z.ZodString;
    label: z.ZodString;
    fieldType: z.ZodEnum<{
        TEXT: "TEXT";
        EMAIL: "EMAIL";
        NUMBER: "NUMBER";
        DROPDOWN: "DROPDOWN";
        TEXTAREA: "TEXTAREA";
        DATE: "DATE";
        CHECKBOX: "CHECKBOX";
    }>;
    placeholder: z.ZodOptional<z.ZodString>;
    helpText: z.ZodOptional<z.ZodString>;
    isRequired: z.ZodDefault<z.ZodBoolean>;
    options: z.ZodOptional<z.ZodArray<z.ZodObject<{
        value: z.ZodString;
        label: z.ZodString;
    }, z.core.$strip>>>;
    validationRules: z.ZodOptional<z.ZodObject<{
        minLength: z.ZodOptional<z.ZodNumber>;
        maxLength: z.ZodOptional<z.ZodNumber>;
        min: z.ZodOptional<z.ZodNumber>;
        max: z.ZodOptional<z.ZodNumber>;
        pattern: z.ZodOptional<z.ZodString>;
        step: z.ZodOptional<z.ZodNumber>;
        minDate: z.ZodOptional<z.ZodString>;
        maxDate: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    displayOrder: z.ZodNumber;
    isDefault: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const formFieldsSchema: z.ZodObject<{
    workflowId: z.ZodString;
    formFields: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        fieldKey: z.ZodString;
        label: z.ZodString;
        fieldType: z.ZodEnum<{
            TEXT: "TEXT";
            EMAIL: "EMAIL";
            NUMBER: "NUMBER";
            DROPDOWN: "DROPDOWN";
            TEXTAREA: "TEXTAREA";
            DATE: "DATE";
            CHECKBOX: "CHECKBOX";
        }>;
        placeholder: z.ZodOptional<z.ZodString>;
        helpText: z.ZodOptional<z.ZodString>;
        isRequired: z.ZodDefault<z.ZodBoolean>;
        options: z.ZodOptional<z.ZodArray<z.ZodObject<{
            value: z.ZodString;
            label: z.ZodString;
        }, z.core.$strip>>>;
        validationRules: z.ZodOptional<z.ZodObject<{
            minLength: z.ZodOptional<z.ZodNumber>;
            maxLength: z.ZodOptional<z.ZodNumber>;
            min: z.ZodOptional<z.ZodNumber>;
            max: z.ZodOptional<z.ZodNumber>;
            pattern: z.ZodOptional<z.ZodString>;
            step: z.ZodOptional<z.ZodNumber>;
            minDate: z.ZodOptional<z.ZodString>;
            maxDate: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        displayOrder: z.ZodNumber;
        isDefault: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type FormFieldsDto = z.infer<typeof formFieldsSchema>;
export type FormFieldDto = z.infer<typeof formFieldSchema>;
export {};
