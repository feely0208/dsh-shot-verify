#!/usr/bin/env node
/**
 * dsh-shot-verify —— 上线视觉核验
 * 用法：
 *   dsh-shot-verify plan --urls urls.txt [--out 目录] [--json]     # 生成截图任务清单
 *   dsh-shot-verify check --dir 截图目录 --plan 清单.json [--html gallery.html]  # 核验产物
 * 截图由 agent 浏览器工具/人工按清单完成后，用 check 核验「不漏页、不缩水、不过期」。
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildPlan, checkShots, galleryHtml } from '../lib/index.js';

const args = process.argv.slice(2);
const cmd = args[0];
const has = (k) => args.includes('--' + k);
const val = (k, d = '') => {
  const i = args.indexOf('--' + k);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d;
};

if (!cmd || has('help')) {
  console.log(`dsh-shot-verify —— 上线视觉核验

用法：
  dsh-shot-verify plan  --urls urls.txt [--out 目录]      # 生成截图任务清单（含命名约定）
  dsh-shot-verify check --dir <截图目录> --plan <清单.json> [--html gallery.html] [--min-bytes 10240] [--max-age-days 30]
流程：plan 生成清单 → agent/人工按清单截图 → check 核验并出画廊。`);
  process.exit(0);
}

if (cmd === 'plan') {
  const plan = buildPlan(readFileSync(val('urls'), 'utf-8'));
  const out = resolve(val('out', './shots'));
  mkdirSync(out, { recursive: true });
  const planFile = join(out, '截图清单.json');
  const md = ['# 截图任务清单', '', `共 ${plan.count} 张（${plan.pages} 个页面 × ${plan.count / plan.pages} 个视口）。文件名即清单里的 file 字段，截完放同目录。`, '',
    '| # | URL | 视口 | 文件名 |', '|---|---|---|---|',
    ...plan.tasks.map((t, i) => `| ${i + 1} | ${t.url} | ${t.viewport} | \`${t.file}\` |`)].join('\n');
  writeFileSync(planFile, JSON.stringify({ ...plan, outDir: out }, null, 2), 'utf-8');
  writeFileSync(join(out, '截图任务清单.md'), md + '\n', 'utf-8');
  console.log(`已生成 ${plan.count} 个截图任务（${plan.pages} 页）→ ${planFile}\n清单预览：\n${md.split('\n').slice(4, 9).join('\n')}\n…`);
  process.exit(0);
}

if (cmd === 'check') {
  const plan = JSON.parse(readFileSync(val('plan'), 'utf-8'));
  const check = checkShots(plan, val('dir'), { minBytes: Number(val('min-bytes', 10240)), maxAgeDays: Number(val('max-age-days', 30)) });
  const text = check.results.map((r) => `${r.ok ? '✅' : '❌'} ${r.file} —— ${r.reason}`).join('\n');
  if (check.extra.length) text.concat(`\n⚠ 目录里有清单外的截图：${check.extra.join(', ')}`);
  if (has('json')) console.log(JSON.stringify(check, null, 2));
  else console.log(`\n${check.stats.total} 张 · 合格 ${check.stats.ok} · 缺失 ${check.stats.missing} · 异常 ${check.stats.bad} · 清单外 ${check.stats.extra}\n${text}`);
  if (has('html')) {
    writeFileSync(val('html'), galleryHtml(check), 'utf-8');
    console.log(`画廊已写入：${val('html')}（与截图同目录打开即可看图）`);
  }
  process.exit(check.stats.ok === check.stats.total ? 0 : 1);
}
console.error('未知子命令：' + cmd);
process.exit(2);
