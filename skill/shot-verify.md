# 上线视觉核验（dsh-shot-verify）

**什么时候用**：改版/发版后，确认「每个页面都看了、每张截图都是新的、不是空白页」。
用户会说：「帮我核验一遍截图齐不齐」「这两版对比给客户看」。

## 怎么用（两步，截图由 agent 浏览器工具或人工完成）

```bash
<cli 路径> plan  --urls urls.txt --out ./shots      # ① 生成截图任务清单（页面×视口，含命名约定）
#  → agent 按 清单 用浏览器工具逐张截图，存到 ./shots（文件名=清单 file 字段）
<cli 路径> check --dir ./shots --plan ./shots/截图清单.json --html gallery.html [--min-bytes 10240] [--max-age-days 30]
```

## 它核验什么

每张截图：存在 / 大小 ≥ minBytes（空白页拦截）/ 新鲜度（≤ maxAgeDays）/ 目录里有没有清单外的图。
check 退出码：有不合格 → 1。

## 边界

不做视觉相似度对比（对比画廊是给人看的）；截图质量判定靠 minBytes 兜底 + 人工。
