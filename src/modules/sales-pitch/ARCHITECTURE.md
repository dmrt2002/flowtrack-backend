# Sales Intelligence - Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React/Next.js)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────────────┐   │
│  │   Leads Page    │  │  Settings Page  │  │   Dashboard/Analytics    │   │
│  │                 │  │                 │  │                          │   │
│  │  • Lead List    │  │  • Quick Tabs   │  │  • Pitch Stats           │   │
│  │  • Gen Button   │  │  • Templates    │  │  • Success Rates         │   │
│  │  • Batch Select │  │  • Advanced     │  │  • Recent Activity       │   │
│  │  • Export PDF   │  │  • Preview      │  │                          │   │
│  └─────────────────┘  └─────────────────┘  └──────────────────────────┘   │
│           │                    │                        │                    │
│           └────────────────────┼────────────────────────┘                    │
│                                │                                             │
│                  ┌─────────────▼─────────────┐                              │
│                  │   React Query Hooks       │                              │
│                  │  • usePitchConfig()       │                              │
│                  │  • useGeneratePitch()     │                              │
│                  │  • useBatchGenerate()     │                              │
│                  └─────────────┬─────────────┘                              │
│                                │                                             │
│                  ┌─────────────▼─────────────┐                              │
│                  │   API Client (Axios)      │                              │
│                  │  • pitchConfigApi         │                              │
│                  │  • salesPitchApi          │                              │
│                  └─────────────┬─────────────┘                              │
└────────────────────────────────┼──────────────────────────────────────────────┘
                                 │
                                 │ HTTP/REST (port 3000)
                                 │
