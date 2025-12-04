# Testing Company Enrichment Feature

## Quick Start

### 1. Start the Backend
```bash
cd backend
npm run start:dev
```

### 2. Start the Frontend
```bash
cd frontend
npm run dev
```

### 3. Navigate to Enrichment Step
```
http://localhost:3000/onboarding/company-enrichment
```

---

## Testing Scenarios

### Scenario 1: Test with Website URL
**Input**: `https://stripe.com`

**Expected Output**:
```
Summary: "A B2B fintech company that provides payment processing infrastructure"
Industry: Finance
Business Model: B2B
Company Size: Enterprise
Website: stripe.com
Logo: https://logo.clearbit.com/stripe.com
Confidence: 0.85+
```

---

### Scenario 2: Test with Company Name (Auto-inference)
**Input**: `Shopify`

**Expected Output**:
```
Summary: "A B2B2C e-commerce company that provides online store platform"
Industry: E-commerce
Business Model: B2B2C
Company Size: Enterprise
Website: shopify.com (auto-inferred)
Logo: https://logo.clearbit.com/shopify.com
Confidence: 0.80+
```

---

### Scenario 3: Test with Unknown Company (Should fail gracefully)
**Input**: `XYZ Nonexistent Company 123456`

**Expected Output**:
```
Error: "Could not find a valid website for this company"
Code: DOMAIN_NOT_FOUND
Actions: Try Again | Skip
```

---

### Scenario 4: Test with Inaccessible Website
**Input**: `http://thissitedoesnotexist12345.com`

**Expected Output**:
```
Error: "Failed to scrape website content"
Code: WEBSITE_INACCESSIBLE
Actions: Try Again | Skip
```

---

### Scenario 5: Test Animation Persistence
**Steps**:
1. Enter valid company → See typing animation
2. Navigate away (press browser back)
3. Navigate back to enrichment page
4. **Expected**: Data displays instantly (no animation replay)

**localStorage Check**:
```javascript
localStorage.getItem('flowtrack-enrichment-{workflowId}')
// Should return: { hasCompletedAnimation: true, timestamp: "..." }
```

---

## API Testing (Manual)

### Test Scrape Endpoint
```bash
curl -X POST http://localhost:3001/api/v1/onboarding/scrape-company \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Stripe",
    "workflowId": "test-workflow-id"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "summary": "A B2B fintech company that...",
    "industry": "Finance",
    "businessModel": "B2B",
    "companySize": "Enterprise",
    "website": "stripe.com",
    "companyName": "Stripe",
    "logo": "https://logo.clearbit.com/stripe.com",
    "confidence": 0.85,
    "scrapedAt": "2025-12-04T...",
    "source": "inferred"
  }
}
```

---

### Test Status Endpoint
```bash
curl http://localhost:3001/api/v1/onboarding/enrichment-status/test-workflow-id
```

**Expected Response** (if enrichment exists):
```json
{
  "exists": true,
  "data": { /* enriched data */ }
}
```

**Expected Response** (if no enrichment):
```json
{
  "exists": false
}
```

---

### Test Health Endpoint
```bash
curl http://localhost:3001/api/v1/onboarding/scraper-health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-12-04T..."
}
```

---

## Debugging

### Backend Logs
Watch for these log entries:
```
[OnboardingScraperService] Starting scrape for workflow: xxx
[OnboardingScraperService] Resolved domain: example.com
[BusinessIntelligenceService] Business model scores - B2B: 75, B2C: 25
[BusinessIntelligenceService] Industry detection: Technology (confidence: 0.8)
[OnboardingScraperService] Successfully enriched company data for workflow: xxx
```

### Frontend DevTools
1. **Network Tab**: Check API calls to `/api/v1/onboarding/scrape-company`
2. **Console**: Look for errors during scraping
3. **localStorage**: Verify animation state persistence
4. **React DevTools**: Check `useOnboardingStore` state updates

---

## Performance Benchmarks

### Backend Scraping Time
```
Target: <3 seconds
Measure: Time from API request to response

Test cases:
- Stripe.com: ~1.5s ✓
- Shopify.com: ~2.1s ✓
- Small company: ~2.8s ✓
```

### Frontend Animation Performance
```
Target: 60fps
Measure: Chrome DevTools Performance tab

Key metrics:
- Page load: <1s
- Typing animation: 60fps
- Card fade-in: 60fps
- No layout shifts
```

---

## Edge Cases to Test

1. **Very long company names**: "The International Business Machines Corporation"
2. **Special characters**: "O'Reilly Media", "AT&T"
3. **Multiple TLDs**: "example.co.uk" vs "example.com"
4. **Redirects**: "www.example.com" → "example.com"
5. **HTTPS → HTTP fallback**: Sites without SSL
6. **Timeout**: Sites that take >10s to respond
7. **Parking pages**: Domains for sale
8. **No metadata**: Minimal HTML sites

---

## Success Criteria

✅ All API endpoints return 200 for valid input
✅ Scraping completes in <3 seconds
✅ Typing animation is smooth (60fps)
✅ Animation skips on revisit (localStorage works)
✅ Error states display correctly
✅ Data persists in database (OnboardingSession)
✅ No TypeScript errors
✅ No console errors or warnings

---

## Troubleshooting

### Issue: "Cannot find module 'onboarding-scraper'"
**Solution**: Restart backend (`npm run start:dev`)

### Issue: Animation doesn't skip on revisit
**Solution**: Check localStorage key format matches workflowId

### Issue: Scraping timeout
**Solution**: Check network, increase timeout in `DEFAULT_SCRAPING_CONFIG`

### Issue: Low confidence scores
**Solution**: Review business intelligence classifier logic, may need tuning

### Issue: Logo not loading
**Solution**: Clearbit API may be rate-limited, fallback to initials

---

## Next Steps After Testing

1. ✅ Verify all test scenarios pass
2. ✅ Check performance benchmarks
3. ⚠️ Add authentication guard to API
4. ⚠️ Write unit tests for classifiers
5. ⚠️ Add monitoring/analytics
6. ⚠️ Gather user feedback
7. ⚠️ Optimize based on real usage data

---

## Test Data Examples

### B2B SaaS Companies
- Stripe
- Salesforce
- HubSpot
- Slack
- Zoom

### B2C E-commerce
- Amazon
- Target
- Walmart
- Nike
- Apple

### B2B2C Platforms
- Shopify
- Square
- Airbnb
- Uber

### Startups (with websites)
- Linear
- Raycast
- Supabase
- Vercel

### Construction/Specific Industries
- Procore (Construction Management)
- Autodesk (Construction Software)
- PlanGrid (Construction)
