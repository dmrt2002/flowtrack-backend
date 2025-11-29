export interface EmbedConfigDto {
    workspaceSlug: string;
    workflowId: string;
    iframe: {
        html: string;
        description: string;
    };
    script: {
        html: string;
        description: string;
    };
    api: {
        endpoint: string;
        method: string;
        curlExample: string;
        javascriptExample: string;
        pythonExample: string;
        description: string;
    };
    formConfig: {
        publicUrl: string;
        fields: Array<{
            fieldKey: string;
            label: string;
            type: string;
            required: boolean;
        }>;
    };
}
export interface PublicFormSchemaDto {
    workflowId: string;
    workspaceId: string;
    workspaceName: string;
    workspaceSlug: string;
    fields: Array<{
        id: string;
        fieldKey: string;
        label: string;
        fieldType: string;
        placeholder?: string;
        helpText?: string;
        isRequired: boolean;
        options?: Array<{
            label: string;
            value: string;
        }>;
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
        displayOrder: number;
    }>;
    settings: {
        formHeader?: string | null;
        formHeaderRich?: any | null;
        showFormHeader?: boolean;
        formDescription?: string | null;
        formDescriptionRich?: any | null;
        showFormDescription?: boolean;
        successMessage?: string;
        redirectUrl?: string;
        submitButtonText?: string;
        theme?: {
            primaryColor?: string;
            backgroundColor?: string;
        };
    };
    isActive: boolean;
    strategyName?: string;
}