┌────────────────────────────────▼──────────────────────────────────────────────┐
│                         BACKEND (NestJS)                                      │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                        CONTROLLERS LAYER                                │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                          │ │
│  │  ┌──────────────────────────┐    ┌──────────────────────────────────┐ │ │
│  │  │  SalesPitchController    │    │  PitchConfigController           │ │ │
│  │  │  /api/v1/sales-pitch     │    │  /api/v1/pitch-config            │ │ │
│  │  │                          │    │                                  │ │ │
│  │  │  POST /generate          │    │  GET  /                          │ │ │
│  │  │  GET  /:id               │    │  GET  /templates                 │ │ │
│  │  │  POST /regenerate/:id    │    │  PATCH /quick-settings           │ │ │
│  │  │  GET  /                  │    │  POST  /select-template          │ │ │
│  │  │  POST /batch-generate    │    │  POST  /templates                │ │ │
│  │  │  GET  /batch-status/:id  │    │  PATCH /templates/:id            │ │ │
│  │  │  POST /export-pdf/:id    │    │  DELETE /templates/:id           │ │ │
│  │  │  POST /export-batch-pdf  │    │  PATCH /advanced                 │ │ │
│  │  │                          │    │  POST  /validate-template        │ │ │
│  │  │  @UseGuards(JwtAuth)     │    │  POST  /reset                    │ │ │
│  │  │  @GetWorkspace()         │    │                                  │ │ │
│  │  └──────────────────────────┘    └──────────────────────────────────┘ │ │
│  │                │                               │                        │ │
│  └────────────────┼───────────────────────────────┼────────────────────────┘ │
│                   │                               │                          │
│  ┌────────────────▼───────────────────────────────▼────────────────────────┐ │
│  │                         SERVICES LAYER                                  │ │
│  ├─────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                          │ │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │ │
│  │  │              SalesPitchService (Orchestrator)                       │ │ │
│  │  │  • generateOrGetCachedPitch()   - Main entry point                │ │ │
│  │  │  • regeneratePitch()             - Force new generation            │ │ │
│  │  │  • getPitch()                    - Fetch by ID                     │ │ │
│  │  │  • exportPitchAsPDF()            - Single PDF export               │ │ │
│  │  │  • exportBatchPitchesAsZIP()     - Batch ZIP export                │ │ │
│  │  │  • generateLeadFingerprint()     - Cache validation                │ │ │
│  │  └────────────────────────────────────────────────────────────────────┘ │ │
│  │         │              │              │              │                   │ │
│  │         │              │              │              │                   │ │
│  │  ┌──────▼──────┐ ┌────▼─────┐ ┌─────▼──────┐ ┌────▼──────────────────┐ │ │
│  │  │   Ollama    │ │ Template │ │   Config   │ │      Queue Service    │ │ │
│  │  │   Pitch     │ │ Service  │ │  Service   │ │                       │ │ │
│  │  │   Service   │ │          │ │            │ │  • addBatchJob()      │ │ │
│  │  │             │ │ • build  │ │ • getConf  │ │  • getJobStatus()     │ │ │
│  │  │ • generate  │ │   Prompt │ │ • update   │ │  • cancelJob()        │ │ │
│  │  │   Pitch()   │ │   From   │ │   Quick    │ │  • emit progress      │ │ │
│  │  │             │ │   Config │ │   Settings │ │                       │ │ │
│  │  │ • parse     │ │           │ │            │ │  BullMQ Integration   │ │ │
│  │  │   Response  │ │ • process│ │ • manage   │ │  Concurrency: 3       │ │ │
│  │  │             │ │   Custom │ │   Templates│ │  Rate Limit: 10/min   │ │ │
│  │  │ • health    │ │   Prompt │ │            │ │                       │ │ │
│  │  │   Check     │ │           │ │ • JSONB    │ │                       │ │ │
│  │  │             │ │ • validate│ │   Storage  │ │                       │ │ │
│  │  │ Handlebars  │ │  Template │ │            │ │                       │ │ │
│  │  │  Engine     │ │           │ │            │ │                       │ │ │
│  │  └─────────────┘ └───────────┘ └────────────┘ └────────┬──────────────┘ │ │
│  │         │              │              │                 │                │ │
│  └─────────┼──────────────┼──────────────┼─────────────────┼────────────────┘ │
│            │              │              │                 │                  │
│  ┌─────────▼──────────────▼──────────────▼─────────────────▼────────────────┐ │
│  │                       PROCESSORS LAYER                                   │ │
│  ├──────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                           │ │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                   PitchProcessor (BullMQ Worker)                    │ │ │
│  │  │                                                                      │ │ │
│  │  │  @Process('batch-generate')                                         │ │ │
│  │  │                                                                      │ │ │
│  │  │  async processBatchGeneration(job: Job) {                          │ │ │
│  │  │    1. Extract leadIds from job.data                                │ │ │
│  │  │    2. Loop through each lead                                       │ │ │
│  │  │    3. Call salesPitchService.generateOrGetCachedPitch()           │ │ │
│  │  │    4. Update job progress after each lead                          │ │ │
│  │  │    5. Collect results (success/failure)                            │ │ │
│  │  │    6. Return final results                                         │ │ │
│  │  │  }                                                                  │ │ │
│  │  │                                                                      │ │ │
│  │  │  Concurrency: 3 simultaneous jobs                                  │ │ │
│  │  │  Retry: 3 attempts with exponential backoff                        │ │ │
│  │  │  Cleanup: Remove completed after 1 hour                            │ │ │
│  │  │                                                                      │ │ │
│  │  └────────────────────────────────────────────────────────────────────┘ │ │
│  │                                  │                                       │ │
│  └──────────────────────────────────┼───────────────────────────────────────┘ │
│                                     │                                         │
│  ┌──────────────────────────────────▼───────────────────────────────────────┐ │
│  │                        DATA ACCESS LAYER                                 │ │
│  ├──────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                           │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │ │
│  │  │                       PrismaService                               │  │ │
│  │  │                                                                    │  │ │
│  │  │  Models:                                                          │  │ │
│  │  │  • SalesPitch - Generated pitches with metadata                  │  │ │
│  │  │  • Lead       - Lead information + enrichment                    │  │ │
│  │  │  • Workspace  - Workspace settings (JSONB config)                │  │ │
│  │  │                                                                    │  │ │
│  │  │  Indexes:                                                         │  │ │
│  │  │  • (leadId, workspaceId) - UNIQUE                                │  │ │
│  │  │  • workspaceId           - For queries                           │  │ │
│  │  │  • generatedAt           - For cache cleanup                     │  │ │
│  │  └──────────────────────────────────────────────────────────────────┘  │ │
│  │                                  │                                       │ │
│  └──────────────────────────────────┼───────────────────────────────────────┘ │
└────────────────────────────────────┼─────────────────────────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
┌───────────────────▼───┐  ┌─────────▼──────┐  ┌────▼──────────────┐
│  PostgreSQL Database  │  │  Redis Queue   │  │  Ollama (Local)   │
│                       │  │                │  │                   │
│  Tables:              │  │  Queues:       │  │  Models:          │
│  • sales_pitches      │  │  • pitch-gen   │  │  • llama2         │
│  • leads              │  │  • jobs        │  │  • llama3         │
│  • workspaces         │  │  • progress    │  │  • mistral        │
│  • enrichment         │  │                │  │                   │
│                       │  │  State:        │  │  API:             │
│  Workspace Settings:  │  │  • waiting     │  │  POST /generate   │
│  {                    │  │  • active      │  │  GET  /health     │
│    pitchConfig: {...} │  │  • completed   │  │                   │
│  }                    │  │  • failed      │  │  Port: 11434      │
│                       │  │                │  │  Local inference  │
│  Port: 5432           │  │  Port: 6379    │  │  Zero API cost    │
└───────────────────────┘  └────────────────┘  └───────────────────┘
```

---

## Data Flow Diagrams

### 1. Single Pitch Generation Flow

```
User Action: "Generate Pitch"
        │
        ▼
