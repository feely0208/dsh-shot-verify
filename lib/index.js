/**
 * dsh-shot-verify —— 上线视觉核验 · 内核
 * 两个动作：
 *   1) plan：把 URL 清单变成「截图任务清单」（文件名约定：域名+路径+视口）
 *   2) check：核验截图产物（存在/大小/新鲜度）并产出对比画廊 HTML
 * 截图本身由 agent 的浏览器工具或人工完成 —— 本插件负责「不漏页、不缩水、可复核」。
 */
import { existsSync, statSync, readdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';

export const VIEWPORTS = ['desktop-1440x900', 'mobile-390x844'];

export function slugify(url) {
  const u = new URL(url);
  const path = (u.pathname === '/' ? 'home' : u.pathname.replace(/^\//, '').replace(/\/$/, '').replace(/[^a-zA-Z0-9]+/g, '-')).slice(0, 60) || 'home';
  return `${u.hostname}-${path}`;
}

/** 从 urls 文本（每行一个 URL，# 注释跳过）生成任务清单 */
export function buildPlan(text, { viewports = VIEWPORTS } = {}) {
  const urls = text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  if (!urls.length) throw new Error('URL 清单为空');
  const tasks = [];
  for (const url of urls) {
    for (const vp of viewports) {
      tasks.push({ url, viewport: vp, file: `${slugify(url)}.${vp}.png` });
    }
  }
  return { tasks, count: tasks.length, pages: urls.length };
}

/** 核验截图目录：清单里每张都在吗？大小/新鲜度如何？ */
export function checkShots(plan, dir, { minBytes = 10240, maxAgeDays = 30, now = Date.now() } = {}) {
  const results = [];
  for (const t of plan.tasks) {
    const p = join(dir, t.file);
    if (!existsSync(p)) {
      results.push({ ...t, path: p, ok: false, reason: '缺失' });
      continue;
    }
    const st = statSync(p);
    const ageDays = Math.floor((now - st.mtimeMs) / 86400000);
    if (st.size < minBytes) results.push({ ...t, path: p, ok: false, reason: `过小 ${st.size}B（<${minBytes}B，可能是空白/加载失败）` });
    else if (ageDays > maxAgeDays) results.push({ ...t, path: p, ok: false, reason: `过期 ${ageDays} 天前截取` });
    else results.push({ ...t, path: p, ok: true, reason: `${(st.size / 1024).toFixed(0)}KB · ${ageDays} 天前` });
  }
  const extra = readdirSync(dir).filter((f) => f.endsWith('.png') && !plan.tasks.some((t) => t.file === f));
  return {
    results,
    extra,
    stats: { total: results.length, ok: results.filter((r) => r.ok).length, missing: results.filter((r) => !r.ok && r.reason === '缺失').length, bad: results.filter((r) => !r.ok && r.reason !== '缺失').length, extra: extra.length },
  };
}

/** 画廊 HTML：绿=合格，红=问题；直接嵌截图 */
export function galleryHtml(check, { title = '上线视觉核验画廊' } = {}) {
  const cells = check.results.map((r) => {
    const img = r.ok ? `<img src="${basename(r.path)}" style="max-width:100%;border:1px solid #ddd">` : `<div style="color:#dc2626;padding:20px;border:1px dashed #dc2626">${r.reason}</div>`;
    return `<div style="margin:8px 0"><b>${r.ok ? '✅' : '❌'} ${r.url}</b> <span style="color:#888">[${r.viewport}]</span> ${r.ok ? r.reason : ''}<br>${img}</div>`;
  }).join('');
  return `<!doctype html><meta charset="utf-8"><title>${title}</title>
<style>body{font:14px/1.6 -apple-system,sans-serif;margin:24px;max-width:1100px}</style>
<h1>${title}</h1><p>${check.stats.total} 张 · ${check.stats.ok} 合格 · 缺失 ${check.stats.missing} · 异常 ${check.stats.bad} · 未在清单内 ${check.stats.extra}</p>${cells}`;
}

/** 读目录里的 png（check 辅助） */
export function listPngs(dir) {
  return readdirSync(dir).filter((f) => f.endsWith('.png')).map((f) => join(dir, f));
}

export { existsSync, readFileSync };

// ── DSH 插件接入（方案 A 薄壳：注册 skill 与 CLI 入口；业务逻辑仍在 lib/bin，不在此处）──
import { createPlugin, pkgRootFrom } from '@deepwhale-cn/dsh-guard-core/plugin';

export const { name, inject, apply } = createPlugin({
  name: 'shot-verify',
  pkgRoot: pkgRootFrom(import.meta.url),
  skillFile: 'skill/shot-verify.md',
  binFile: 'bin/cli.mjs',
  description: "生成逐页截图清单、核验截图产物（存在/大小/新鲜度），并产出对比画廊页；截图由 agent 或人工完成",
  whenToUse: "改版或发版后核验逐页截图产物齐全且新鲜。用户会说：截图核验一下齐不齐。",
});
