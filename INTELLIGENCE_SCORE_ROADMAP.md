# Intelligence Score UI Roadmap

**Current Status**: Phase 5 Complete (PR #135)  
**Last Updated**: July 4, 2026

---

## ✅ Phase 5: Core Component (Shipped)

### What's Live
- Reusable `IntelligenceScore` component
- Full card view with per-source breakdown
- Compact inline badge variant
- Color-coded scoring (emerald → blue → amber → orange)
- Integrated in Test Case Lab and Script Gen

### User Impact
**Before**: "AI-generated" with no proof  
**After**: "94% grounded in repository intelligence, 6% AI-assisted"

**Sales Impact**: Clients immediately understand this isn't another AI wrapper.

---

## 🎯 Phase 5.1: Enhanced Messaging (High ROI)

### 1. Better Wording Framework

**Current:**
```
Intelligence Score

🧠 94% grounded    ✨ 6% AI Assisted

Source Breakdown:
Repository Match    95%
App Profile         92%
```

**Enhanced:**
```
Intelligence Score

Grounded by:
✓ Repository Match       95%
✓ App Profile            92%
✓ Existing Patterns      98%

AI Assisted:
  6%
```

**Why**: "Grounded by" is clearer for executives. Makes the sources feel like features, not metrics.

**Effort**: 2-3 hours  
**Value**: High (demo clarity)  
**Priority**: Medium

---

## 🔥 Phase 5.2: Clickable Source Details (Very High ROI)

### Vision

Make each source **expandable** to show which specific artifacts grounded the generation.

**Current:**
```
Repository Match    95%
```

**Enhanced (Expandable):**
```
Repository Match    95%  ▼

  Used:
  ✓ LoginPage.ts (page object)
  ✓ AuthHelper.ts (helper method)
  ✓ credentials.json (test data)
  ✓ Login.spec.ts (pattern reference)
```

**Demo Power**: During demos, click to expand and show **exactly** which files were used. Clients immediately understand why the score is 95%.

**Implementation:**
- Add `details?: string[]` to `IntelligenceScore.bySource` (backend extension)
- Add expand/collapse state to component
- Render file/method list when expanded

**Effort**: 1 day (backend) + 4 hours (UI)  
**Value**: Very High (demo wow factor)  
**Priority**: High  
**Blocker**: Requires backend to return artifact details

---

## 📊 Phase 5.3: Badge System (Future Enhancement)

### Vision

Intelligence Score influences **visual badges** that provide instant quality assessment.

**Examples:**

```
98% grounded
★★★★★ Enterprise Ready
```

```
84% grounded
★★★★☆ Repository Grounded
```

```
62% grounded
⚠ AI Heavy
```

**Badge Tiers:**
- 95%+: ★★★★★ "Enterprise Ready"
- 85-94%: ★★★★☆ "Repository Grounded"
- 70-84%: ★★★☆☆ "Good Coverage"
- 50-69%: ★★☆☆☆ "AI Heavy"
- <50%: ⚠ "Needs Grounding"

**Where to Show:**
- Intelligence Score card
- Generation history tables
- Dashboard metrics
- Export reports

**Effort**: 4-6 hours  
**Value**: Medium-High (visual clarity)  
**Priority**: Medium  
**Dependency**: Phase 5 complete

---

## 🩹 Phase 5.4: Healing Integration

### Current Status
**Deferred** from Phase 5 to keep PR focused.

### What's Needed

**Backend:**
1. Extend `HealingContextResult` interface in `src/services/healing-intelligence-context.ts`:
   ```typescript
   export interface HealingContextResult {
     // ... existing fields
     intelligenceScore?: IntelligenceScore;  // ← Add this
   }
   ```

2. Update `HealingIntelligenceContext.load()` to extract and return score:
   ```typescript
   return {
     // ... existing fields
     intelligenceScore: intel.metadata?.intelligenceScore,
   };
   ```

3. Pass through healing worker result chain to API response

**Frontend:**
4. Add `intelligenceScore` to healing result types
5. Render `<IntelligenceScore />` in healing results view

**Example Output:**
```
Healing Intelligence

Repository Match     96%
Method Index        100%
DOM Match            92%
AI Assisted           0%

Overall Score        98%
```

**Why Powerful**: Shows clients that healing is nearly 100% grounded in real code, not AI guessing.

**Effort**: 1 day (backend) + 2 hours (UI)  
**Value**: High (healing transparency)  
**Priority**: High  
**Dependency**: Phase 3 (PR #222) merged

---

## 🎨 Phase 5.5: Design Refinements (Long-term)

### Things to AVOID
Per user feedback, do NOT add:
- ❌ Radar charts
- ❌ Pie charts
- ❌ Spider graphs
- ❌ Heatmaps

**Keep it simple.** Current design is perfect.

### Things to CONSIDER
- Micro-animations on score reveal (subtle)
- Accessibility improvements (ARIA labels, keyboard navigation)
- Dark/light theme variants
- Export intelligence score to PDF reports
- Historical trend view (score over time)

**Effort**: TBD  
**Value**: Low-Medium  
**Priority**: Low

---

## 📈 Metrics & Success Criteria

### How to Measure Success

**Sales Metrics:**
- Demo conversion rate (before/after Intelligence Score feature)
- Client questions about "AI vs. grounded" (should decrease)
- Feature mentions in win/loss interviews

**Product Metrics:**
- Average intelligence score across all generations
- % of generations with >90% grounding
- Feature usage (how often clients view/expand scores)

**Engagement Metrics:**
- Time spent on Intelligence Score panel
- Click-through rate on expandable sources (Phase 5.2)
- Badge visibility in dashboards (Phase 5.3)

---

## 🚀 Recommended Sequencing

Based on user feedback and ROI:

### Immediate (Next 2 Weeks)
1. **Phase 5.2: Clickable Source Details** — Very High ROI for demos
2. **Phase 5.4: Healing Integration** — Complete the orchestrator story

### Short-term (1-2 Months)
3. **Phase 5.3: Badge System** — Visual clarity
4. **Phase 5.1: Enhanced Messaging** — "Grounded by" wording

### Long-term (3+ Months)
5. **Phase 5.5: Design Refinements** — Polish

---

## 💡 Strategic Context

Per user feedback:

> "From this point onward, I would shift about **70% of your effort toward customers** and **30% toward engineering**."
>
> "You're no longer building isolated features — you've built a coherent QA intelligence platform. Now it's time to validate it in the market and let customer feedback drive the next wave of capabilities."

**Implication**: Intelligence Score enhancements should be driven by **customer demos** and **real-world usage**, not theoretical improvements.

**Process:**
1. Ship Phase 5 (complete ✅)
2. Run customer demos
3. Collect feedback on Intelligence Score
4. Prioritize roadmap based on what resonates
5. Iterate

---

## 🎯 Success Indicators

You'll know this feature is succeeding when:

✅ **Sales**: CTOs say "this proves it's not just another AI wrapper"  
✅ **Product**: Average intelligence score stays >85% (high grounding)  
✅ **Engineering**: No customer confusion about what the score means  
✅ **Competitive**: Competitors start copying the transparency metric

---

## 📝 Open Questions

**For Customer Discovery:**
1. Do clients understand the per-source breakdown?
2. Do they want to see **which files** were used? (validates Phase 5.2)
3. Do they care more about the **overall score** or **individual sources**?
4. Would badges (★★★★★) add clarity or confusion?
5. How important is historical trend data (score over time)?

**For Engineering:**
1. Can backend efficiently return artifact details for clickable sources?
2. Should we cache intelligence scores for performance?
3. How do we handle edge cases (score = 0%, score = 100%)?

---

## 📦 Deliverables Summary

| Phase | Status | Effort | Value | Priority |
|-------|--------|--------|-------|----------|
| 5.0 Core Component | ✅ Shipped | 1 day | Very High | — |
| 5.1 Enhanced Messaging | 📋 Planned | 2-3 hrs | High | Medium |
| 5.2 Clickable Details | 📋 Planned | 1.5 days | Very High | **High** |
| 5.3 Badge System | 📋 Planned | 4-6 hrs | Medium-High | Medium |
| 5.4 Healing Integration | 📋 Planned | 1 day | High | **High** |
| 5.5 Design Polish | 💭 Future | TBD | Low-Med | Low |

---

## 🎬 Next Actions

**Immediate:**
1. ✅ Merge PR #135 (Phase 5.0)
2. ✅ Deploy to production
3. Run customer demos with Intelligence Score feature
4. Collect feedback

**This Week:**
5. Start Phase 5.2 (Clickable Source Details) if customer feedback is positive
6. Start Phase 5.4 (Healing Integration) after PR #222 merges

**This Month:**
7. Implement top 2 customer-requested enhancements
8. Document Intelligence Score in customer-facing documentation
9. Create demo video showing Intelligence Score in action

---

**This roadmap is a living document — update it based on customer feedback and market validation.**
