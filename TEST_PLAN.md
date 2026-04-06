# Manual Test Plan

Base URL: http://localhost:5174  
Prerequisites: `npm run dev` running, DB connected, at least one company added with status `done`.

---

## 1. Export to PDF

**Steps:**
1. Select a company with status `done`
2. Click the `EXPORT PDF` button in the profile header

**Expected:**
- Browser print dialog opens
- Sidebar and header are hidden in the preview
- Only the company profile (name, tags, news, problems) is visible
- Clean black-on-white layout

---

## 2. Research Age Warning

**Steps:**
1. Find or create a company that was last researched more than 30 days ago
   - To simulate: manually update `last_researched_at` in Neon console to a date 31+ days ago
2. Select that company

**Expected:**
- A badge appears next to the status: `⚠ Research is X days old` in amber
- Badge does not appear for companies researched within 30 days

---

## 3. Search / Filter Companies in Sidebar

**Steps:**
1. Add 3+ companies with different names and domains
2. Type part of a company name in the search box (e.g. `str` for Stripe)
3. Type part of a domain (e.g. `ver` for vercel.com)
4. Clear the search box

**Expected:**
- List filters in real-time as you type
- Matches on both name and domain
- Clearing the input restores the full list
- Count updates to reflect filtered results

---

## 4. Sort Companies

**Steps:**
1. Add 3+ companies at different times
2. Use the sort dropdown and try each option:
   - `Newest` — most recently added first
   - `Oldest` — oldest first
   - `A-Z` — alphabetical by name
   - `Z-A` — reverse alphabetical
   - `Researched` — most recently researched first

**Expected:**
- List reorders immediately on selection
- `Researched` puts companies with no research at the bottom

---

## 5. Company Tags

**Steps:**
1. Select any company
2. Click the `+ tag` input in the profile header
3. Type `fintech` and press Enter
4. Type `b2b` and press Enter
5. Click `×` next to `fintech` to remove it
6. Try adding a duplicate tag (e.g. `b2b` again)

**Expected:**
- Tags appear as small badges next to the company name
- Tags persist after refreshing the page
- Removing a tag updates instantly
- Duplicate tags are ignored silently

---

## 6. Refresh Individual Sections

**Steps:**
1. Select a company with status `done`
2. Click `↻ News` next to the News Feed section header
3. Wait for it to complete, verify news updates
4. Click `↻ Problems` next to the Problem Statements section header
5. Wait for it to complete, verify problems update

**Expected:**
- Status changes to `researching` while refresh runs
- Only the targeted section (news OR problems) is replaced
- The other section remains unchanged
- Status returns to `done` when complete
- `last_researched_at` timestamp updates

---

## 7. Shortlist

**Steps:**
1. Click `☆` on 2–3 companies in the sidebar to shortlist them — star turns amber `★`
2. Click the `★` filter button at the top of the company list
3. Verify only shortlisted companies appear
4. Click `All` to return to full list
5. Click `★` on a shortlisted company to remove it from shortlist
6. Combine shortlist filter with search (e.g. shortlisted + search "stripe")

**Expected:**
- Star toggles between `☆` (gray) and `★` (amber) on click
- Shortlist state persists after page refresh
- `★` filter shows only shortlisted companies
- `All` restores full list
- Search works within the shortlisted filter

---

## Regression Checks

After testing all features, verify existing functionality still works:

- [ ] Add a single company (name only, website only, both)
- [ ] Bulk add via modal
- [ ] Delete a company
- [ ] Trigger full research
- [ ] Re-research (force, bypasses cache)
- [ ] Research cache (add same website twice, second should clone instantly)
- [ ] News feed source type filters (All / Reddit / LinkedIn / etc.)
- [ ] Collapse/expand News Feed and Problem Statements sections
- [ ] LLM provider badge shows in header
