# Onely Creator Outreach Tool

本地运行的候选 Creator acquisition 工作台：导入公开 CSV、按 v2.0 evidence rubric 重算排序、查看证据、人工修正评分并记录审计。

## Requirements

- Node.js `>=22.5`（使用内置 `node:sqlite`）
- pnpm

## Run

```bash
pnpm install
pnpm run db:migrate
pnpm run db:seed
pnpm run dev
```

打开 `http://localhost:3000`。数据库写入 `.data/onely.sqlite`，不会提交到 Git。

`candidates/onely_candidates_100_rescored_v2.csv` 是 canonical seed；导入时兼容读取 15 个 legacy component scores，并重新计算 Fit、Activation、Network、Priority。`*_ranked.csv` 是派生排序文件。

## Scoring inputs

新增候选人填写结构化公开事实（受众、商业化、平台数量、内容频率、AI 使用、团队规模、联系渠道和分发渠道），由 `lib/scoring.ts` 中的本地 TypeScript 规则生成 15 个 component scores。每个候选人的 facts 会保存到数据库，详情页同时显示规则解释。

CSV 可以省略 15 个 component score 列，改用 `fact_*` 列，或把完整事实对象放在 `facts_json` 列。若 facts 和 15 个旧分数同时存在，preview 会逐项比较；提交时以本地 facts 规则为准。只有旧分数时仍按 v2 CSV 导入，保证现有 100 人 seed 可用。

## Review flow

1. 在 Candidates 选择 CSV，先查看 preview、重复项、无效行和分数不一致。
2. 按 P0/P1、segment、verification、AI affinity 或分数范围筛选。
3. 打开候选人查看 public evidence 与 15 项评分。
4. 修改单项评分并填写原因；总分、Priority 和 Activity 会同步更新。
5. Real data 只推进到 `ready_for_outreach`；状态变更受控并写入 Activity。
6. Dashboard 的 Demo Funnel 可加载或清除隔离的模拟 contacted→activated 数据。

Discovery 页面用于记录公开 URL，人工补齐证据和 rubric 后再 Promote 为候选人。

本工具只使用公开数据，不发送邮件、消息或执行真实 Outreach；Demo Funnel 明确标记为 simulated。

## Verification

```bash
pnpm run verify
```

清空本地数据库后重新开始：

```bash
pnpm run db:reset
pnpm run db:seed
```
