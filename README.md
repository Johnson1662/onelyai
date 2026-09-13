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

`candidates/onely_candidates_100_rescored_v2.csv` 是 canonical seed；导入时读取 15 个 component scores，并重新计算 Fit、Activation、Network、Priority。`*_ranked.csv` 是派生排序文件。

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
