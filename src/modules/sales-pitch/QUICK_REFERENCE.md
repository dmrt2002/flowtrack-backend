# Sales Intelligence - Quick Reference Guide

## 🚀 Quick Start

### For Users

1. **Generate Single Pitch**
   ```
   Leads → Select Lead → Click "Generate Pitch"
   ```

2. **Batch Generate**
   ```
   Leads → Select Multiple → Bulk Actions → "Generate Pitches"
   ```

3. **Customize Settings**
   ```
   Settings → Sales Pitch → Quick Settings → Save
   ```

4. **Export PDF**
   ```
   Lead Details → Pitch Tab → "Export as PDF"
   ```

### For Developers

1. **Setup Ollama**
   ```bash
   brew install ollama
   ollama pull llama2
   ollama serve
   ```

2. **Configure Environment**
   ```bash
   OLLAMA_URL=http://localhost:11434
   OLLAMA_MODEL=llama2
   ```

3. **Run Backend**
   ```bash
   cd backend
   npm install
   npm run start:dev
   ```

---

## 📡 API Endpoints

### Sales Pitch

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/sales-pitch/generate` | Generate single pitch |
| GET | `/api/v1/sales-pitch/:pitchId` | Get pitch by ID |
| POST | `/api/v1/sales-pitch/regenerate/:leadId` | Force regenerate |
| GET | `/api/v1/sales-pitch` | List all pitches |
| POST | `/api/v1/sales-pitch/batch-generate` | Start batch job |
| GET | `/api/v1/sales-pitch/batch-status/:jobId` | Check batch status |
| POST | `/api/v1/sales-pitch/export-pdf/:pitchId` | Export single PDF |
| POST | `/api/v1/sales-pitch/export-batch-pdf` | Export batch ZIP |

### Pitch Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/pitch-config` | Get configuration |
| GET | `/api/v1/pitch-config/templates` | List templates |
| PATCH | `/api/v1/pitch-config/quick-settings` | Update quick settings |
| POST | `/api/v1/pitch-config/select-template` | Select template |
| POST | `/api/v1/pitch-config/templates` | Create custom template |
| PATCH | `/api/v1/pitch-config/templates/:id` | Update template |
| DELETE | `/api/v1/pitch-config/templates/:id` | Delete template |
| PATCH | `/api/v1/pitch-config/advanced` | Update advanced config |
| POST | `/api/v1/pitch-config/validate-template` | Validate template |
| POST | `/api/v1/pitch-config/reset` | Reset to default |

---

## 🎯 Configuration Options

### Pitch Tones
- `professional` - Business-focused, formal language
- `casual` - Relaxed, conversational style
- `friendly` - Warm, approachable tone
- `formal` - Executive-level, corporate language
- `consultative` - Advisory, problem-solving approach

### Pitch Lengths
- `concise` - 3-5 bullet points (quick elevator pitch)
- `medium` - 5-7 bullet points (balanced)
- `detailed` - 7-10 bullet points (comprehensive)

### Focus Areas (Multi-select)
- `technical` - Tech stack compatibility, integrations
- `roi` - Cost savings, business value, metrics
- `relationship` - Rapport building, common ground
- `competitive` - Differentiators, unique advantages
- `problem_solving` - Pain points, solution fit

---

## 📝 Template Variables

### User Company
```handlebars
{{userCompanyName}}        # "FlowTrack"
{{userCompanyIndustry}}    # "B2B SaaS"
{{userCompanyDescription}} # "Sales automation platform"
```

### Lead Company
```handlebars
{{leadCompanyName}}     # "TechCorp Inc"
{{leadIndustry}}        # "Software Development"
{{leadTechStack}}       # ["React", "Node.js", "AWS"]
{{leadEmployeeCount}}   # "50-200"
{{leadFoundedYear}}     # 2018
{{leadDescription}}     # "B2B SaaS platform..."
{{leadWebsite}}         # "techcorp.com"
```

### Configuration
```handlebars
{{tone}}        # "professional"
{{length}}      # "medium"
{{focusAreas}}  # ["roi", "technical"]
```

---

## 🔧 Template Helpers

### join - Join array with separator
```handlebars
{{join leadTechStack ", "}}
# Output: "React, Node.js, AWS"

{{join leadTechStack " and "}}
# Output: "React and Node.js and AWS"
```

### ifEquals - Conditional equality
```handlebars
{{#ifEquals tone "professional"}}
  Professional content here
{{else}}
  Other tone content
{{/ifEquals}}

{{#ifEquals length "concise"}}
  Brief version
{{else}}
  Detailed version
{{/ifEquals}}
```