┌───────────────────┐
│   Frontend UI     │
│  (Leads Page)     │
│                   │
│  onClick={() =>   │
│    generate()     │
│  }                │
└─────────┬─────────┘
          │
          │ POST /api/v1/sales-pitch/generate
          │ { leadId: "lead-123" }
          │
          ▼
┌───────────────────────────────┐
│   SalesPitchController        │
│                               │
│  @Post('generate')            │
│  async generate(              │
│    @Body() dto,               │
│    @GetWorkspace() workspace  │
│  )                            │
└─────────┬─────────────────────┘
          │
          │ generateOrGetCachedPitch(leadId, workspaceId)
          │
          ▼
┌────────────────────────────────────────┐
│   SalesPitchService                    │
│                                        │
│  1. Check for cached pitch:            │
│     • Query database                   │
│     • Check if < 30 days old           │
│                                        │
│  2. If found:                          │
│     • Fetch lead data                  │
│     • Generate fingerprint             │
│     • Compare with cached fingerprint  │
│                                        │
│  3. If match:                          │
│     • Return cached pitch ✅           │
│                                        │
│  4. If no match or not found:          │
│     • Continue to generate new         │
└─────────┬──────────────────────────────┘
          │
          │ Load configuration
          │
          ▼
┌────────────────────────────────────────┐
│   PitchConfigService                   │
│                                        │
│  • Get workspace.settings.pitchConfig  │
│  • Return PitchConfiguration           │
│    - Quick settings                    │
│    - Selected template                 │
│    - Advanced config                   │
└─────────┬──────────────────────────────┘
          │
          │ Build custom prompt
          │
          ▼
┌────────────────────────────────────────┐
│   PitchTemplateService                 │
│                                        │
│  buildPromptFromConfig():              │
│  1. Get selected template              │
│  2. If useCustomPrompt = true:         │
│     • Use customPromptTemplate         │
│  3. Else:                              │
│     • Use template from library        │
│                                        │
│  4. Process with Handlebars:           │
│     • Inject variables                 │
│     • Apply helpers                    │
│     • Apply quick settings             │
│                                        │
│  5. Return final prompt string         │
└─────────┬──────────────────────────────┘
          │
          │ Generate with LLM
          │ generatePitch(context, customPrompt, temperature)
          │
          ▼
