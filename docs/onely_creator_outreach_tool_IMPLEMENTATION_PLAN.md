# Onely Creator Outreach Tool — Implementation Plan

## 0. 实现原则

目标不是在 24 小时内做一个完整 CRM，而是：

> **优先保证笔试要求中的 4 个核心功能完全可运行，再补充 Evidence、Human Override、Audit Log 作为差异化。**

开发顺序必须遵守：

```text
Data
→ Scoring
→ Candidate List
→ Status
→ Funnel
→ Polish
```

不要先做复杂 UI。

---

# 1. 技术方案

## Stack

- Next.js 15+
- TypeScript
- React
- Tailwind CSS
- shadcn/ui
- SQLite
- Drizzle ORM
- Zod
- PapaParse / csv-parse
- Recharts

## Repository Structure

```text
onely-outreach/
├── app/
│   ├── page.tsx
│   ├── candidates/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── discovery/page.tsx
│   ├── activity/page.tsx
│   └── api/
│       ├── candidates/
│       ├── import/
│       ├── scoring/
│       ├── funnel/
│       └── discovery/
│
├── components/
│   ├── dashboard/
│   ├── candidates/
│   ├── scoring/
│   ├── funnel/
│   └── ui/
│
├── db/
│   ├── schema.ts
│   ├── client.ts
│   └── seed.ts
│
├── lib/
│   ├── scoring/
│   │   ├── fit.ts
│   │   ├── activation.ts
│   │   ├── network.ts
│   │   └── priority.ts
│   ├── import/
│   ├── dedupe/
│   └── validation/
│
├── data/
│   └── candidates.csv
│
└── README.md
```

---

# 2. Phase 0 — Project Bootstrap

预计：30–45 min

Codex 任务：

1. 初始化 Next.js + TypeScript；
2. 配置 Tailwind；
3. 安装 shadcn/ui；
4. 配置 SQLite + Drizzle；
5. 添加 Zod；
6. 添加 CSV parser；
7. 添加 Recharts。

完成标准：

```bash
npm install
npm run dev
```

可直接启动。

---

# 3. Phase 1 — Database Schema

预计：45 min

## Candidate Table

字段：

```text
id
candidateId
name
brandOrHandle
segment
primaryPlatformOrAsset
publicProfileUrl

contactType
contactSourceUrl
contactValuePublic

matchReason
ownedAudienceSignal
monetizationSignal
aiAffinity
networkValueSignal

verificationLevel
verifiedAt
funnelStatus
outreachStatus

fitScore
activationScore
networkScore
priorityScore
priority

riskOrCaveat

isDemo
createdAt
updatedAt
```

## Evidence Table

```text
id
candidateId
scoreCategory
scoreKey

summary
url

score
maxScore
source

createdAt
```

## AuditLog

```text
id
candidateId
action
before
after
reason
createdAt
```

## DiscoveryItem

```text
id
url
source
query
status
createdAt
```

完成：

- migration
- seed
- indexes

---

# 4. Phase 2 — Scoring Engine

预计：1.5 h

这是项目核心，应优先写单元测试。

## Fit

实现纯函数：

```ts
calculateFit(candidate): {
  components,
  total
}
```

子项：

```text
audienceOwnership /20
ownedMonetization /20
multiPlatform /15
contentPressure /15
fanRelationship /15
aiAffinity /15
```

## Activation

```ts
calculateActivation(candidate)
```

子项：

```text
reachability /25
earlyAdopter /20
switchingEase /20
sizeFit /15
immediateValue /20
```

## Network

```ts
calculateNetwork(candidate)
```

子项：

```text
managedCreatorNetwork /35
creatorFacingAudience /25
ownedCommunity /25
distributionLeverage /15
```

## Priority

```ts
priority =
  fit * 0.50 +
  activation * 0.30 +
  network * 0.20
```

Tier：

```ts
>= 85 => P0
>= 75 => P1
>= 65 => P2
else  => P3
```

## Tests

至少写：

```text
high-fit creator entrepreneur
easy-to-reach tech UGC
large creator with low activation
agency/community operator
virtual creator
```

确认：

- 所有分数范围正确；
- Priority 计算正确；
- 没有 Evidence 不自动高分。

---

# 5. Phase 3 — CSV Import

预计：1 h

页面：

```text
Candidates
→ Import CSV
```

## Flow

```text
Select CSV
    ↓
Parse
    ↓
Validate
    ↓
Preview
    ↓
Deduplicate
    ↓
Calculate Scores
    ↓
Insert DB
```

## Import Result

展示：