### upper - Convert to uppercase
```handlebars
{{upper userCompanyName}}
# Output: "FLOWTRACK"
```

### lower - Convert to lowercase
```handlebars
{{lower leadIndustry}}
# Output: "software development"
```

---

## 💡 Template Examples

### Basic Template
```handlebars
Generate a {{tone}} pitch for {{userCompanyName}} to {{leadCompanyName}}.

Lead context:
- Industry: {{leadIndustry}}
- Size: {{leadEmployeeCount}}
- Tech: {{join leadTechStack ", "}}

Create {{length}} pitch focusing on {{join focusAreas " and "}}.
```

### Advanced Template
```handlebars
{{#ifEquals length "concise"}}
Hi {{leadCompanyName}},

Quick intro: {{userCompanyName}} helps {{leadIndustry}} companies like yours.

Value props:
• Point 1
• Point 2
• Point 3

Ready to chat?
{{else}}
Dear {{leadCompanyName}} team,

I noticed you're using {{join leadTechStack " and "}} in your {{leadIndustry}} platform.

{{upper "Key Benefits:"}}

{{#ifEquals focusAreas "roi"}}
• 35% cost reduction in first quarter
• 2.5x faster delivery time
• $250K average annual savings
{{/ifEquals}}

{{#ifEquals focusAreas "technical"}}
• Native SDKs for {{join leadTechStack ", "}}
• RESTful APIs with full documentation
• Real-time webhooks for events
• SOC 2 Type II certified
{{/ifEquals}}

Would you be open to a 15-minute call to explore how we can help?

Best regards,
{{userCompanyName}} Team
{{/ifEquals}}
```

---

## 📊 Built-in Templates

| ID | Name | Best For |
|----|------|----------|
| `default-balanced` | Balanced (Default) | General-purpose, all industries |
| `default-technical` | Technical Deep Dive | Engineering-focused, tech companies |
| `default-roi` | ROI & Business Value | Executives, decision-makers |
| `default-relationship` | Relationship Builder | Networking, warm outreach |
| `default-competitive` | Competitive Positioning | Against competitors |
| `default-concise` | Concise Elevator Pitch | Busy prospects, quick intro |

---

## 🔄 Caching Logic

### When Cache is Used
✅ Pitch exists within 30 days
✅ Lead data unchanged (fingerprint match)
✅ Configuration unchanged

### When Cache is Bypassed
❌ Pitch older than 30 days
❌ Lead data changed
❌ Manual regenerate requested
❌ Configuration changed significantly

### Force Regenerate
```bash
POST /api/v1/sales-pitch/regenerate/:leadId
```

---

## ⚡ Batch Processing

### Start Batch Job
```bash
curl -X POST http://localhost:3000/api/v1/sales-pitch/batch-generate \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"leadIds": ["lead-1", "lead-2", "lead-3"]}'

# Response:
{
  "jobId": "job-123",
  "message": "Batch generation started"
}
```

### Check Status
```bash
curl http://localhost:3000/api/v1/sales-pitch/batch-status/job-123 \
  -H "Authorization: Bearer TOKEN"

# Response:
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

### Job States
- `waiting` - Queued, not started
- `active` - Currently processing
- `completed` - Successfully finished
- `failed` - Error occurred

---

## 📄 PDF Export

### Single Export
```bash
curl -X POST http://localhost:3000/api/v1/sales-pitch/export-pdf/pitch-123 \
  -H "Authorization: Bearer TOKEN" \
  --output pitch.pdf
```

### Batch Export (ZIP)
```bash
curl -X POST http://localhost:3000/api/v1/sales-pitch/export-batch-pdf \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pitchIds": ["pitch-1", "pitch-2", "pitch-3"]}' \
  --output pitches.zip
```

---

## 🛠️ Troubleshooting

### Issue: "Ollama service unavailable"
```bash
# Check if running
curl http://localhost:11434/api/health

# Start Ollama
ollama serve

# Check logs
tail -f ~/.ollama/logs/server.log
```

### Issue: "Model not found"
```bash
# List models
ollama list

# Pull model
ollama pull llama2
```

### Issue: "Queue not processing"
```bash
# Check Redis
redis-cli ping

# Check queue
redis-cli KEYS "bull:pitch-generation:*"

