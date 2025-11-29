/**
 * DTO for embed code generation
 * Returns code snippets for different embedding methods
 */
export interface EmbedConfigDto {
  workspaceSlug: string;
  workflowId: string;

  // Iframe embed code
  iframe: {
    html: string;
    description: string;
  };

  // Script tag embed code
  script: {
    html: string;
    description: string;
  };

  // Headless API example
  api: {
    endpoint: string;
    method: string;
    curlExample: string;
    javascriptExample: string;
    pythonExample: string;
    description: string;
  };

  // Form configuration for reference
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

/**
 * DTO for public form schema
 * Returned when fetching form configuration
 */
export interface PublicFormSchemaDto {
  workflowId: string;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;

  // Form configuration
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

  // UI settings
  settings: {
    // Form header and description
    formHeader?: string | null;
    formHeaderRich?: any | null;
    showFormHeader?: boolean;
    formDescription?: string | null;
    formDescriptionRich?: any | null;
    showFormDescription?: boolean;
    // Submit button and success message
    successMessage?: string;
    redirectUrl?: string;
    submitButtonText?: string;
    theme?: {
      primaryColor?: string;
      backgroundColor?: string;
    };
  };

  // Metadata
  isActive: boolean;
  strategyName?: string;
}