```text
100 rows read
96 imported
2 duplicated
2 invalid
```

## Deduplication

优先级：

1. email exact match
2. canonical profile URL
3. website domain + handle
4. normalized name

---

# 6. Phase 4 — Candidate List

预计：1.5 h

实现表格：

```text
Creator
Segment
Fit
Activation
Network
Priority
Verification
Status
Contact
```

## 功能

- Search
- Filter
- Sort
- Pagination

Filters：

```text
Priority
Segment
Verification
Funnel status
AI affinity
Has public email
Fit range
Activation range
Network range
```

默认：

```text
Priority DESC
```

---

# 7. Phase 5 — Candidate Detail

预计：1.5 h

页面：

```text
/candidates/[id]
```

区域：

## A. Overview

```text
Name
Segment
Profile
Contact
Status
Priority
```

## B. Match Reason

展示 Candidate 为什么符合 Onely。

## C. Score Breakdown

例如：

```text
Fit 90

Audience Ownership   20 / 20
Monetization         20 / 20
Multi-platform       15 / 15
...
```

## D. Evidence

点击 Source 可打开公开 URL。

## E. Human Override

```text
Original: 20
New:      10
Reason:   ...
Save
```

保存后：

1. score component 更新；
2. total score 重算；
3. priority 重算；
4. Audit Log 写入记录。

---

# 8. Phase 6 — Status Management

预计：45 min

状态：

```text
discovered
qualified
verified
ready_for_outreach
contacted
replied
interested
signed_up
activated
not_interested
disqualified
```

支持：

- Detail 页面修改；
- Table 快捷修改。

状态更新：

```text
update candidate
+
insert audit log
```

---

# 9. Phase 7 — Funnel Dashboard

预计：1.5 h

主页 `/`

## KPI Cards

```text
Total
Verified
Ready
Contacted
Replied
Interested
Activated
```

## Funnel

使用 Recharts：

```text
Candidates
Qualified
Verified
Contacted
Replied
Interested
Activated
```

每一级：

```text
count
stage conversion
overall conversion
```

## Breakdown

两个图：

### Segment

```text
AI-native
Creator Entrepreneur
UGC
Lifestyle
Virtual
```

### Priority

```text
P0
P1
P2
P3
```

---

# 10. Phase 8 — Demo Funnel Data

预计：30 min

由于不能真实联系 Creator，增加 Demo 模式。

数据库：

```text
isDemo = true
```

UI 顶部显示：

```text
Demo Funnel
Simulated data only.
No creator outreach was performed.
```

提供：

```text
Load Demo Funnel
Reset Demo Funnel
```

这样面试官可以完整看到：

```text
contacted
replied
interested
activated
```

而不会误解为真实 Outreach。

---

# 11. Phase 9 — Discovery Queue

预计：45 min

页面：

```text
/discovery
```

支持：

```text
Add Public URL
Source
Query
Notes
```

Status：

```text
new
reviewing
qualified
rejected
imported
```

操作：

```text
Promote to Candidate
```

这部分用于展示：

> 100 人之后如何继续扩充。

无需真正实现自动爬虫。

---

# 12. Phase 10 — Audit Log

预计：30 min

页面：

```text
/activity
```

展示：

```text
timestamp
candidate
action
before
after
reason
```

至少记录：

```text
IMPORT
AUTO_SCORE
HUMAN_OVERRIDE
STATUS_CHANGE
DISQUALIFY
DEDUPE
```

---

# 13. Phase 11 — UI Polish

预计：1 h

重点：

- 清晰
- 数据密度高
- 不做花哨动画

推荐整体：

```text
white / gray
minimal SaaS dashboard
```

Dashboard：

```text
Sidebar
Top metrics
Funnel chart
Segment breakdown
Recent activity
```

Candidates：

```text
Toolbar
Filters
Dense table
```

Detail：

```text
2-column layout

Left:
Creator + Evidence

Right:
Scores + Status
```

---

# 14. Phase 12 — Seed Real Candidate Data

预计：30 min

将：

```text
onely_candidates_100_rescored_v2.csv
```

放入：

```text
/data/candidates.csv
```

提供：

```bash
npm run seed
```

Seed 后：

```text
100 candidates
80 A verified
20 B verified
```

注意：

不能导入 v2.1 权重版本。

当前工具使用：

```text
Fit        50%
Activation 30%
Network    20%
```

---

# 15. Phase 13 — README

预计：30 min

必须写清楚：

## Run

```bash
npm install
npm run db:migrate
npm run seed
npm run dev
```

## Demo