┌────────────────────────────────────────┐
│   OllamaPitchService                   │
│                                        │
│  1. Build request:                     │
│     {                                  │
│       model: "llama2",                 │
│       prompt: customPrompt,            │
│       temperature: 0.7,                │
│       stream: false                    │
│     }                                  │
│                                        │
│  2. Call Ollama API:                   │
│     POST http://localhost:11434        │
│                                        │
│  3. Parse response:                    │
│     • Extract key points               │
│     • Extract call-to-action           │
│     • Format full pitch                │
│                                        │
│  4. Return SalesPitch object           │
└─────────┬──────────────────────────────┘
          │
          │ LLM inference (local)
          │
          ▼
┌────────────────────────────────────────┐
│   Ollama (Local LLM)                   │
│                                        │
│  • Load model (llama2/llama3/mistral)  │
│  • Process prompt with context         │
│  • Generate response                   │
│  • Return JSON/text                    │
│                                        │
│  Time: 2-5 seconds                     │
│  Cost: $0 (local inference)            │
└─────────┬──────────────────────────────┘
          │
          │ Response
          │
          ▼
┌────────────────────────────────────────┐
│   SalesPitchService                    │
│                                        │
│  5. Generate fingerprint:              │
│     • Hash lead data                   │
│                                        │
│  6. Save to database:                  │
│     {                                  │
│       leadId,                          │
│       workspaceId,                     │
│       keyPoints,                       │
│       callToAction,                    │
│       fullPitch,                       │
│       model: "llama2",                 │
│       generatedAt: now(),              │
│       dataFingerprint: hash,           │
│       configSnapshot: config           │
│     }                                  │
│                                        │
│  7. Return pitch to controller         │
└─────────┬──────────────────────────────┘
          │
          │ Return 200 OK
          │
          ▼
┌───────────────────┐
│   Frontend UI     │
│                   │
│  • Display pitch  │
│  • Show actions:  │
│    - Copy         │
│    - Export PDF   │
│    - Regenerate   │
└───────────────────┘
```

---

### 2. Batch Generation Flow

```
User Action: "Generate Pitches for Selected Leads"
        │
        ▼
┌───────────────────┐
│   Frontend UI     │
│  Select leads:    │
│  [✓] Lead 1       │
│  [✓] Lead 2       │
│  [✓] Lead 3       │
│  [Batch Generate] │
└─────────┬─────────┘
          │
          │ POST /api/v1/sales-pitch/batch-generate
          │ { leadIds: ["lead-1", "lead-2", "lead-3"] }
          │
          ▼
┌───────────────────────────────┐
│   SalesPitchController        │
│                               │
│  @Post('batch-generate')      │
│  async batchGenerate()        │
└─────────┬─────────────────────┘
          │
          │ addBatchGenerationJob(leadIds, workspaceId)
          │
          ▼
┌─────────────────────────────────────────┐
│   PitchQueueService                     │
│                                         │
│  1. Create job in BullMQ:               │
│     {                                   │
│       name: 'batch-generate',           │
│       data: {                           │
│         leadIds: [...],                 │
│         workspaceId: "ws-123"           │
│       },                                │
│       options: {                        │
│         attempts: 3,                    │
│         backoff: exponential            │
│       }                                 │
│     }                                   │
│                                         │
│  2. Add to Redis queue                  │
│  3. Return jobId to controller          │
└─────────┬───────────────────────────────┘
          │
          │ Return 202 Accepted
          │ { jobId: "job-abc", message: "Batch started" }
          │
          ▼
┌───────────────────┐
│   Frontend UI     │
│  "Generating..."  │
│  [Progress: 0%]   │
│                   │
│  Start polling:   │
│  GET /batch-      │
│      status/      │
│      job-abc      │
└─────────┬─────────┘
          │
          │ Poll every 2 seconds
          │
    ┌─────▼──────────────────────────┐
    │   Meanwhile in Background:     │
    └─────┬──────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│   BullMQ Queue (Redis)                  │
