# Onely Creator Outreach Tool — PRD

## 0. 文档信息

- 产品名称：Onely Creator Outreach Tool
- 版本：MVP v1.0
- 目标：在 24 小时笔试范围内，用 Codex 开发一套可运行的 Creator Acquisition（创作者拓展）工具
- 核心要求：
  1. 自动导入候选人
  2. 自动评分和排序
  3. 筛选与状态管理
  4. 展示拓展漏斗数据
- 数据来源：仅使用公开信息
- 约束：笔试期间不得真实联系 Creator，不提供自动群发能力

---

# 1. 背景与问题

Onely 当前处于 Creator Private Beta 冷启动阶段。（[onely.cc](https://www.onely.cc/)）

当前增长问题不是“找到更多网红”，而是：

> **如何快速建立一个可验证、可排序、可持续扩充的 Creator Pipeline，并优先找到最有可能真正激活 Onely 的 Creator。**

人工使用 CSV 可以完成第一批 100 人名单，但随着候选人增加，会出现：

- 信息格式不统一；
- 重复 Creator；
- 评分无法复算；
- 不同来源的候选人难以比较；
- 缺少状态管理；
- 无法快速知道当前 Outreach Funnel（拓展漏斗）；
- AI 评分结果缺少 Evidence（证据）；
- 人工修改 AI 结果后缺少审计记录。

因此需要一个轻量级 Creator Acquisition Workspace。

---

# 2. 产品目标

## 2.1 核心目标

建立一个从：

```text
Candidate Import
    ↓
Normalize / Deduplicate
    ↓
Evidence-backed Scoring
    ↓
Priority Ranking
    ↓
Human Review
    ↓
Status Management
    ↓
Funnel Analytics
```

的完整工作流。

## 2.2 MVP 成功标准

工具必须能够：

1. 导入现有 100 人 CSV；
2. 自动计算 Fit / Activation / Network / Priority；
3. 按 Priority 自动排序；
4. 支持多维筛选；
5. 支持更新 Candidate 状态；
6. 支持人工修改 AI/自动评分并留下原因；
7. 自动聚合 Funnel 数据；
8. 本地运行，无需复杂基础设施。

---

# 3. 非目标

MVP 不做：

- 自动发送邮件；
- 自动发送 Instagram / TikTok / LinkedIn 私信；
- 自动登录第三方 Creator 平台；
- 爬取受限或非公开数据；
- 自动绕过平台反爬；
- 自动购买广告；
- CRM 全量功能；
- 多租户权限系统；
- 复杂团队协作。

原因：笔试明确限制不得真实联系 Creator，本工具重点展示“拓展系统”而非“批量外呼系统”。

---

# 4. 目标用户

## Primary User

Growth Operator / Founder / Creator Acquisition Intern

核心任务：

- 导入候选人；
- 判断是否符合 Onely ICP；
- 找到优先联系对象；
- 管理拓展进度；
- 查看渠道与 Segment 转化表现。

## Secondary User

Founder / Hiring Manager

核心任务：

- 快速查看：
  - 哪些 Creator 最值得联系；
  - 为什么；
  - 当前 Funnel 是否合理；
  - 系统能否扩展到更大 Candidate Pool。

---

# 5. Creator 定义与评分模型

## 5.1 优质内测 Creator

定义：

> 已经持续经营内容和受众、存在明确商业化或经营意图、与 Onely 的 Content → Audience → Fan Relationship → Monetization 链路存在实际匹配，同时公开可触达、品牌安全，并有较高概率完成 Beta 激活的 Creator。

---

# 6. Scoring Model

MVP 使用三层评分。

## 6.1 Fit Score — 0–100

衡量：

> 这个 Creator 有多需要 Onely？

| 子项 | 满分 |
|---|---:|
| Audience Ownership | 20 |
| Owned Monetization | 20 |
| Multi-platform | 15 |
| Content Pressure | 15 |
| Fan Relationship | 15 |
| AI Affinity | 15 |

## 6.2 Activation Score — 0–100

衡量：

> 3 天内有多大可能让他真正开始使用 Onely？

| 子项 | 满分 |
|---|---:|
| Reachability | 25 |
| Early Adopter | 20 |
| Switching Ease | 20 |
| Size Fit | 15 |
| Immediate Value | 20 |

## 6.3 Network Score — 0–100

衡量：

> 激活这个人之后，是否能继续带来更多 Creator？

| 子项 | 满分 |
|---|---:|
| Managed Creator Network | 35 |
| Creator-facing Audience | 25 |
| Owned Community | 25 |
| Distribution Leverage | 15 |

## 6.4 Priority Score

当前正式版本：

```text
Priority
= 0.50 × Fit
+ 0.30 × Activation
+ 0.20 × Network
```

Priority Tier：

- P0：≥ 85
- P1：75–84.9
- P2：65–74.9
- P3：< 65

---

# 7. Evidence-first 原则

所有评分必须可以追溯到 Evidence。

Candidate Detail 中显示：

```text
Audience Ownership: 20/20
Evidence:
- Own newsletter
- Paid community
Source:
https://...

Owned Monetization: 20/20
Evidence:
- Course
- Coaching
Source:
https://...
```

规则：

> **没有公开证据，就不给分。**

---

# 8. 核心功能

## 8.1 Candidate Import

### User Story

作为 Growth Operator，我希望上传 CSV，就可以把候选人自动导入系统，而不是手工录入。

### 输入

支持：

- CSV 上传
- Demo Dataset 一键载入

### 必须支持的字段

基础字段：

- candidate_id
- name
- brand_or_handle
- segment
- public_profile_url

联系字段：

- contact_type
- contact_source_url
- contact_value_public

匹配字段：

- match_reason
- owned_audience_signal
- monetization_signal
- ai_affinity
- network_value_signal

Evidence：

- evidence_url_1
- evidence_summary_1
- evidence_url_2
- evidence_summary_2

状态：

- verification_level
- verified_at
- funnel_status
- outreach_status
- risk_or_caveat

### Import 行为

导入后：

1. 校验必需字段；
2. 标准化空值；
3. 自动计算评分；
4. 自动分配 Priority；
5. 自动去重；
6. 返回：
   - imported
   - skipped
   - duplicated
   - invalid

---

## 8.2 Deduplication

至少使用：

- canonical profile URL
- public email
- website domain
- handle
- normalized creator name

若发现潜在重复：

```text
Possible Duplicate
Candidate A
Candidate B
```

MVP 可以选择：

- Keep existing
- Replace existing
- Keep both

---

# 9. Candidate List

主页面核心表格。

默认按照：

```text
Priority Score DESC
```

排序。

### 列

推荐显示：

- Creator
- Segment
- Fit
- Activation
- Network
- Priority
- Verification
- Funnel Status
- Contact Type
- Last Updated

### 快速操作

- View Details
- Change Status
- Human Review
- Mark Disqualified

---

# 10. Filter & Search

必须支持：

## Search

按：

- Creator Name
- Handle
- Email

搜索。

## Filter

至少支持：

- Priority
- Segment
- Verification Level
- Funnel Status
- Outreach Status
- AI Affinity
- Has Public Email
- Fit Score Range
- Activation Score Range
- Network Score Range

## Sort

至少：

- Priority Score
- Fit Score
- Activation Score
- Network Score
- Name

---

# 11. Candidate Detail

Candidate Detail 是工具核心页面。

页面结构：

## Overview

展示：

- Name
- Handle
- Segment
- Public Profile
- Contact
- Verification
- Current Status
- Priority

## Match Reason

展示：

- 为什么符合 Onely ICP
- Creator Business 信号

## Scoring

展示：

```text
Fit        90
Activation 75
Network    50
Priority   77.5
```

并展开子项。

## Evidence

每一个子项至少显示：

- claim
- score
- evidence summary
- source URL

## Human Review

人工可以：

- 修改单个子项分数；
- 输入调整理由；
- 保存。

示例：

```text
AI Score:
Audience Ownership = 20

Human Override:
Audience Ownership = 10

Reason:
Most visible followers belong to brand campaign traffic;
no owned community/newsletter evidence found.
```

系统必须保存：

- before_score
- after_score
- reason
- timestamp

这同时满足笔试中的“人工修正 AI 结果案例”。

---

# 12. Status Management

## Candidate Funnel

推荐状态：

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

笔试 Demo 中：

- 初始候选人可以处于 discovered / qualified / verified / ready_for_outreach；
- 不进行真实联系；
- Funnel 后半段使用 Demo / simulated 状态数据展示产品能力。

必须在 UI 明确标识：

> Demo funnel data — no real creator outreach was performed during the assessment.

---

# 13. Funnel Dashboard

Dashboard 至少展示：

## Top-level Metrics

- Total Candidates
- Verified
- Ready for Outreach
- Contacted
- Replied
- Interested
- Signed Up
- Activated

## Conversion Funnel

```text
Candidates
   ↓
Qualified
   ↓
Verified
   ↓
Contacted
   ↓
Replied
   ↓
Interested
   ↓
Activated
```

每一层展示：

- count
- conversion rate

## Breakdown

支持至少两个维度：

### By Segment

例如：

- Creator Entrepreneur
- AI-native Creator
- Tech UGC
- Lifestyle Creator
- Virtual Creator

### By Source

例如：

- Google Search
- YouTube
- Instagram
- Creator Website
- Reddit
- Agency
- Community

---

# 14. Discovery / Expansion Queue

虽然题目最低要求没有明确要求自动发现 Creator，但为了回答“如何稳定扩充名单”，MVP 增加轻量 Discovery Queue。

记录：

- candidate_url
- source
- query
- discovered_at
- reviewed
- import_status

允许：

- 手动粘贴公开 URL
- 批量 CSV 导入
- Promote to Candidate

不做：

- 登录平台爬取
- 私有 API
- 自动绕过反爬

---

# 15. Audit Log

记录关键动作：

```text
candidate_imported
score_calculated
human_score_override
status_changed
candidate_disqualified
duplicate_resolved
```

字段：

- action
- candidate_id
- previous_value
- new_value
- reason
- timestamp

用于：

- 展示人工监督；
- 保存 AI / Human 决策链；
- 支持笔试中的 Codex + Human Review 叙事。

---

# 16. UI 信息架构

建议导航：

```text
Dashboard
Candidates
Discovery
Activity
```

## Dashboard

- KPI
- Funnel
- Segment Breakdown
- Priority Distribution

## Candidates

- Table
- Filter
- Sort
- Import

## Candidate Detail

- Overview
- Evidence
- Scoring
- Human Review
- Status

## Discovery

- URL Queue
- Source
- Query
- Promote to Candidate

## Activity

- Audit Log

---

# 17. 推荐技术栈

目标是：

> 24 小时内稳定完成，而不是做复杂基础设施。

推荐：

- Next.js 15+
- TypeScript
- React
- Tailwind CSS
- shadcn/ui
- SQLite
- Drizzle ORM
- Recharts
- Zod
- PapaParse / csv-parse

理由：

- 单仓库；
- 前后端一体；
- TypeScript 类型共享；
- SQLite 无部署负担；
- Candidate 数据量只有百到千级；
- 本地演示稳定；
- Codex 容易理解和维护。

---

# 18. 数据模型

## Candidate

```ts
Candidate {
  id
  name
  handle
  segment

  publicProfileUrl
  contactType
  contactSourceUrl
  contactValue

  matchReason
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

  createdAt
  updatedAt
}
```

## ScoreComponent

```ts
ScoreComponent {
  id
  candidateId

  category
  key
  score
  maxScore

  evidenceSummary
  evidenceUrl

  source
}
```

其中：

```text
source = AUTO | HUMAN_OVERRIDE
```

## AuditLog

```ts
AuditLog {
  id
  candidateId
  action
  previousValue
  newValue
  reason
  createdAt
}
```

## DiscoveryItem

```ts
DiscoveryItem {
  id
  url
  source
  query
  status
  discoveredAt
}
```

---

# 19. Demo 数据与合规

真实候选数据：

- 使用已经深度核验的 100 人 Candidate CSV。

真实状态：

- verified
- ready_for_outreach

模拟 Funnel：

如果需要演示 contacted → activated：

必须使用单独 Demo Dataset 或 `is_demo = true`。

UI 显示：

> Simulated funnel data for product demonstration. No messages were sent.

防止把 Demo 数据误认为真实 Outreach 结果。

---

# 20. 验收标准

MVP 验收时必须完成：

- [ ] 可以导入 100 人 CSV
- [ ] 自动校验数据
- [ ] 自动去重
- [ ] 自动生成 15 个评分子项
- [ ] 自动计算 Fit
- [ ] 自动计算 Activation
- [ ] 自动计算 Network
- [ ] 自动计算 Priority
- [ ] 自动排序
- [ ] 多维 Filter
- [ ] Search
- [ ] Candidate Detail
- [ ] Evidence 可追溯
- [ ] Status 可更新
- [ ] Human Override
- [ ] Override Reason
- [ ] Audit Log
- [ ] Funnel Dashboard
- [ ] Segment Breakdown
- [ ] Demo Funnel 明确标识模拟数据
- [ ] README 可一条命令运行

---

# 21. 产品核心价值

这个工具不是一个普通联系人表格。

核心区别是：

> **Evidence-backed Creator Acquisition System**

即：

```text
Public Evidence
      ↓
Explainable Scoring
      ↓
Human Review
      ↓
Priority Queue
      ↓
Funnel Measurement
      ↓
Better Discovery
```

它将“找 Creator”从一次性人工研究，转换成一个可以持续运行和迭代的增长系统。