```text
1. Open Dashboard
2. Import candidate CSV
3. Filter P0/P1
4. Open Candidate Detail
5. Review evidence
6. Override one AI score
7. Change status
8. View Funnel
```

## Assessment Restriction

明确：

```text
No real outreach was performed.
No messages or emails were sent.
Only public data was used.
```

---

# 16. Codex Implementation Order

推荐把任务分成多个 Codex Prompt，而不是一次让它全部写完。

## Prompt 1 — Bootstrap + Schema

目标：

```text
Initialize project
Build database schema
Migrations
Seed structure
```

验收后再继续。

## Prompt 2 — Scoring Engine

目标：

```text
Implement scoring pure functions
Implement tests
```

重点人工检查。

## Prompt 3 — Import

目标：

```text
CSV upload
validation
dedupe
score
insert
```

## Prompt 4 — Candidate List + Filters

目标：

```text
Table
search
filter
sort
```

## Prompt 5 — Candidate Detail

目标：

```text
Evidence
Score breakdown
Human Override
```

## Prompt 6 — Status + Funnel

目标：

```text
status state machine
funnel API
dashboard charts
```

## Prompt 7 — Discovery + Audit

目标：

```text
Discovery queue
Audit log
```

## Prompt 8 — QA

要求 Codex：

```text
Run lint
Run typecheck
Run tests
Run build

Review the full repository for:
- broken routes
- invalid state transitions
- scoring bugs
- CSV edge cases
- database errors
- UI overflow
```

---

# 17. 建议测试用例

## Import

- valid CSV
- missing required field
- duplicate email
- duplicate profile URL
- malformed score
- empty row

## Scoring

- maximum score
- minimum score
- threshold 85
- threshold 75
- threshold 65

## Human Override

- modifies score
- recomputes priority
- creates audit log
- preserves reason

## Status

检查：

```text
verified -> ready
ready -> contacted
contacted -> replied
replied -> interested
interested -> activated
```

Demo 模式才允许后半段。

---

# 18. 24 小时时间分配

## T+0–2h

- Project bootstrap
- DB schema
- Scoring engine

## T+2–5h

- CSV import
- Candidate table
- Filters

## T+5–8h

- Candidate Detail
- Evidence
- Human Override

## T+8–11h

- Status
- Dashboard
- Funnel

## T+11–13h

- Discovery Queue
- Audit Log

## T+13–16h

- Seed real 100 candidates
- Fix data/import bugs

## T+16–19h

- UI polish
- Responsive layout

## T+19–21h

- Tests
- Build
- QA

## T+21–23h

- README
- Screenshots
- Codex operation log

## T+23–24h

只做：

```text
bug fixes
final verification
submission
```

不要再加新功能。

---

# 19. Must / Should / Could

## MUST

笔试明确要求：

- CSV import
- scoring
- ranking
- filtering
- status management
- funnel dashboard

以及为了可信度：

- evidence
- human override
- local persistence

## SHOULD

- dedupe
- audit log
- demo funnel
- segment analytics
- discovery queue

## COULD

时间允许再做：

- CSV export
- batch status update
- dark mode
- saved filters
- source performance
- configurable score weights

---

# 20. 最大风险

## Risk 1：过度开发

不要实现：

- crawler
- email sender
- auth
- multi-tenant
- complex AI agent

这些都不是题目核心。

## Risk 2：评分与 CSV 不一致

必须保证：

```text
CSV
→ import
→ scoring
```

得到的结果可以解释。

## Risk 3：假数据冒充真实增长

所有 contacted / replied / activated 模拟数据：

必须明确：

```text
DEMO / SIMULATED
```

## Risk 4：漂亮但不可用

最终验收优先级：

```text
功能正确
>
数据正确
>
可解释
>
UI
```

---

# 21. 最终演示流程

面试官打开项目后：

### Step 1

Dashboard：

看到：

```text
100 candidates
verification distribution
priority distribution
funnel
```

### Step 2

Candidates：

筛选：

```text
P0 / P1
AI-native
A verified
```

### Step 3

打开 Creator：

看到：

```text
Why this creator?
Public profile
Contact source
Evidence
Fit
Activation
Network
```

### Step 4

人工修改一个 AI Score：

```text
20 → 10
```

填写 Reason。

Priority 自动更新。

### Step 5

Activity：

看到 Human Override Audit Log。

### Step 6

切换 Demo Funnel：

看到：

```text
Contacted
Replied
Interested
Activated
```

并明确显示模拟数据。

整个演示在 3–5 分钟内完整覆盖笔试要求。
