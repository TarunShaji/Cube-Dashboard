# Graph Report - Dashboard  (2026-04-30)

## Corpus Check
- 160 files · ~77,777 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 418 nodes · 494 edges · 17 communities detected
- Extraction: 71% EXTRACTED · 29% INFERRED · 0% AMBIGUOUS · INFERRED: 141 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]

## God Nodes (most connected - your core abstractions)
1. `withAuth()` - 36 edges
2. `handleCORS()` - 34 edges
3. `cn()` - 26 edges
4. `safeArray()` - 15 edges
5. `withErrorLogging()` - 13 edges
6. `normHeader()` - 12 edges
7. `rowToContent()` - 11 edges
8. `OPTIONS()` - 10 edges
9. `PUT()` - 9 edges
10. `DELETE()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `ImportShell()` --calls--> `safeArray()`  [INFERRED]
  app/dashboard/import/page.js → lib/safe.js
- `OPTIONS()` --calls--> `handleCORS()`  [INFERRED]
  app/api/clients/route.js → lib/middleware/api-utils.js
- `OPTIONS()` --calls--> `handleCORS()`  [INFERRED]
  app/api/clients/[id]/resources/route.js → lib/middleware/api-utils.js
- `OPTIONS()` --calls--> `handleCORS()`  [INFERRED]
  app/api/clients/[id]/resources/[resId]/route.js → lib/middleware/api-utils.js
- `OPTIONS()` --calls--> `handleCORS()`  [INFERRED]
  app/api/tasks/route.js → lib/middleware/api-utils.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (26): cn(), AlertDialogFooter(), AlertDialogHeader(), Badge(), BreadcrumbEllipsis(), BreadcrumbSeparator(), Calendar(), CalendarDayButton() (+18 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (34): GET(), OPTIONS(), POST(), GET(), OPTIONS(), POST(), GET(), OPTIONS() (+26 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (31): GET(), OPTIONS(), OPTIONS(), PUT(), OPTIONS(), POST(), GET(), OPTIONS() (+23 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (14): AddContentModal(), NavContent(), DashboardPageContent(), AssignedMemberSelect(), AssigneeCell(), ClientDetailPageContent(), toAssignedIds(), safeArray() (+6 more)

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (23): mapBlogInternalApproval(), mapBlogStatus(), mapInternStatus(), mapTopicApproval(), parseIntPositive(), parseWeek(), rowToContent(), rowToEmailTask() (+15 more)

### Community 5 - "Community 5"
Cohesion: 0.17
Nodes (8): safeJSON(), apiFetch(), authHeaders(), getToken(), getUser(), logout(), swrFetcher(), TeamPageContent()

### Community 6 - "Community 6"
Cohesion: 0.35
Nodes (4): DELETE(), GET(), OPTIONS(), PUT()

### Community 7 - "Community 7"
Cohesion: 0.18
Nodes (2): ClientPortalPage(), sectionToState()

### Community 8 - "Community 8"
Cohesion: 0.18
Nodes (1): ImportShell()

### Community 9 - "Community 9"
Cohesion: 0.33
Nodes (7): addToRemoveQueue(), dispatch(), genId(), reducer(), toast(), useToast(), Toaster()

### Community 10 - "Community 10"
Cohesion: 0.54
Nodes (3): DELETE(), OPTIONS(), POST()

### Community 11 - "Community 11"
Cohesion: 0.48
Nodes (2): OPTIONS(), POST()

### Community 12 - "Community 12"
Cohesion: 0.43
Nodes (4): getCountMap(), main(), normalizeName(), toMap()

### Community 13 - "Community 13"
Cohesion: 0.43
Nodes (6): applyContentTransition(), applySocialTaskTransition(), applyTaskTransition(), assertContentInvariant(), assertSocialTaskInvariant(), assertTaskInvariant()

### Community 14 - "Community 14"
Cohesion: 0.33
Nodes (1): PUT()

### Community 15 - "Community 15"
Cohesion: 0.53
Nodes (2): OPTIONS(), POST()

### Community 16 - "Community 16"
Cohesion: 0.33
Nodes (1): ErrorBoundary

## Knowledge Gaps
- **Thin community `Community 7`** (12 nodes): `page.js`, `ApprovalButton()`, `BlogApprovalButton()`, `ClientPortalPage()`, `ExpandableText()`, `fmtDate()`, `sectionToState()`, `SocialDraftApprovalButton()`, `SocialFeedbackCell()`, `SocialIdeaApprovalButton()`, `stateToSection()`, `TopicApprovalButton()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 8`** (11 nodes): `page.js`, `ClickUpCSVImport()`, `ContentCSVImport()`, `EmailCSVImport()`, `FormatGuide()`, `ImportPage()`, `ImportShell()`, `PaidCSVImport()`, `parseSpreadsheet()`, `SocialCSVImport()`, `TaskCSVImport()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 11`** (7 nodes): `route.js`, `route.js`, `route.js`, `route.js`, `route.js`, `OPTIONS()`, `POST()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (6 nodes): `route.js`, `route.js`, `route.js`, `route.js`, `route.js`, `PUT()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (6 nodes): `route.js`, `route.js`, `route.js`, `route.js`, `OPTIONS()`, `POST()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (6 nodes): `ErrorBoundary`, `.componentDidCatch()`, `.constructor()`, `.getDerivedStateFromError()`, `.render()`, `ErrorBoundary.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `withAuth()` connect `Community 1` to `Community 2`, `Community 6`, `Community 10`, `Community 11`, `Community 14`, `Community 15`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `handleCORS()` connect `Community 2` to `Community 1`, `Community 6`, `Community 10`, `Community 11`, `Community 15`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `safeArray()` connect `Community 3` to `Community 8`, `Community 5`, `Community 7`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 32 inferred relationships involving `withAuth()` (e.g. with `GET()` and `POST()`) actually correct?**
  _`withAuth()` has 32 INFERRED edges - model-reasoned connections that need verification._
- **Are the 28 inferred relationships involving `handleCORS()` (e.g. with `GET()` and `OPTIONS()`) actually correct?**
  _`handleCORS()` has 28 INFERRED edges - model-reasoned connections that need verification._
- **Are the 25 inferred relationships involving `cn()` (e.g. with `DialogHeader()` and `DialogFooter()`) actually correct?**
  _`cn()` has 25 INFERRED edges - model-reasoned connections that need verification._
- **Are the 14 inferred relationships involving `safeArray()` (e.g. with `ClientPortalPage()` and `NavContent()`) actually correct?**
  _`safeArray()` has 14 INFERRED edges - model-reasoned connections that need verification._