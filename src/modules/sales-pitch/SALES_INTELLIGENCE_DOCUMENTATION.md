# Sales Intelligence Feature - Complete Documentation

## Overview

The Sales Intelligence system is a **zero-cost AI-powered solution** that generates personalized sales pitches for leads using local Ollama LLM. It combines user company data with lead enrichment information to create contextual, relevant outreach messages.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Features](#core-features)
3. [Backend Implementation](#backend-implementation)
4. [Frontend Implementation](#frontend-implementation)
5. [Custom Prompt System](#custom-prompt-system)
6. [Batch Processing](#batch-processing)
7. [PDF Export](#pdf-export)
8. [Caching Strategy](#caching-strategy)
9. [API Reference](#api-reference)
10. [Usage Guide](#usage-guide)
11. [Configuration](#configuration)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Leads UI   │  │  Settings UI │  │   Batch Actions UI   │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    REST API (NestJS)                             │
│  ┌──────────────────────┐  ┌──────────────────────────────┐    │
│  │  SalesPitch API      │  │  PitchConfig API             │    │
│  │  - Generate          │  │  - Quick Settings            │    │
│  │  - Batch Generate    │  │  - Templates                 │    │
│  │  - Export PDF        │  │  - Advanced Config           │    │
│  └──────────────────────┘  └──────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  SalesPitchSvc   │  │  TemplateService │  │  QueueService│  │
│  │  - Orchestration │  │  - Handlebars    │  │  - BullMQ    │  │
│  │  - Caching       │  │  - Variables     │  │  - Jobs      │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Integration Layer                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  OllamaPitchSvc  │  │  PitchConfigSvc  │  │  PDFService  │  │
│  │  - LLM Calls     │  │  - JSONB Store   │  │  - jsPDF     │  │
│  │  - Parsing       │  │  - Workspace Cfg │  │  - Export    │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     Data Layer (PostgreSQL)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │    Lead      │  │   Workspace  │  │   SalesPitch       │    │
│  │  (enriched)  │  │  (settings)  │  │  (generated)       │    │
│  └──────────────┘  └──────────────┘  └────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    External Services                             │
│  ┌──────────────────┐  ┌──────────────────────────────────┐    │
│  │  Ollama (Local)  │  │  Lead Enrichment Services        │    │
│  │  - llama2/3      │  │  - Company data                  │    │
│  │  - mistral       │  │  - Tech stack                    │    │
│  └──────────────────┘  └──────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. User triggers pitch generation (single or batch)
2. System fetches lead data + enrichment
3. System loads workspace pitch configuration
4. Template service builds custom prompt from config
5. Ollama service generates pitch using LLM
6. Response parsed into structured format
7. Pitch saved to database with metadata
8. Result returned to frontend
9. User can export as PDF
```

---

## Core Features

### 1. **AI-Powered Pitch Generation**
- Uses local Ollama LLM (no external API costs)
- Supported models: Llama2, Llama3, Mistral
- Contextual pitch generation using lead data
- Structured output with key points and call-to-action

### 2. **Custom Prompt System**
- **Quick Settings**: Simple controls for tone, length, focus
- **Template Library**: 6 built-in + unlimited custom templates
- **Advanced Editor**: Full Handlebars template control
- **Live Preview**: Test with sample data before applying

### 3. **Batch Processing**
- Generate pitches for multiple leads simultaneously
- BullMQ job queue with concurrency control
- Real-time progress updates via WebSocket
- Automatic retry logic for failed generations

### 4. **Intelligent Caching**
- Pitches cached per lead with fingerprint validation
- Regenerate only when lead data changes
- 30-day automatic expiration
- Manual regeneration option

### 5. **PDF Export**
- Professional pitch documents
- Single or batch export
- Customizable branding
- Download as ZIP for batches

### 6. **Workspace Configuration**
- Stored in JSONB field (no schema migration)
- Per-workspace customization
- Version controlled
- Default fallback configuration

---

## Backend Implementation

### Module Structure

```
/backend/src/modules/sales-pitch/
├── sales-pitch.module.ts              # Module definition
├── sales-pitch.controller.ts          # Main API endpoints
│
├── controllers/
│   └── pitch-config.controller.ts     # Configuration API
│
├── services/
│   ├── sales-pitch.service.ts         # Orchestration & caching
│   ├── ollama-pitch.service.ts        # LLM integration
│   ├── pitch-queue.service.ts         # Batch processing
│   ├── pitch-template.service.ts      # Handlebars engine
│   └── pitch-config.service.ts        # Config management
│
├── processors/
│   └── pitch.processor.ts             # BullMQ job processor
│
├── types/
│   ├── sales-pitch.types.ts           # Core types
│   └── pitch-config.types.ts          # Configuration types
│
└── dto/
    ├── generate-pitch.dto.ts          # Request DTOs
    └── batch-generate-pitch.dto.ts    # Batch request DTOs
```

### Key Services

#### **1. SalesPitchService** (`sales-pitch.service.ts`)

**Purpose**: Main orchestration service

**Key Methods**:
```typescript
// Generate or retrieve cached pitch
async generateOrGetCachedPitch(leadId: string, workspaceId: string): Promise<SalesPitch>

// Force regenerate pitch
async regeneratePitch(leadId: string, workspaceId: string): Promise<SalesPitch>

// Get pitch by ID
async getPitch(pitchId: string, workspaceId: string): Promise<SalesPitch>

// Export single pitch as PDF
async exportPitchAsPDF(pitchId: string, workspaceId: string): Promise<Buffer>

// Export batch pitches as ZIP
async exportBatchPitchesAsZIP(pitchIds: string[], workspaceId: string): Promise<Buffer>

// Get pitches by workspace with pagination
async getPitchesByWorkspace(workspaceId: string, limit: number, offset: number): Promise<{ pitches: SalesPitch[], total: number }>
```

**Caching Logic**:
```typescript
// Check if cached pitch exists and is valid
const existingPitch = await this.prisma.salesPitch.findFirst({
  where: {
    leadId,
    workspaceId,
    generatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // 30 days
  }
});

// Validate fingerprint (detect if lead data changed)
if (existingPitch && this.isLeadDataUnchanged(existingPitch, currentLeadData)) {
  return existingPitch; // Return cached
}

// Generate new pitch
const newPitch = await this.generateNewPitch(lead, workspace);
```

#### **2. OllamaPitchService** (`ollama-pitch.service.ts`)

**Purpose**: LLM integration and prompt engineering

**Configuration**:
```typescript
private readonly ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
private readonly model = process.env.OLLAMA_MODEL || 'llama2';
```

**Key Methods**:
```typescript
// Main generation method
async generatePitch(
  context: PitchContext,
  customPrompt?: string,      // Custom template from config
  temperature?: number,        // AI creativity level
): Promise<SalesPitch>

// Build default prompt
private buildPrompt(context: PitchContext): string

// Parse LLM response into structured format
private parsePitchResponse(response: string): {
  keyPoints: string[],
  callToAction: string
}

// Health check
async healthCheck(): Promise<boolean>
```

**Default Prompt Structure**:
```typescript
`You are a sales expert. Generate a personalized sales pitch for:

User Company: ${userCompany.name}
Industry: ${userCompany.industry}

Lead Company: ${leadCompany.name}
Industry: ${leadCompany.industry}
Tech Stack: ${leadCompany.techStack.join(', ')}
Employee Count: ${leadCompany.employeeCount}

Generate a compelling pitch with:
1. 3-5 key points highlighting value proposition
2. Strong call-to-action

Format as JSON: { "keyPoints": [...], "callToAction": "..." }`
```

#### **3. PitchTemplateService** (`pitch-template.service.ts`)

**Purpose**: Handlebars template engine for custom prompts

**Key Methods**:
```typescript
// Build prompt from workspace configuration
buildPromptFromConfig(
  context: PitchContext,
  config: PitchConfiguration
): string

// Process custom Handlebars template
processCustomPrompt(
  templateString: string,
  context: PitchContext
): string

// Validate template syntax
validateTemplate(templateString: string): {
  valid: boolean,
  error?: string
}

// Get template by ID
getTemplate(config: PitchConfiguration): PitchTemplate
```

**Available Variables**:
```typescript
interface PromptVariables {
  userCompanyName: string;
  userCompanyIndustry: string;
  userCompanyDescription: string;
  leadCompanyName: string;
  leadIndustry: string;
  leadTechStack: string[];
  leadEmployeeCount: string;
  leadFoundedYear: number;
  leadDescription: string;
  leadWebsite: string;
  tone: PitchTone;
  length: PitchLength;
  focusAreas: PitchFocus[];
}
```

**Custom Helpers**:
```typescript
// Join array with separator
{{join leadTechStack ", "}}

// Conditional equality
{{#ifEquals tone "professional"}}...{{/ifEquals}}

// String transformations
{{upper userCompanyName}}
{{lower leadIndustry}}
```

#### **4. PitchConfigService** (`pitch-config.service.ts`)

**Purpose**: Workspace configuration management

**Storage**: `workspace.settings.pitchConfig` (JSONB field)

**Key Methods**:
```typescript
// Get workspace configuration
async getConfig(workspaceId: string): Promise<PitchConfiguration>

// Update quick settings (tone, length, focus)
async updateQuickSettings(
  workspaceId: string,
  quickSettings: Partial<PitchQuickSettings>
): Promise<PitchConfiguration>

// Select active template
async selectTemplate(
  workspaceId: string,
  templateId: string
): Promise<PitchConfiguration>

// Create custom template
async createCustomTemplate(
  workspaceId: string,
  template: Omit<PitchTemplate, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PitchConfiguration>

// Update custom template
async updateCustomTemplate(
  workspaceId: string,
  templateId: string,
  updates: Partial<PitchTemplate>
): Promise<PitchConfiguration>

// Delete custom template
async deleteCustomTemplate(
  workspaceId: string,
  templateId: string
): Promise<PitchConfiguration>

// Update advanced settings
async updateAdvancedConfig(
  workspaceId: string,
  advancedConfig: Partial<PitchAdvancedConfig>
): Promise<PitchConfiguration>

// Get all templates (built-in + custom)
async getAllTemplates(workspaceId: string): Promise<PitchTemplate[]>

// Reset to default configuration
async resetToDefault(workspaceId: string): Promise<PitchConfiguration>
```

**Default Configuration**:
```typescript
export const DEFAULT_PITCH_CONFIG: PitchConfiguration = {
  version: '1.0',
  quickSettings: {
    tone: PitchTone.PROFESSIONAL,
    length: PitchLength.MEDIUM,
    focusAreas: [PitchFocus.PROBLEM_SOLVING, PitchFocus.ROI],
  },
  selectedTemplateId: 'default-balanced',
  customTemplates: [],
  advancedConfig: {
    useCustomPrompt: false,
    customPromptTemplate: '',
    systemInstructions: '',
    temperature: 0.7,
    maxTokens: 2000,
  },
  enabledFeatures: {
    autoGenerate: false,
    batchGeneration: true,
    pdfExport: true,
  },
};
```

#### **5. PitchQueueService** (`pitch-queue.service.ts`)

**Purpose**: Batch processing with BullMQ

**Queue Configuration**:
```typescript
@InjectQueue('pitch-generation')
private pitchQueue: Queue

// Concurrency settings
const concurrency = 3; // Process 3 pitches simultaneously
const rateLimit = { max: 10, duration: 60000 }; // Max 10/minute
```

**Key Methods**:
```typescript
// Add batch job to queue
async addBatchGenerationJob(
  leadIds: string[],
  workspaceId: string
): Promise<string>

// Get job status
async getBatchJobStatus(jobId: string): Promise<JobStatus>

// Cancel job
async cancelBatchJob(jobId: string): Promise<void>

// Get job results
async getBatchJobResults(jobId: string): Promise<BatchResult>

// Clean completed jobs
async cleanCompletedJobs(olderThan: Date): Promise<void>
```

**Job Progress Events**:
```typescript
// Emit progress via WebSocket
socket.emit('batch-progress', {
  jobId,
  completed: 5,
  total: 10,
  currentLead: 'Acme Corp',
  percentage: 50
});
```

#### **6. PitchProcessor** (`pitch.processor.ts`)

**Purpose**: BullMQ job processor

**Job Processing**:
```typescript
@Processor('pitch-generation')
export class PitchProcessor {
  @Process('batch-generate')
  async processBatchGeneration(job: Job) {
    const { leadIds, workspaceId } = job.data;

    const results = [];
    let completed = 0;

    for (const leadId of leadIds) {
      try {
        // Generate pitch
        const pitch = await this.salesPitchService.generateOrGetCachedPitch(
          leadId,
          workspaceId
        );

        results.push({ leadId, success: true, pitch });

        // Update progress
        completed++;
        await job.updateProgress({
          completed,
          total: leadIds.length,
          percentage: Math.round((completed / leadIds.length) * 100)
        });

      } catch (error) {
        results.push({ leadId, success: false, error: error.message });
      }
    }

    return { results, completed, failed: results.filter(r => !r.success).length };
  }
}
```

### Database Schema

#### **SalesPitch Model**

```prisma
model SalesPitch {
  id                String   @id @default(cuid())
  workspaceId       String
  leadId            String

  // Content
  keyPoints         String[]
  callToAction      String
  fullPitch         String

  // Metadata
  model             String   // Ollama model used
  generatedAt       DateTime @default(now())
  dataFingerprint   String   // Hash of lead data for cache validation

  // Configuration snapshot
  configSnapshot    Json?    // Copy of config used for generation

  // Relations
  workspace         Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  lead              Lead      @relation(fields: [leadId], references: [id], onDelete: Cascade)

  @@unique([leadId, workspaceId])
  @@index([workspaceId])
  @@index([generatedAt])
  @@map("sales_pitches")
}
```

#### **Workspace Settings (JSONB)**

```typescript
// workspace.settings.pitchConfig structure
{
  version: "1.0",
  quickSettings: {
    tone: "professional",
    length: "medium",
    focusAreas: ["problem_solving", "roi"]
  },
  selectedTemplateId: "default-balanced",
  customTemplates: [
    {
      id: "custom-123",
      name: "Enterprise SaaS Template",
      description: "Tailored for enterprise SaaS leads",
      category: "custom",
      promptTemplate: "Generate a pitch for {{leadCompanyName}}...",
      quickSettings: { tone: "formal", length: "detailed", focusAreas: ["technical", "roi"] },
      isDefault: false,
      createdAt: "2025-12-04T10:00:00Z",
      updatedAt: "2025-12-04T10:00:00Z"
    }
  ],
  advancedConfig: {
    useCustomPrompt: false,
    customPromptTemplate: "",
    systemInstructions: "Always mention sustainability",
    temperature: 0.7,
    maxTokens: 2000
  },
  enabledFeatures: {
    autoGenerate: false,
    batchGeneration: true,
    pdfExport: true
  }
}
```

---

## Frontend Implementation

### Module Structure

```
/frontend/src/features/settings/
├── types/
│   └── pitch-config.ts                # TypeScript types
│
├── services/
│   └── pitch-config-api.ts            # API client
│
├── hooks/
│   └── use-pitch-config.ts            # React Query hooks
│
└── components/
    └── pitch-config/
        ├── PitchConfigSettings.tsx    # Main container
        ├── QuickSettingsTab.tsx       # Simple controls
        ├── TemplatesTab.tsx           # Template library
        ├── TemplateEditorDialog.tsx   # Template editor modal
        ├── AdvancedTab.tsx            # Advanced editor
        ├── PreviewTab.tsx             # Live preview
        └── index.ts                   # Exports
```

### Key Components

#### **1. PitchConfigSettings** (Main Container)

**Purpose**: 4-tab settings interface

**Features**:
- Tab navigation with icons
- Responsive layout
- Smooth animations
- Integrated into Settings page

**Code Structure**:
```typescript
export function PitchConfigSettings() {
  const [activeTab, setActiveTab] = useState('quick');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="quick">
          <Settings /> Quick Settings
        </TabsTrigger>
        <TabsTrigger value="templates">
          <FileText /> Templates
        </TabsTrigger>
        <TabsTrigger value="advanced">
          <Code /> Advanced
        </TabsTrigger>
        <TabsTrigger value="preview">
          <Eye /> Preview
        </TabsTrigger>
      </TabsList>

      <TabsContent value="quick"><QuickSettingsTab /></TabsContent>
      <TabsContent value="templates"><TemplatesTab /></TabsContent>
      <TabsContent value="advanced"><AdvancedTab /></TabsContent>
      <TabsContent value="preview"><PreviewTab /></TabsContent>
    </Tabs>
  );
}
```

#### **2. QuickSettingsTab** (Simple Configuration)

**Purpose**: Non-technical user interface

**Features**:
- 5 tone buttons (Professional, Casual, Friendly, Formal, Consultative)
- 3 length buttons (Concise, Medium, Detailed)
- 5 focus area checkboxes with descriptions
- Local state with unsaved changes detection
- Sticky save bar

**State Management**:
```typescript
const [localSettings, setLocalSettings] = useState<PitchQuickSettings | null>(null);
const currentSettings = localSettings || config?.quickSettings;
const hasChanges = localSettings !== null;

// Handle tone change
const handleToneChange = (tone: PitchTone) => {
  const newSettings = { ...currentSettings!, tone };
  setLocalSettings(newSettings);
};

// Handle save
const handleSave = async () => {
  if (!localSettings) return;
  await updateMutation.mutateAsync(localSettings);
  setLocalSettings(null); // Clear local state
};
```

#### **3. TemplatesTab** (Template Library)

**Purpose**: Browse and manage templates

**Features**:
- Built-in templates grid (6 predefined)
- Custom templates grid (user-created)
- Template card preview
- Create/edit/delete actions
- Selected template highlighting

**Template Card**:
```typescript
<div className="template-card">
  {/* Category badge */}
  <span className="badge">{template.category}</span>

  {/* Selected indicator */}
  {isSelected && <Check className="selected-icon" />}

  {/* Template info */}
  <h5>{template.name}</h5>
  <p>{template.description}</p>

  {/* Quick settings preview */}
  <div className="settings-preview">
    <div>Tone: {TONE_LABELS[template.quickSettings.tone]}</div>
    <div>Length: {LENGTH_LABELS[template.quickSettings.length]}</div>
    <div>Focus: {template.quickSettings.focusAreas.map(f => FOCUS_LABELS[f]).join(', ')}</div>
  </div>

  {/* Actions */}
  <Button onClick={() => handleSelect(template.id)}>
    {isSelected ? 'Selected' : 'Use Template'}
  </Button>

  {isCustom && (
    <>
      <Button onClick={() => handleEdit(template)}>
        <Edit /> Edit
      </Button>
      <Button onClick={() => handleDelete(template.id)}>
        <Trash2 /> Delete
      </Button>
    </>
  )}
</div>
```

#### **4. TemplateEditorDialog** (Custom Template Editor)

**Purpose**: Create/edit custom templates

**Features**:
- Name and description fields
- Handlebars code editor (textarea with monospace font)
- Variable help panel (toggleable)
- Real-time validation button
- Quick settings configuration
- Visual error feedback

**Validation Flow**:
```typescript
const handleValidate = async () => {
  if (!promptTemplate.trim()) {
    setValidationError('Template cannot be empty');
    return;
  }

  try {
    const result = await validateMutation.mutateAsync(promptTemplate);
    if (result.valid) {
      setValidationError(null);
      toast.success('Template is valid!');
    } else {
      setValidationError(result.error || 'Invalid template syntax');
    }
  } catch (error) {
    setValidationError('Failed to validate template');
  }
};
```

**Available Variables Panel**:
```typescript
{showVariablesHelp && (
  <div className="help-panel">
    <p>Available Variables:</p>
    <div className="variables-grid">
      <code>{'{{userCompanyName}}'}</code>
      <code>{'{{userCompanyIndustry}}'}</code>
      <code>{'{{leadCompanyName}}'}</code>
      <code>{'{{leadIndustry}}'}</code>
      <code>{'{{leadTechStack}}'}</code>
      <code>{'{{leadEmployeeCount}}'}</code>
      <code>{'{{leadFoundedYear}}'}</code>
      <code>{'{{leadDescription}}'}</code>
    </div>
    <p>
      <strong>Helpers:</strong>
      {'{{join array ", "}}'},
      {'{{#ifEquals a b}}...{{/ifEquals}}'},
      {'{{upper string}}'},
      {'{{lower string}}'}
    </p>
  </div>
)}
```

#### **5. AdvancedTab** (Power User Configuration)

**Purpose**: Full control over prompt and AI parameters

**Features**:
- Custom prompt toggle (enable/disable)
- Handlebars template editor (12 rows)
- System instructions textarea
- Temperature slider (0.0 - 1.0)
- Max tokens slider (500 - 4000)
- Real-time validation
- Warning messages

**Advanced Settings**:
```typescript
{/* Custom Prompt Toggle */}
<div className="toggle-container">
  <button
    onClick={() => handleToggleCustomPrompt(!currentConfig.useCustomPrompt)}
    className={`toggle ${currentConfig.useCustomPrompt ? 'enabled' : 'disabled'}`}
  >
    <span className="toggle-slider" />
  </button>
</div>

{/* Handlebars Editor */}
{currentConfig.useCustomPrompt && (
  <textarea
    value={currentConfig.customPromptTemplate}
    onChange={(e) => handleCustomPromptChange(e.target.value)}
    rows={12}
    className="code-editor"
  />
)}

{/* Temperature Slider */}
<div className="slider-container">
  <label>Temperature: {currentConfig.temperature?.toFixed(2)}</label>
  <input
    type="range"
    min="0"
    max="1"
    step="0.01"
    value={currentConfig.temperature || 0.7}
    onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
  />
  <div className="slider-labels">
    <span>Focused (0.0)</span>
    <span>Creative (1.0)</span>
  </div>
</div>

{/* Max Tokens Slider */}
<div className="slider-container">
  <label>Max Tokens: {currentConfig.maxTokens}</label>
  <input
    type="range"
    min="500"
    max="4000"
    step="100"
    value={currentConfig.maxTokens || 2000}
    onChange={(e) => handleMaxTokensChange(parseInt(e.target.value))}
  />
  <div className="slider-labels">
    <span>Short (500)</span>
    <span>Long (4000)</span>
  </div>
</div>
```

#### **6. PreviewTab** (Live Preview)

**Purpose**: Test configuration with sample data

**Features**:
- Current configuration summary
- 3 sample leads (TechCorp, HealthWise, RetailPro)
- Lead selection cards
- Generate preview button
- Mock pitch generation (simulated for now)
- Regenerate functionality

**Sample Leads**:
```typescript
const SAMPLE_LEADS = [
  {
    id: 'sample-1',
    name: 'TechCorp Inc',
    industry: 'Software Development',
    techStack: ['React', 'Node.js', 'PostgreSQL', 'AWS'],
    employeeCount: '50-200',
    foundedYear: 2018,
    description: 'B2B SaaS platform for project management and team collaboration',
  },
  {
    id: 'sample-2',
    name: 'HealthWise Solutions',
    industry: 'Healthcare',
    techStack: ['Python', 'Django', 'MySQL', 'Azure'],
    employeeCount: '200-500',
    foundedYear: 2015,
    description: 'Healthcare analytics platform helping hospitals optimize operations',
  },
  {
    id: 'sample-3',
    name: 'RetailPro Systems',
    industry: 'E-commerce',
    techStack: ['Vue.js', 'Laravel', 'Redis', 'GCP'],
    employeeCount: '10-50',
    foundedYear: 2020,
    description: 'AI-powered inventory management for online retailers',
  },
];
```

**Preview Generation** (Currently mocked, will connect to backend endpoint):
```typescript
const handleGeneratePreview = async () => {
  setIsGenerating(true);
  setError(null);

  try {
    // TODO: Call backend preview endpoint
    // const pitch = await pitchConfigApi.previewPitch(selectedLead);

    // Mock generation for now
    await new Promise(resolve => setTimeout(resolve, 2000));

    const mockPitch = `Hi ${selectedLead.name} team,

I noticed you're in the ${selectedLead.industry} space and using ${selectedLead.techStack.slice(0, 2).join(' and ')} in your stack.

Based on your company profile (${selectedLead.employeeCount} employees, founded ${selectedLead.foundedYear}), I think our solution could help with:

• Streamlining your development workflow
• Reducing infrastructure costs by up to 30%
• Improving team collaboration and productivity

${selectedLead.description ? `Given that you're focused on "${selectedLead.description}", our platform's integration capabilities would be particularly valuable.` : ''}

Would you be open to a quick 15-minute call to explore how we can help?

Best regards`;

    setGeneratedPitch(mockPitch);
  } catch (err) {
    setError('Failed to generate preview pitch');
  } finally {
    setIsGenerating(false);
  }
};
```

### React Query Hooks

**Query Keys Factory**:
```typescript
export const pitchConfigKeys = {
  all: ['pitch-config'] as const,
  config: () => [...pitchConfigKeys.all, 'config'] as const,
  templates: () => [...pitchConfigKeys.all, 'templates'] as const,
};
```

**Hook Examples**:
```typescript
// Fetch configuration
export function usePitchConfig() {
  return useQuery({
    queryKey: pitchConfigKeys.config(),
    queryFn: () => pitchConfigApi.getConfig(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Update quick settings
export function useUpdateQuickSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quickSettings: Partial<PitchQuickSettings>) =>
      pitchConfigApi.updateQuickSettings(quickSettings),
    onSuccess: (data) => {
      // Optimistic update
      queryClient.setQueryData(pitchConfigKeys.config(), data);
      toast.success('Quick settings updated');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to update quick settings';
      toast.error(message);
    },
  });
}

// Select template
export function useSelectTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => pitchConfigApi.selectTemplate(templateId),
    onSuccess: (data) => {
      queryClient.setQueryData(pitchConfigKeys.config(), data);
      toast.success('Template selected');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to select template';
      toast.error(message);
    },
  });
}
```

---

## Custom Prompt System

### Built-in Templates

#### **1. Balanced (Default)**
```handlebars
Generate a professional sales pitch for {{userCompanyName}} reaching out to {{leadCompanyName}}.

Context:
- {{leadCompanyName}} is in {{leadIndustry}} with {{leadEmployeeCount}} employees
- Tech stack: {{join leadTechStack ", "}}
- Founded: {{leadFoundedYear}}

Create a {{length}} pitch with {{tone}} tone focusing on:
{{#each focusAreas}}
- {{this}}
{{/each}}

Include:
1. Brief introduction referencing their industry
2. 3-5 key value propositions
3. Strong call-to-action

Keep it concise and relevant to their business needs.
```

#### **2. Technical Deep Dive**
```handlebars
Generate a technical sales pitch for {{userCompanyName}} targeting {{leadCompanyName}}.

Technical Context:
- Stack: {{join leadTechStack ", "}}
- Industry: {{leadIndustry}}
- Scale: {{leadEmployeeCount}} employees

Focus on:
- Technical integrations and compatibility
- Architecture and scalability
- Developer experience
- API documentation and support

Tone: {{tone}}
Length: {{length}}

Emphasize technical benefits and include specific integration examples.
```

#### **3. ROI & Business Value**
```handlebars
Generate an executive-level pitch for {{userCompanyName}} to {{leadCompanyName}}.

Company Profile:
- {{leadCompanyName}} ({{leadIndustry}})
- {{leadEmployeeCount}} employees
- Founded {{leadFoundedYear}}

Focus on quantifiable business outcomes:
- Cost savings (specific percentages)
- Revenue impact
- Efficiency gains
- ROI timeline

Use {{tone}} tone with {{length}} format.

Include concrete numbers and business metrics.
```

#### **4. Relationship Builder**
```handlebars
Generate a rapport-building pitch from {{userCompanyName}} to {{leadCompanyName}}.

Create a {{tone}}, {{length}} message that:
- References shared industry experience ({{leadIndustry}})
- Acknowledges their company journey (founded {{leadFoundedYear}})
- Highlights common ground
- Builds trust through understanding their challenges

Focus on relationship over hard sell.
Include warm call-to-action for conversation.
```

#### **5. Competitive Positioning**
```handlebars
Generate a competitive positioning pitch for {{userCompanyName}} to {{leadCompanyName}}.

Context:
- Lead: {{leadCompanyName}} in {{leadIndustry}}
- Stack: {{join leadTechStack ", "}}

Emphasize competitive advantages:
- Unique differentiators
- Why we're different from competitors
- Market positioning
- Specific capabilities others don't have

Tone: {{tone}}
Length: {{length}}

Be assertive but not aggressive. Focus on our strengths.
```

#### **6. Concise Elevator Pitch**
```handlebars
Generate a brief elevator pitch from {{userCompanyName}} to {{leadCompanyName}}.

Quick Context:
- Lead: {{leadCompanyName}} ({{leadIndustry}})
- Stack: {{join leadTechStack ", "}}

Create a CONCISE pitch (3-4 sentences max) with:
1. Quick intro hook
2. One key value proposition
3. Clear next step

Tone: {{tone}}

Keep it punchy and action-oriented.
```

### Custom Template Examples

#### **Example 1: SaaS Template**
```handlebars
Hi {{leadCompanyName}} team,

I noticed you're building {{leadDescription}} using {{join leadTechStack " and "}}.

As a {{leadIndustry}} company with {{leadEmployeeCount}} employees, you're at the perfect scale to benefit from our platform.

Here's what we can help with:

{{#ifEquals length "concise"}}
• {{upper "Rapid Integration"}} - Connect in under 24 hours
• {{upper "Cost Savings"}} - Reduce infrastructure costs by 30%
• {{upper "Scale Ready"}} - Handle growth from 10 to 10,000 users
{{else}}
• **Rapid Integration**: Our SDK integrates with {{join leadTechStack ", "}} in under 24 hours. No complex setup, just plug-and-play.

• **Significant Cost Savings**: Based on companies of your size, we typically help reduce infrastructure costs by 25-35% in the first quarter.

• **Built for Scale**: Whether you're at {{leadEmployeeCount}} employees or planning to 10x, our platform scales seamlessly.

• **Developer Experience**: Comprehensive docs, active community, and responsive support. Your team will be productive from day one.

• **Proven in {{leadIndustry}}**: We work with 50+ companies in your space and understand the specific challenges you face.
{{/ifEquals}}

Would you be open to a 15-minute call next week to explore how we can help {{leadCompanyName}} achieve its goals?

Best,
{{userCompanyName}} Team

P.S. - We've helped similar companies in {{leadIndustry}} save an average of 20 hours/week. Happy to share case studies.
```

#### **Example 2: Enterprise Template**
```handlebars
Dear {{leadCompanyName}} Leadership,

{{userCompanyName}} has been tracking your impressive growth in the {{leadIndustry}} sector since your founding in {{leadFoundedYear}}.

**Executive Summary:**

{{#ifEquals focusAreas "roi"}}
Our platform delivers measurable ROI through:
- 35% average cost reduction in first 90 days
- 2.5x faster time-to-market for new features
- 99.99% uptime SLA with enterprise support
{{/ifEquals}}

{{#ifEquals focusAreas "technical"}}
Technical Alignment:
Your stack ({{join leadTechStack ", "}}) integrates seamlessly with our platform through:
- Native SDKs for all your technologies
- RESTful APIs with comprehensive documentation
- Webhooks for real-time event processing
- SOC 2 Type II and GDPR compliance built-in
{{/ifEquals}}

**Proposed Next Steps:**

1. **Week 1**: Technical deep-dive with your engineering team
2. **Week 2**: Business case review with stakeholders
3. **Week 3**: Pilot program with defined success metrics
4. **Week 4**: Decision point with clear ROI projection

Given your scale ({{leadEmployeeCount}} employees), we estimate {{userCompanyName}} could save your team approximately $250K annually while improving velocity by 40%.

Are you available for a 30-minute executive briefing next week?

Regards,
{{userCompanyName}} Enterprise Team
```

### Variable Reference

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `{{userCompanyName}}` | string | Your company name | "FlowTrack" |
| `{{userCompanyIndustry}}` | string | Your company industry | "B2B SaaS" |
| `{{userCompanyDescription}}` | string | Your company description | "Sales automation platform" |
| `{{leadCompanyName}}` | string | Lead company name | "TechCorp Inc" |
| `{{leadIndustry}}` | string | Lead industry | "Software Development" |
| `{{leadTechStack}}` | array | Lead technologies | ["React", "Node.js", "AWS"] |
| `{{leadEmployeeCount}}` | string | Employee range | "50-200" |
| `{{leadFoundedYear}}` | number | Founded year | 2018 |
| `{{leadDescription}}` | string | Company description | "B2B SaaS platform..." |
| `{{leadWebsite}}` | string | Company website | "techcorp.com" |
| `{{tone}}` | enum | Selected tone | "professional" |
| `{{length}}` | enum | Selected length | "medium" |
| `{{focusAreas}}` | array | Selected focus areas | ["roi", "technical"] |

### Helper Functions

#### **join** - Join array with separator
```handlebars
{{join leadTechStack ", "}}
// Output: "React, Node.js, PostgreSQL, AWS"

{{join leadTechStack " and "}}
// Output: "React and Node.js and PostgreSQL and AWS"
```

#### **ifEquals** - Conditional equality check
```handlebars
{{#ifEquals tone "professional"}}
  This is professional tone content
{{else}}
  This is other tone content
{{/ifEquals}}

{{#ifEquals length "concise"}}
  • Brief point 1
  • Brief point 2
{{else}}
  • Detailed explanation of point 1 with examples
  • Comprehensive overview of point 2 with metrics
{{/ifEquals}}
```

#### **upper** - Convert to uppercase
```handlebars
{{upper userCompanyName}}
// Output: "FLOWTRACK"

{{upper "important message"}}
// Output: "IMPORTANT MESSAGE"
```

#### **lower** - Convert to lowercase
```handlebars
{{lower leadIndustry}}
// Output: "software development"

{{lower "TECH STACK"}}
// Output: "tech stack"
```

---

## Batch Processing

### Job Flow

```
1. User selects multiple leads
2. Frontend calls POST /api/v1/sales-pitch/batch-generate
3. Backend creates BullMQ job with leadIds
4. Job added to queue and returns jobId
5. Frontend polls for status or subscribes to WebSocket
6. BullMQ processor picks up job
7. Processes leads with concurrency limit (3 simultaneous)
8. Emits progress updates after each lead
9. Returns final results with success/failure counts
10. Frontend displays results and allows export
```

### API Endpoints

#### **Start Batch Job**
```typescript
POST /api/v1/sales-pitch/batch-generate
Body: {
  leadIds: string[]
}
Response: {
  jobId: string
  message: string
}
```

#### **Get Job Status**
```typescript
GET /api/v1/sales-pitch/batch-status/:jobId
Response: {
  jobId: string
  status: 'waiting' | 'active' | 'completed' | 'failed'
  progress: {
    completed: number
    total: number
    percentage: number
  }
  result?: {
    completed: number
    failed: number
    results: Array<{
      leadId: string
      success: boolean
      pitch?: SalesPitch
      error?: string
    }>
  }
}
```

#### **Cancel Job**
```typescript
POST /api/v1/sales-pitch/batch-cancel/:jobId
Response: {
  message: string
}
```

### WebSocket Events

#### **Subscribe to Progress**
```typescript
socket.on('batch-progress', (data) => {
  console.log('Progress:', data);
  // {
  //   jobId: 'job-123',
  //   completed: 5,
  //   total: 10,
  //   currentLead: 'Acme Corp',
  //   percentage: 50
  // }
});
```

#### **Job Completed**
```typescript
socket.on('batch-completed', (data) => {
  console.log('Completed:', data);
  // {
  //   jobId: 'job-123',
  //   completed: 10,
  //   failed: 0,
  //   duration: 45000 // milliseconds
  // }
});
```

#### **Job Failed**
```typescript
socket.on('batch-failed', (data) => {
  console.error('Failed:', data);
  // {
  //   jobId: 'job-123',
  //   error: 'Ollama service unavailable'
  // }
});
```

### Concurrency Configuration

```typescript
// In pitch.processor.ts
@Processor('pitch-generation', {
  concurrency: 3, // Process 3 leads simultaneously
  limiter: {
    max: 10, // Max 10 jobs per duration
    duration: 60000, // 1 minute
  },
})
```

### Retry Logic

```typescript
// In pitch-queue.service.ts
await this.pitchQueue.add('batch-generate', data, {
  attempts: 3, // Retry up to 3 times
  backoff: {
    type: 'exponential',
    delay: 5000, // Start with 5 second delay
  },
  removeOnComplete: {
    age: 3600, // Keep for 1 hour after completion
    count: 100, // Keep last 100 completed jobs
  },
  removeOnFail: {
    age: 86400, // Keep failed jobs for 24 hours
  },
});
```

---

## PDF Export

### Single Pitch Export

**API Endpoint**:
```typescript
POST /api/v1/sales-pitch/export-pdf/:pitchId
Response: {
  type: 'application/pdf',
  headers: {
    'Content-Disposition': 'attachment; filename="pitch-acme-corp.pdf"'
  },
  body: Buffer
}
```

**PDF Structure**:
```
┌─────────────────────────────────────┐
│                                     │
│        [Company Logo]               │
│                                     │
│    Sales Pitch for [Lead Name]     │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  Generated: Dec 4, 2025, 3:00 PM   │
│  Model: Llama2                      │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  Key Points:                        │
│  • Point 1 with detailed text...   │
│  • Point 2 with detailed text...   │
│  • Point 3 with detailed text...   │
│                                     │
│  Call to Action:                    │
│  [CTA text...]                      │
│                                     │
│  Full Pitch:                        │
│  [Complete pitch text with         │
│   proper formatting and spacing]   │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  Company Information:               │
│  • Lead: [Name], [Industry]        │
│  • Employees: [Count]              │
│  • Tech: [Stack]                   │
│                                     │
└─────────────────────────────────────┘
```

### Batch Export (ZIP)

**API Endpoint**:
```typescript
POST /api/v1/sales-pitch/export-batch-pdf
Body: {
  pitchIds: string[]
}
Response: {
  type: 'application/zip',
  headers: {
    'Content-Disposition': 'attachment; filename="sales-pitches-2025-12-04.zip"'
  },
  body: Buffer
}
```

**ZIP Structure**:
```
sales-pitches-2025-12-04.zip
├── pitch-acme-corp.pdf
├── pitch-techstart-inc.pdf
├── pitch-globalsoft-ltd.pdf
└── manifest.json
```

**Manifest.json**:
```json
{
  "exportedAt": "2025-12-04T15:30:00Z",
  "totalPitches": 3,
  "workspace": "workspace-123",
  "files": [
    {
      "leadId": "lead-1",
      "leadName": "Acme Corp",
      "filename": "pitch-acme-corp.pdf",
      "generatedAt": "2025-12-04T15:00:00Z"
    },
    {
      "leadId": "lead-2",
      "leadName": "TechStart Inc",
      "filename": "pitch-techstart-inc.pdf",
      "generatedAt": "2025-12-04T15:05:00Z"
    },
    {
      "leadId": "lead-3",
      "leadName": "GlobalSoft Ltd",
      "filename": "pitch-globalsoft-ltd.pdf",
      "generatedAt": "2025-12-04T15:10:00Z"
    }
  ]
}
```

### Implementation

```typescript
// In sales-pitch.service.ts
async exportPitchAsPDF(pitchId: string, workspaceId: string): Promise<Buffer> {
  const pitch = await this.getPitch(pitchId, workspaceId);
  const lead = await this.prisma.lead.findUnique({ where: { id: pitch.leadId } });

  const pdf = new jsPDF();

  // Header
  pdf.setFontSize(20);
  pdf.text(`Sales Pitch for ${lead.companyName}`, 20, 20);

  // Metadata
  pdf.setFontSize(10);
  pdf.text(`Generated: ${pitch.generatedAt.toLocaleString()}`, 20, 30);
  pdf.text(`Model: ${pitch.model}`, 20, 35);

  // Key Points
  pdf.setFontSize(14);
  pdf.text('Key Points:', 20, 50);
  pdf.setFontSize(12);
  let y = 60;
  pitch.keyPoints.forEach((point, i) => {
    const lines = pdf.splitTextToSize(`• ${point}`, 170);
    pdf.text(lines, 20, y);
    y += lines.length * 7;
  });

  // Call to Action
  y += 10;
  pdf.setFontSize(14);
  pdf.text('Call to Action:', 20, y);
  pdf.setFontSize(12);
  y += 10;
  const ctaLines = pdf.splitTextToSize(pitch.callToAction, 170);
  pdf.text(ctaLines, 20, y);

  // Full Pitch
  y += ctaLines.length * 7 + 10;
  pdf.setFontSize(14);
  pdf.text('Full Pitch:', 20, y);
  pdf.setFontSize(11);
  y += 10;
  const pitchLines = pdf.splitTextToSize(pitch.fullPitch, 170);
  pdf.text(pitchLines, 20, y);

  return Buffer.from(pdf.output('arraybuffer'));
}

async exportBatchPitchesAsZIP(pitchIds: string[], workspaceId: string): Promise<Buffer> {
  const zip = new JSZip();
  const manifest = {
    exportedAt: new Date().toISOString(),
    totalPitches: pitchIds.length,
    workspace: workspaceId,
    files: [],
  };

  for (const pitchId of pitchIds) {
    const pitch = await this.getPitch(pitchId, workspaceId);
    const lead = await this.prisma.lead.findUnique({ where: { id: pitch.leadId } });

    const pdfBuffer = await this.exportPitchAsPDF(pitchId, workspaceId);
    const filename = `pitch-${lead.companyName.toLowerCase().replace(/\s+/g, '-')}.pdf`;

    zip.file(filename, pdfBuffer);

    manifest.files.push({
      leadId: pitch.leadId,
      leadName: lead.companyName,
      filename,
      generatedAt: pitch.generatedAt.toISOString(),
    });
  }

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  return await zip.generateAsync({ type: 'nodebuffer' });
}
```

---

## Caching Strategy

### Cache Validation

**Fingerprint Generation**:
```typescript
function generateLeadFingerprint(lead: Lead): string {
  const data = {
    companyName: lead.companyName,
    industry: lead.industry,
    techStack: lead.enrichment?.techStack || [],
    employeeCount: lead.enrichment?.employeeCount,
    description: lead.enrichment?.description,
  };

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex');
}
```

**Cache Check Logic**:
```typescript
async generateOrGetCachedPitch(leadId: string, workspaceId: string): Promise<SalesPitch> {
  // 1. Check for existing pitch within 30 days
  const existingPitch = await this.prisma.salesPitch.findFirst({
    where: {
      leadId,
      workspaceId,
      generatedAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days
      }
    }
  });

  if (!existingPitch) {
    // No cache, generate new pitch
    return await this.generateNewPitch(leadId, workspaceId);
  }

  // 2. Fetch current lead data
  const currentLead = await this.prisma.lead.findUnique({
    where: { id: leadId },
    include: { enrichment: true }
  });

  // 3. Generate current fingerprint
  const currentFingerprint = this.generateLeadFingerprint(currentLead);

  // 4. Compare fingerprints
  if (existingPitch.dataFingerprint === currentFingerprint) {
    // Data unchanged, return cached pitch
    return existingPitch;
  }

  // 5. Data changed, regenerate pitch
  return await this.regeneratePitch(leadId, workspaceId);
}
```

### Cache Invalidation

**Automatic Invalidation**:
- After 30 days from generation
- When lead data changes (detected by fingerprint)
- When workspace configuration changes significantly

**Manual Invalidation**:
```typescript
// Regenerate single pitch
POST /api/v1/sales-pitch/regenerate/:leadId

// Regenerate batch
POST /api/v1/sales-pitch/batch-regenerate
Body: { leadIds: string[] }
```

### Cache Cleanup

**Scheduled Job** (runs daily):
```typescript
@Cron('0 2 * * *') // 2 AM daily
async cleanExpiredPitches() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const deleted = await this.prisma.salesPitch.deleteMany({
    where: {
      generatedAt: {
        lt: thirtyDaysAgo
      }
    }
  });

  this.logger.log(`Cleaned ${deleted.count} expired pitches`);
}
```

---

## API Reference

### Sales Pitch Endpoints

#### **Generate Single Pitch**
```http
POST /api/v1/sales-pitch/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "leadId": "lead-123"
}

Response 200:
{
  "id": "pitch-456",
  "leadId": "lead-123",
  "workspaceId": "ws-789",
  "keyPoints": [
    "Point 1",
    "Point 2",
    "Point 3"
  ],
  "callToAction": "Schedule a demo today",
  "fullPitch": "Complete pitch text...",
  "model": "llama2",
  "generatedAt": "2025-12-04T15:00:00Z",
  "dataFingerprint": "abc123..."
}
```

#### **Get Pitch by ID**
```http
GET /api/v1/sales-pitch/:pitchId
Authorization: Bearer <token>

Response 200:
{
  "id": "pitch-456",
  "leadId": "lead-123",
  "workspaceId": "ws-789",
  "keyPoints": [...],
  "callToAction": "...",
  "fullPitch": "...",
  "model": "llama2",
  "generatedAt": "2025-12-04T15:00:00Z"
}
```

#### **Regenerate Pitch**
```http
POST /api/v1/sales-pitch/regenerate/:leadId
Authorization: Bearer <token>

Response 200:
{
  "id": "pitch-789",
  "leadId": "lead-123",
  // ... new pitch data
}
```

#### **List Workspace Pitches**
```http
GET /api/v1/sales-pitch?limit=20&offset=0
Authorization: Bearer <token>

Response 200:
{
  "pitches": [...],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

#### **Batch Generate**
```http
POST /api/v1/sales-pitch/batch-generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "leadIds": ["lead-1", "lead-2", "lead-3"]
}

Response 202:
{
  "jobId": "job-123",
  "message": "Batch generation started"
}
```

#### **Batch Status**
```http
GET /api/v1/sales-pitch/batch-status/:jobId
Authorization: Bearer <token>

Response 200:
{
  "jobId": "job-123",
  "status": "active",
  "progress": {
    "completed": 2,
    "total": 3,
    "percentage": 67
  }
}
```

#### **Export Single PDF**
```http
POST /api/v1/sales-pitch/export-pdf/:pitchId
Authorization: Bearer <token>

Response 200:
Content-Type: application/pdf
Content-Disposition: attachment; filename="pitch-acme-corp.pdf"
<PDF Buffer>
```

#### **Export Batch PDF**
```http
POST /api/v1/sales-pitch/export-batch-pdf
Authorization: Bearer <token>
Content-Type: application/json

{
  "pitchIds": ["pitch-1", "pitch-2", "pitch-3"]
}

Response 200:
Content-Type: application/zip
Content-Disposition: attachment; filename="sales-pitches-2025-12-04.zip"
<ZIP Buffer>
```

### Pitch Configuration Endpoints

#### **Get Configuration**
```http
GET /api/v1/pitch-config
Authorization: Bearer <token>

Response 200:
{
  "version": "1.0",
  "quickSettings": {
    "tone": "professional",
    "length": "medium",
    "focusAreas": ["problem_solving", "roi"]
  },
  "selectedTemplateId": "default-balanced",
  "customTemplates": [],
  "advancedConfig": {
    "useCustomPrompt": false,
    "customPromptTemplate": "",
    "systemInstructions": "",
    "temperature": 0.7,
    "maxTokens": 2000
  },
  "enabledFeatures": {
    "autoGenerate": false,
    "batchGeneration": true,
    "pdfExport": true
  }
}
```

#### **Get All Templates**
```http
GET /api/v1/pitch-config/templates
Authorization: Bearer <token>

Response 200:
[
  {
    "id": "default-balanced",
    "name": "Balanced (Default)",
    "description": "Well-rounded pitch covering all aspects",
    "category": "default",
    "promptTemplate": "...",
    "quickSettings": {...},
    "isDefault": true
  },
  // ... more templates
]
```

#### **Update Quick Settings**
```http
PATCH /api/v1/pitch-config/quick-settings
Authorization: Bearer <token>
Content-Type: application/json

{
  "tone": "casual",
  "length": "concise",
  "focusAreas": ["relationship", "problem_solving"]
}

Response 200:
{
  "version": "1.0",
  "quickSettings": {
    "tone": "casual",
    "length": "concise",
    "focusAreas": ["relationship", "problem_solving"]
  },
  // ... full config
}
```

#### **Select Template**
```http
POST /api/v1/pitch-config/select-template
Authorization: Bearer <token>
Content-Type: application/json

{
  "templateId": "default-technical"
}

Response 200:
{
  "version": "1.0",
  "selectedTemplateId": "default-technical",
  // ... full config
}
```

#### **Create Custom Template**
```http
POST /api/v1/pitch-config/templates
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Custom Template",
  "description": "Tailored for enterprise SaaS",
  "category": "custom",
  "promptTemplate": "Generate a pitch for {{leadCompanyName}}...",
  "quickSettings": {
    "tone": "formal",
    "length": "detailed",
    "focusAreas": ["technical", "roi"]
  },
  "isDefault": false
}

Response 201:
{
  "version": "1.0",
  "customTemplates": [
    {
      "id": "custom-123",
      "name": "My Custom Template",
      // ... full template
    }
  ],
  // ... full config
}
```

#### **Update Template**
```http
PATCH /api/v1/pitch-config/templates/:templateId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Template Name",
  "description": "New description"
}

Response 200:
{
  // ... updated config
}
```

#### **Delete Template**
```http
DELETE /api/v1/pitch-config/templates/:templateId
Authorization: Bearer <token>

Response 200:
{
  // ... updated config without deleted template
}
```

#### **Update Advanced Config**
```http
PATCH /api/v1/pitch-config/advanced
Authorization: Bearer <token>
Content-Type: application/json

{
  "useCustomPrompt": true,
  "customPromptTemplate": "My custom template...",
  "temperature": 0.8,
  "maxTokens": 3000
}

Response 200:
{
  // ... updated config
}
```

#### **Validate Template**
```http
POST /api/v1/pitch-config/validate-template
Authorization: Bearer <token>
Content-Type: application/json

{
  "template": "Generate pitch for {{leadCompanyName}}..."
}

Response 200:
{
  "valid": true
}

// OR

Response 400:
{
  "valid": false,
  "error": "Unknown helper: invalidHelper"
}
```

#### **Reset Configuration**
```http
POST /api/v1/pitch-config/reset
Authorization: Bearer <token>

Response 200:
{
  // ... default configuration
}
```

---

## Usage Guide

### For End Users

#### **Quick Start**

1. **Navigate to Leads Dashboard**
   - View all your leads with enrichment data

2. **Generate Single Pitch**
   - Click "Generate Pitch" button on any lead
   - System generates personalized pitch using AI
   - Review pitch and edit if needed
   - Export as PDF or copy to clipboard

3. **Batch Generation**
   - Select multiple leads using checkboxes
   - Click "Generate Pitches" in bulk actions
   - Monitor progress in real-time
   - Export all pitches as ZIP

#### **Customization**

1. **Go to Settings → Sales Pitch**

2. **Quick Settings** (Easiest)
   - Choose tone: Professional, Casual, Friendly, Formal, Consultative
   - Select length: Concise, Medium, Detailed
   - Pick focus areas: Technical, ROI, Relationship, Competitive, Problem-Solving
   - Save changes

3. **Templates** (Intermediate)
   - Browse 6 built-in templates
   - Select one that matches your use case
   - Or create custom template with simple variables

4. **Advanced** (Power Users)
   - Toggle custom prompt mode
   - Write Handlebars templates
   - Adjust AI temperature and max tokens
   - Add system instructions

5. **Preview** (Testing)
   - Select sample lead
   - Generate preview pitch
   - Test before applying to real leads

### For Developers

#### **Setup**

1. **Install Ollama**
```bash
# macOS
brew install ollama

# Linux
curl https://ollama.ai/install.sh | sh

# Windows
# Download from ollama.ai
```

2. **Pull Model**
```bash
ollama pull llama2
# OR
ollama pull llama3
# OR
ollama pull mistral
```

3. **Start Ollama**
```bash
ollama serve
# Runs on http://localhost:11434
```

4. **Configure Environment**
```bash
# .env
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama2
```

5. **Run Backend**
```bash
cd backend
npm install
npm run start:dev
```

#### **Creating Custom Templates**

**Basic Template**:
```handlebars
Generate a sales pitch for {{userCompanyName}} to {{leadCompanyName}}.

Lead info:
- Industry: {{leadIndustry}}
- Size: {{leadEmployeeCount}}
- Tech: {{join leadTechStack ", "}}

Create {{length}} pitch with {{tone}} tone.
```

**Advanced Template with Conditionals**:
```handlebars
{{#ifEquals length "concise"}}
  Generate 3-sentence pitch for {{leadCompanyName}}.
{{else}}
  Generate comprehensive pitch for {{leadCompanyName}} with detailed value props.
{{/ifEquals}}

Context:
- Stack: {{join leadTechStack " and "}}
- Founded: {{leadFoundedYear}}

{{#ifEquals tone "formal"}}
  Use executive language with quantifiable metrics.
{{else}}
  Use conversational tone building rapport.
{{/ifEquals}}

Focus on:
{{#each focusAreas}}
- {{this}}
{{/each}}
```

**Enterprise Template**:
```handlebars
Dear {{leadCompanyName}} Leadership,

{{upper userCompanyName}} has been observing your growth in {{leadIndustry}}.

**Why This Matters:**

{{#ifEquals focusAreas "roi"}}
Expected ROI for companies of your size ({{leadEmployeeCount}} employees):
- 35% cost reduction in Q1
- 2.5x faster delivery
- $250K annual savings
{{/ifEquals}}

{{#ifEquals focusAreas "technical"}}
Technical Integration:
Your stack ({{join leadTechStack ", "}}) integrates via:
- Native SDKs for all technologies
- RESTful APIs with full docs
- Real-time webhooks
- SOC 2 & GDPR compliant
{{/ifEquals}}

Next Steps:
1. Technical review (Week 1)
2. Business case (Week 2)
3. Pilot program (Week 3)
4. Decision point (Week 4)

Available for 30-min executive briefing?

Regards,
{{userCompanyName}} Team
```

#### **Testing Ollama Integration**

```bash
# Test Ollama health
curl http://localhost:11434/api/health

# Test model
curl http://localhost:11434/api/generate -d '{
  "model": "llama2",
  "prompt": "Generate a 3-sentence sales pitch for a SaaS company",
  "stream": false
}'

# Test via backend
curl http://localhost:3000/api/v1/sales-pitch/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"leadId": "lead-123"}'
```

#### **Monitoring**

**BullMQ Dashboard** (Optional):
```bash
npm install -g bull-board
bull-board --redis redis://localhost:6379
# Visit http://localhost:3000
```

**Check Queue Status**:
```typescript
// In your code
const jobs = await pitchQueue.getJobs(['active', 'waiting', 'completed', 'failed']);
console.log('Active:', jobs.filter(j => j.state === 'active').length);
console.log('Waiting:', jobs.filter(j => j.state === 'waiting').length);
```

**Logs**:
```bash
# Backend logs
tail -f backend/logs/app.log

# Ollama logs
journalctl -u ollama -f  # Linux
tail -f ~/.ollama/logs/server.log  # macOS
```

---

## Configuration

### Environment Variables

```bash
# Backend (.env)

# Ollama Configuration
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama2  # Options: llama2, llama3, mistral

# Redis (for BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/flowtrack

# JWT
JWT_SECRET=your-secret-key

# API
PORT=3000
NODE_ENV=development
```

### Module Configuration

**SalesPitchModule** (`sales-pitch.module.ts`):
```typescript
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'pitch-generation',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          age: 3600, // 1 hour
          count: 100,
        },
        removeOnFail: {
          age: 86400, // 24 hours
        },
      },
    }),
  ],
  controllers: [SalesPitchController, PitchConfigController],
  providers: [
    PrismaService,
    SalesPitchService,
    OllamaPitchService,
    PitchQueueService,
    PitchProcessor,
    PitchTemplateService,
    PitchConfigService,
  ],
  exports: [SalesPitchService, PitchQueueService, PitchConfigService],
})
```

### Frontend Configuration

**API Base URL** (`lib/request.ts`):
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
```

**React Query** (`app/layout.tsx`):
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

---

## Performance Considerations

### Optimization Strategies

1. **Caching**
   - 30-day pitch cache with fingerprint validation
   - React Query client-side caching (5 min stale time)
   - Redis for job queue state

2. **Batch Processing**
   - Concurrency limit of 3 simultaneous generations
   - Rate limiting: 10 jobs per minute
   - Exponential backoff on retries

3. **Database Queries**
   - Indexed on `workspaceId`, `leadId`, `generatedAt`
   - Unique constraint on `(leadId, workspaceId)`
   - Pagination on list endpoints

4. **LLM Optimization**
   - Local Ollama (no API latency)
   - Streaming disabled for predictable response times
   - Temperature tuning (0.7 default for balance)

### Scaling Considerations

**Horizontal Scaling**:
- Stateless API (scales with load balancer)
- Redis for shared job queue state
- PostgreSQL connection pooling

**Vertical Scaling**:
- Ollama benefits from more CPU/RAM
- Consider GPU for faster inference
- Increase BullMQ concurrency with more resources

**Cost Optimization**:
- Zero external API costs (local LLM)
- JSONB storage avoids schema migrations
- Automatic cache cleanup reduces storage

---

## Troubleshooting

### Common Issues

#### **"Ollama service unavailable"**
```bash
# Check if Ollama is running
curl http://localhost:11434/api/health

# Start Ollama
ollama serve

# Check logs
journalctl -u ollama -f  # Linux
tail -f ~/.ollama/logs/server.log  # macOS
```

#### **"Model not found"**
```bash
# List installed models
ollama list

# Pull model
ollama pull llama2
```

#### **"Pitch generation timeout"**
```typescript
// Increase timeout in ollama-pitch.service.ts
const response = await axios.post(
  `${this.ollamaUrl}/api/generate`,
  request,
  { timeout: 120000 } // 2 minutes -> 3 minutes
);
```

#### **"Queue not processing jobs"**
```bash
# Check Redis connection
redis-cli ping

# Check BullMQ queue
redis-cli KEYS "bull:pitch-generation:*"

# Clear stuck jobs
redis-cli DEL "bull:pitch-generation:active"
```

#### **"Template validation errors"**
- Ensure variables use double curly braces: `{{variable}}`
- Close all conditional blocks: `{{#ifEquals}}...{{/ifEquals}}`
- Use proper helper syntax: `{{join array ", "}}`
- Escape special characters in strings

### Debug Mode

**Enable verbose logging**:
```typescript
// In ollama-pitch.service.ts
private readonly logger = new Logger(OllamaPitchService.name, { verbose: true });

// Log prompts
this.logger.debug(`Prompt: ${prompt}`);

// Log responses
this.logger.debug(`Response: ${JSON.stringify(response.data)}`);
```

---

## Future Enhancements

### Planned Features

1. **A/B Testing**
   - Test multiple templates simultaneously
   - Track conversion rates per template
   - Automatic winner selection

2. **Analytics Dashboard**
   - Pitch performance metrics
   - Lead conversion tracking
   - Template effectiveness reports

3. **Auto-Generation Triggers**
   - Generate pitch when lead is enriched
   - Scheduled batch generation
   - Workflow integration

4. **Multi-Language Support**
   - Detect lead language
   - Generate pitches in multiple languages
   - Translation templates

5. **Voice Pitch Generation**
   - Text-to-speech integration
   - Voice tone customization
   - Audio export

6. **Email Integration**
   - Send pitches directly via email
   - Track opens and clicks
   - Follow-up automation

7. **CRM Sync**
   - Salesforce integration
   - HubSpot integration
   - Automatic lead enrichment

8. **Team Collaboration**
   - Share templates across workspace
   - Pitch approval workflow
   - Comments and feedback

---

## Changelog

### Version 1.0.0 (2025-12-04)

**Initial Release**

✅ **Core Features**
- AI-powered pitch generation with Ollama
- Intelligent caching with fingerprint validation
- Batch processing with BullMQ
- PDF export (single and batch)
- Custom prompt system with Handlebars
- 6 built-in templates
- Quick settings interface
- Advanced template editor
- Live preview with sample data

✅ **Backend**
- 5 services: SalesPitch, OllamaPitch, PitchQueue, PitchTemplate, PitchConfig
- 2 controllers: SalesPitch, PitchConfig
- 1 processor: Pitch job processor
- 20+ API endpoints
- PostgreSQL schema with SalesPitch model
- JSONB workspace configuration

✅ **Frontend**
- 9 React components
- 9 React Query hooks
- 4-tab settings interface
- Template library UI
- Advanced editor with validation
- Preview with sample leads

✅ **Documentation**
- Complete API reference
- Usage guide for end users
- Developer setup guide
- Custom template examples
- Troubleshooting section

---

## Credits

**Built with:**
- NestJS - Backend framework
- React/Next.js - Frontend framework
- Ollama - Local LLM inference
- Handlebars - Template engine
- BullMQ - Job queue
- jsPDF - PDF generation
- TanStack Query - State management
- Prisma - Database ORM
- PostgreSQL - Database
- Redis - Cache & queue

**AI Models:**
- Llama2/3 (Meta)
- Mistral (Mistral AI)

---

## License

Proprietary - FlowTrack Internal Use Only

---

## Support

For questions or issues:
- Email: support@flowtrack.com
- Slack: #sales-intelligence
- Docs: https://docs.flowtrack.com/sales-intelligence

---

**Last Updated:** December 4, 2025
**Version:** 1.0.0
**Maintained by:** FlowTrack Engineering Team
