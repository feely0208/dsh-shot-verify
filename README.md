# @deepwhale-cn/dsh-shot-verify

> **技能型插件 · 无面板**：安装后由 DSH 智能体按 skill 说明调用 CLI；无独立面板界面。

安装到 DSH：

```bash
dsh plugin --profile web add @deepwhale-cn/dsh-shot-verify
```

上线视觉核验：URL 清单 → 截图任务清单（页面 × 桌面/移动视口，统一命名）→ 截图产物核验（存在/大小/新鲜度）→ 对比画廊 HTML。截图由 agent 浏览器工具或人工完成，本插件保证「不漏页、不缩水、可复核」。

```bash
npx @deepwhale-cn/dsh-shot-verify plan --urls urls.txt --out ./shots
npx @deepwhale-cn/dsh-shot-verify check --dir ./shots --plan ./shots/截图清单.json --html gallery.html
```