│                                         │
│  Jobs:                                  │
│  ┌─────────────────────────────────┐   │
│  │ job-abc (waiting)               │   │
│  │ Leads: ["lead-1", "lead-2", ... │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Worker picks up job...                 │
└─────────┬───────────────────────────────┘
          │
          │ Process job
          │
          ▼
┌─────────────────────────────────────────┐
│   PitchProcessor                        │
│                                         │
│  @Process('batch-generate')             │
│  async processBatchGeneration(job) {    │
│                                         │
│    const { leadIds, workspaceId } = job.data;│
│    const results = [];                  │
│                                         │
│    for (let i = 0; i < leadIds.length; i++) {│
│      try {                              │
│        // Generate pitch (uses cache)   │
│        const pitch = await service      │
│          .generateOrGetCachedPitch(     │
│            leadIds[i],                  │
│            workspaceId                  │
│          );                             │
│                                         │
│        results.push({                   │
│          leadId: leadIds[i],            │
│          success: true,                 │
│          pitch                          │
│        });                              │
│                                         │
│        // Update progress               │
│        await job.updateProgress({       │
│          completed: i + 1,              │
│          total: leadIds.length,         │
│          percentage: Math.round(        │
│            ((i + 1) / leadIds.length) * 100│
│          )                              │
│        });                              │
│                                         │
│        // Emit WebSocket event          │
│        socket.emit('batch-progress', {  │
│          jobId: job.id,                 │
│          completed: i + 1,              │
│          currentLead: pitch.leadName    │
│        });                              │
│                                         │
│      } catch (error) {                  │
│        results.push({                   │
│          leadId: leadIds[i],            │
│          success: false,                │
│          error: error.message           │
│        });                              │
│      }                                  │
│                                         │
│      // Concurrency control             │
│      // Only 3 jobs run simultaneously  │
│    }                                    │
│                                         │
│    return {                             │
│      results,                           │
│      completed: results.filter(r => r.success).length,│
│      failed: results.filter(r => !r.success).length│
│    };                                   │
│  }                                      │
└─────────┬───────────────────────────────┘
          │
          │ Job completed
          │
          ▼
┌─────────────────────────────────────────┐
│   BullMQ Queue (Redis)                  │
│                                         │
│  Jobs:                                  │
│  ┌─────────────────────────────────┐   │
│  │ job-abc (completed)             │   │
│  │ Progress: 100%                  │   │
│  │ Results: {                      │   │
│  │   completed: 3,                 │   │
│  │   failed: 0,                    │   │
│  │   results: [...]                │   │
│  │ }                               │   │
│  └─────────────────────────────────┘   │
└─────────┬───────────────────────────────┘
          │
          │ Frontend polls status
          │ GET /batch-status/job-abc
          │
          ▼
┌───────────────────┐
│   Frontend UI     │
│  "Complete!"      │
│  [Progress: 100%] │
│                   │
│  Results:         │
│  ✓ Lead 1 ✓       │
│  ✓ Lead 2 ✓       │
│  ✓ Lead 3 ✓       │
│                   │
│  [Export All PDF] │
└───────────────────┘
```

---

### 3. Custom Template Flow

```
User Action: "Create Custom Template"
        │
        ▼
┌───────────────────────────────┐
│   Frontend UI                 │
│   Settings → Templates Tab    │
│                               │
│  [+ Create Custom Template]   │
└─────────┬─────────────────────┘
          │
          │ Click
          │
          ▼
┌───────────────────────────────────────────────┐
│   TemplateEditorDialog (Modal)                │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │ Name: [My Enterprise Template]          │ │
│  │ Description: [For enterprise leads...]  │ │
│  │                                          │ │
│  │ Template:                                │ │
│  │ ┌────────────────────────────────────┐  │ │
│  │ │ Generate pitch for                 │  │ │
│  │ │ {{leadCompanyName}}                │  │ │
│  │ │                                    │  │ │
│  │ │ {{#ifEquals length "concise"}}     │  │ │
│  │ │   Brief version                    │  │ │
│  │ │ {{else}}                           │  │ │
│  │ │   Detailed version                 │  │ │
│  │ │ {{/ifEquals}}                      │  │ │
│  │ └────────────────────────────────────┘  │ │
│  │                                          │ │
│  │ [Show Variables] [Validate]             │ │
│  │                                          │ │
│  │ Quick Settings:                          │ │
│  │ Tone: [Professional ▼]                   │ │
│  │ Length: [● Concise ○ Medium ○ Detailed] │ │
│  │ Focus: [✓ ROI] [✓ Technical]            │ │
│  │                                          │ │
│  │ [Cancel] [Create Template]               │ │
│  └─────────────────────────────────────────┘ │
└─────────┬─────────────────────────────────────┘
          │
          │ Click "Validate"
          │
          ▼
┌───────────────────────────────────────────────┐
│   Frontend                                    │
│   validateMutation.mutateAsync(template)     │
└─────────┬─────────────────────────────────────┘
          │
          │ POST /api/v1/pitch-config/validate-template
          │ { template: "Generate pitch for {{leadCompanyName}}..." }
          │
          ▼
┌───────────────────────────────────────────────┐
│   PitchConfigController                       │
│                                               │
│  @Post('validate-template')                   │
│  async validateTemplate(@Body() dto)          │
└─────────┬─────────────────────────────────────┘
          │
          │ validateTemplate(templateString)
          │
          ▼
┌───────────────────────────────────────────────┐
│   PitchTemplateService                        │
│                                               │
│  validateTemplate(templateString) {           │
│    try {                                      │
│      // Compile with Handlebars               │
│      this.handlebars.compile(templateString); │
│                                               │
│      return { valid: true };                  │
│                                               │
│    } catch (error) {                          │
│      return {                                 │
│        valid: false,                          │
│        error: error.message                   │
│      };                                       │
│    }                                          │
│  }                                            │
└─────────┬─────────────────────────────────────┘
          │
          │ Return validation result
          │
          ▼
┌───────────────────────────────┐
│   Frontend UI                 │
│   ✓ "Template is valid!"      │
│   (Green checkmark)           │
└─────────┬─────────────────────┘
          │
          │ Click "Create Template"
          │
          ▼
┌───────────────────────────────────────────────┐
│   Frontend                                    │
│   createMutation.mutateAsync(templateData)    │
└─────────┬─────────────────────────────────────┘
          │
          │ POST /api/v1/pitch-config/templates
          │ {
          │   name: "My Enterprise Template",
          │   description: "For enterprise leads",
          │   category: "custom",
          │   promptTemplate: "...",
          │   quickSettings: {...},
          │   isDefault: false
          │ }
          │
          ▼
┌───────────────────────────────────────────────┐
│   PitchConfigController                       │
│                                               │
│  @Post('templates')                           │
│  async createTemplate(@Body() dto)            │
└─────────┬─────────────────────────────────────┘
          │
          │ createCustomTemplate(workspaceId, template)
          │
          ▼
┌───────────────────────────────────────────────┐
│   PitchConfigService                          │
│                                               │
│  1. Get current workspace config              │
│  2. Generate new template ID (UUID)           │
│  3. Add timestamps (createdAt, updatedAt)     │
│  4. Add to customTemplates array              │
│  5. Update workspace.settings.pitchConfig     │
│  6. Save to database (JSONB)                  │
│  7. Return updated configuration              │
└─────────┬─────────────────────────────────────┘
          │
          │ Return 201 Created
          │ { ...updatedConfig }
          │
          ▼
┌───────────────────────────────┐
│   Frontend UI                 │
│   • Close modal               │
│   • Refresh templates list    │
│   • Show success toast        │
│   • New template appears      │
│     in "Custom Templates"     │
└───────────────────────────────┘
```

---

## Component Interaction Matrix

```
┌──────────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│ Component            │ Ollama   │ Template │ Config   │ Queue    │ Database │
├──────────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ SalesPitchService    │    ✓     │    ✓     │    ✓     │    ✓     │    ✓     │
│ OllamaPitchService   │    ✓     │          │          │          │          │
│ PitchTemplateService │          │    ✓     │    ✓     │          │          │
│ PitchConfigService   │          │          │    ✓     │          │    ✓     │
│ PitchQueueService    │          │          │          │    ✓     │          │
│ PitchProcessor       │          │          │          │    ✓     │    ✓     │
└──────────────────────┴──────────┴──────────┴──────────┴──────────┴──────────┘

Legend:
  ✓ = Direct interaction/dependency
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRODUCTION                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                   Load Balancer (Nginx)                  │  │
│  │                   Port 80/443 (HTTPS)                    │  │
│  └────────────────────┬────────────────────────────────────┘  │
│                       │                                        │
│          ┌────────────┴────────────┐                          │
│          │                         │                          │
│  ┌───────▼────────┐       ┌───────▼────────┐                 │
│  │  Frontend      │       │  Frontend      │                 │
│  │  Instance 1    │       │  Instance 2    │                 │
│  │  (Next.js)     │       │  (Next.js)     │                 │
│  │  Port 3001     │       │  Port 3001     │                 │
│  └────────┬───────┘       └────────┬───────┘                 │
│           │                        │                          │
│           └────────────┬───────────┘                          │
│                        │                                      │
│                        │ API Calls                            │
│                        │                                      │
│  ┌─────────────────────▼─────────────────────────────────┐  │
│  │                API Load Balancer                       │  │
│  └────────────────────┬───────────────────────────────────┘  │
│                       │                                       │
│          ┌────────────┴────────────┐                         │
│          │                         │                         │
│  ┌───────▼────────┐       ┌───────▼────────┐                │
│  │  Backend       │       │  Backend       │                │
│  │  Instance 1    │       │  Instance 2    │                │
│  │  (NestJS)      │       │  (NestJS)      │                │
│  │  Port 3000     │       │  Port 3000     │                │
│  └────────┬───────┘       └────────┬───────┘                │
│           │                        │                         │
│           └────────────┬───────────┘                         │
│                        │                                     │
│        ┌───────────────┼───────────────┐                    │
│        │               │               │                    │
│  ┌─────▼──────┐  ┌────▼────┐  ┌───────▼────────┐          │
│  │ PostgreSQL │  │  Redis  │  │     Ollama     │          │
│  │  Cluster   │  │ Cluster │  │  (GPU Server)  │          │
│  │  (Primary) │  │         │  │                │          │
│  │  (Replica) │  │  Queue  │  │  llama2/llama3 │          │
│  │            │  │  Cache  │  │                │          │
│  │ Port 5432  │  │ Port    │  │  Port 11434    │          │
│  │            │  │ 6379    │  │                │          │
│  └────────────┘  └─────────┘  └────────────────┘          │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │              Monitoring & Logging                     │ │
│  │  • Prometheus (metrics)                              │ │
│  │  • Grafana (dashboards)                              │ │
│  │  • ELK Stack (logs)                                  │ │
│  │  • BullMQ Board (queue monitoring)                   │ │
│  └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Technology Stack Summary

### Backend
- **Framework**: NestJS (Node.js)
- **Language**: TypeScript
- **ORM**: Prisma
- **Queue**: BullMQ (Redis)
- **Template Engine**: Handlebars
- **PDF Generation**: jsPDF
- **LLM**: Ollama (Local)

### Frontend
- **Framework**: Next.js 14
- **Language**: TypeScript
- **State Management**: TanStack Query (React Query)
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Toast Notifications**: Sonner

### Infrastructure
- **Database**: PostgreSQL 14+
- **Cache/Queue**: Redis 7+
- **LLM Runtime**: Ollama
- **Web Server**: Nginx (Production)
- **Process Manager**: PM2 (Production)

### DevOps
- **Version Control**: Git
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana
- **Logging**: Winston + ELK Stack
- **Containerization**: Docker (Optional)

---

**Last Updated:** December 4, 2025
**Architecture Version:** 1.0.0
**System:** FlowTrack Sales Intelligence
