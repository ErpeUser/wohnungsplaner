import type { FullResult, Reporter, TestCase, TestError, TestResult } from '@playwright/test/reporter';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const output = path.resolve('artifacts/visual/latest');
const escape = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
const git = (...args: string[]) => { try { return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return 'unknown'; } };
const formatError = (error: TestError) => (error.message ?? error.stack ?? 'Browser runner error').replace(/\u001b\[[0-9;]*m/g, '');

export default class VisualReporter implements Reporter {
  private startedAt = new Date().toISOString();
  private errors: string[] = [];
  private tests: { name: string; status: string; durationMs: number; screenshots: { name: string; path: string }[]; failures: string[] }[] = [];

  onError(error: TestError) { this.errors.push(formatError(error)); }

  onTestEnd(test: TestCase, result: TestResult) {
    const screenshots = result.attachments.filter((item) => item.contentType === 'image/png' && item.path).map((item) => ({ name: item.name, path: path.relative(output, item.path!).replaceAll('\\', '/') }));
    this.tests.push({ name: test.title, status: result.status, durationMs: result.duration, screenshots, failures: result.errors.map(formatError) });
  }

  async onEnd(result: FullResult) {
    const report = { startedAt: this.startedAt, finishedAt: new Date().toISOString(), commit: git('rev-parse', 'HEAD'), branch: git('branch', '--show-current'), dirty: git('status', '--porcelain').length > 0, status: result.status, errors: this.errors, tests: this.tests };
    await fs.mkdir(path.join(output, 'report'), { recursive: true });
    await fs.writeFile(path.join(output, 'report/results.json'), `${JSON.stringify(report, null, 2)}\n`);
    const sections = this.tests.map((item) => `<section><h2>${escape(item.name)}</h2><p class="${item.status}">${escape(item.status)} · ${(item.durationMs / 1000).toFixed(1)}s</p>${item.screenshots.map((shot) => `<figure><a href="../${escape(shot.path)}"><img loading="lazy" src="../${escape(shot.path)}" alt="${escape(shot.name)}"></a><figcaption>${escape(shot.name)}</figcaption></figure>`).join('')}${item.failures.map((failure) => `<pre>${escape(failure)}</pre>`).join('')}</section>`).join('');
    await fs.writeFile(path.join(output, 'report/index.html'), `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Wohnungsplaner · Visuelle Prüfung</title><style>body{font:16px system-ui;background:#f5f2ec;color:#252823;margin:30px auto;max-width:1400px;padding:0 24px}h1{font-size:30px}section{background:white;border-radius:12px;padding:24px;margin:24px 0;overflow:auto}figure{display:inline-block;width:390px;max-width:100%;margin:8px;vertical-align:top}img{width:100%;border:1px solid #ddd}figcaption{overflow-wrap:anywhere}.passed{color:#27603d}.failed,.timedOut{color:#9b3029}pre{white-space:pre-wrap}small{overflow-wrap:anywhere}</style><h1>Visuelle Prüfung · ${escape(result.status)}</h1><p><small>Commit ${escape(report.commit)} · ${escape(report.branch)}${report.dirty ? ' · lokale Änderungen' : ''}<br>${escape(report.startedAt)}</small></p><p>${this.tests.length} Prüfungen · Screenshots zeigen den aktuellen Lauf. Keine automatisch freigegebenen Referenzbilder.</p>${this.errors.map((error) => `<pre>${escape(error)}</pre>`).join('')}${sections}</html>`);
  }
}