# Clear stuck jobs
redis-cli DEL "bull:pitch-generation:active"
```

### Issue: "Template validation error"
- ✅ Use double braces: `{{variable}}`
- ✅ Close all blocks: `{{#ifEquals}}...{{/ifEquals}}`
- ✅ Proper helper syntax: `{{join array ", "}}`
- ❌ Don't use single braces: `{variable}`
- ❌ Don't forget closing tags

---

## 📈 Performance Tips

### Optimize Generation Speed
1. Use `llama2` (faster) instead of `llama3` (more accurate)
2. Lower `maxTokens` for shorter pitches
3. Use caching effectively (avoid unnecessary regeneration)
4. Batch process during off-peak hours

### Reduce Costs (Already Zero!)
✅ Local LLM = No API costs
✅ Intelligent caching = Fewer generations
✅ JSONB storage = No schema migrations
✅ Automatic cleanup = Storage optimization

### Scale Considerations
- Increase BullMQ concurrency for faster batch processing
- Add more CPU/RAM for Ollama performance
- Consider GPU for 5-10x faster inference
- Use connection pooling for database

---

## 🔐 Security Best Practices

### API Keys
- Always use JWT authentication
- Rotate tokens regularly
- Use environment variables for secrets

### Template Validation
- Validate all user-provided templates
- Sanitize template inputs
- Prevent code injection via templates

### Data Privacy
- Pitches contain sensitive lead data
- Enforce workspace-level access control
- Automatic cleanup after 30 days
- GDPR compliance built-in

---

## 📚 Resources

### Documentation
- Full Documentation: `SALES_INTELLIGENCE_DOCUMENTATION.md`
- Quick Reference: `QUICK_REFERENCE.md` (this file)

### External Links
- Ollama: https://ollama.ai
- Handlebars: https://handlebarsjs.com
- BullMQ: https://docs.bullmq.io
- NestJS: https://nestjs.com

### Internal
- API Docs: http://localhost:3000/api-docs
- BullMQ Dashboard: http://localhost:3000/queues

---

## 🎓 Common Tasks

### Task: Change Default Tone
```typescript
// In pitch-config.types.ts
export const DEFAULT_PITCH_CONFIG: PitchConfiguration = {
  quickSettings: {
    tone: PitchTone.CASUAL, // Changed from PROFESSIONAL
    // ...
  },
  // ...
};
```

### Task: Add Custom Variable
```typescript
// In pitch-template.service.ts
const variables: PromptVariables = {
  // ... existing variables
  customField: context.leadCompany.customField,
};

// Use in template
{{customField}}
```

### Task: Adjust Batch Concurrency
```typescript
// In pitch.processor.ts
@Processor('pitch-generation', {
  concurrency: 5, // Changed from 3
})
```

### Task: Change Cache Duration
```typescript
// In sales-pitch.service.ts
const thirtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // Changed to 60 days
```

### Task: Add New Template
```typescript
// In pitch-config.types.ts
export const BUILT_IN_TEMPLATES: PitchTemplate[] = [
  // ... existing templates
  {
    id: 'default-my-new-template',
    name: 'My New Template',
    description: 'Description here',
    category: 'default',
    isDefault: false,
    promptTemplate: `Your template here...`,
    quickSettings: {
      tone: PitchTone.PROFESSIONAL,
      length: PitchLength.MEDIUM,
      focusAreas: [PitchFocus.PROBLEM_SOLVING],
    },
  },
];
```

---

## ✅ Checklist for New Users

**Setup**
- [ ] Ollama installed and running
- [ ] Model pulled (llama2/llama3/mistral)
- [ ] Backend environment variables configured
- [ ] Backend running on port 3000
- [ ] Frontend running on port 3001
- [ ] Redis running on port 6379
- [ ] PostgreSQL running on port 5432

**Configuration**
- [ ] Workspace created
- [ ] User authenticated
- [ ] Settings → Sales Pitch configured
- [ ] Quick settings customized
- [ ] Test pitch generated successfully

**Testing**
- [ ] Single pitch generation works
- [ ] Batch generation works
- [ ] PDF export works
- [ ] Cache validation works
- [ ] Custom template created and tested

---

## 📞 Support

**Issues?**
- Check logs: `backend/logs/app.log`
- Check Ollama: `curl http://localhost:11434/api/health`
- Check Redis: `redis-cli ping`
- Check database: `psql -U postgres -d flowtrack`

**Still stuck?**
- Email: support@flowtrack.com
- Slack: #sales-intelligence
- Docs: https://docs.flowtrack.com

---

**Version:** 1.0.0
**Last Updated:** December 4, 2025
**Quick Reference for:** FlowTrack Sales Intelligence Feature
