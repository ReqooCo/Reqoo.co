#!/usr/bin/env node
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = 'audit-output';
mkdirSync(OUT, { recursive: true });

const pad = n => String(n).padStart(2, '0');
const groupPath = n => {
  const start = Math.floor((n - 1) / 10) * 10 + 1;
  return `SET ${pad(start)}-${pad(start + 9)}`;
};
const sampleEssay = `Pada pendapat saya, isu ini perlu ditangani dengan pelan yang jelas dan boleh diamalkan setiap hari. Murid perlu memahami tujuan tindakan yang dipilih supaya perubahan bukan sekadar dibuat untuk sementara waktu. Selain itu, ibu bapa boleh membantu dengan memantau rutin di rumah dan berbincang secara tenang tentang kemajuan yang dicapai. Guru pula boleh memberi panduan, contoh dan maklum balas yang mudah difahami. Sebagai contoh, satu sasaran kecil boleh ditetapkan pada setiap minggu dan hasilnya direkodkan. Jika sasaran belum tercapai, punca masalah perlu dikenal pasti sebelum pelan disesuaikan. Kerjasama semua pihak penting kerana setiap orang mempunyai peranan yang berbeza. Seterusnya, kemajuan boleh dinilai melalui perubahan tingkah laku, konsistensi dan kemampuan murid menjelaskan sebab sesuatu tindakan dibuat. Kesimpulannya, perubahan yang baik memerlukan disiplin, sokongan dan penilaian berkala agar manfaatnya dapat dikekalkan untuk jangka masa panjang.`;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function waitForServer(proc) {
  for (let i = 0; i < 60; i++) {
    if (proc.exitCode !== null) throw new Error(`Static server exited with code ${proc.exitCode}`);
    try {
      const r = await fetch(`${BASE}/sim/pksk/simulator/index.html`);
      if (r.ok) return;
    } catch (_) {}
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('Static server did not become ready');
}

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', '.'], {
  stdio: ['ignore', 'pipe', 'pipe']
});
let serverErr = '';
server.stderr.on('data', d => { serverErr += d.toString(); });

const report = {
  version: 'PKSK_SIMULATOR_SMOKE_50SETS_V1',
  startedAt: new Date().toISOString(),
  sets: [],
  pass: false,
  errors: []
};

let browser;
try {
  await waitForServer(server);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => {
    localStorage.setItem('reqoo_pksk_license', 'SMOKE-TEST-LICENSE');
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e?.message || e)));
  page.on('dialog', async d => { await d.accept(); });

  await page.route('**/api/pksk', async route => {
    let body = {};
    try { body = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
    const action = body.action;
    let payload = { ok: true };
    if (action === 'reviewWritingAI') {
      payload = {
        ok: true,
        review: {
          summary: 'Semakan AI smoke test berjaya.',
          strengths: ['Isi berkaitan tajuk dikesan.'],
          improvements: ['Teruskan huraian dengan contoh.'],
          nextSteps: ['Semak semula bahasa dan struktur.'],
          disclaimer: 'Respons mock untuk ujian simulator.'
        }
      };
    } else if (action === 'reviewQuestionAI') {
      payload = {
        ok: true,
        review: {
          explanation: 'Penerangan smoke test berjaya.',
          workingSteps: ['Kenal pasti maklumat penting.', 'Semak pilihan dengan jawapan betul.'],
          tip: 'Baca kehendak soalan sebelum memilih jawapan.',
          disclaimer: 'Respons mock untuk ujian simulator.'
        }
      };
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload)
    });
  });

  for (let setNo = 1; setNo <= 50; setNo++) {
    const setTag = pad(setNo);
    const file = join('sim', 'pksk', 'simulator', 'sets', groupPath(setNo), 'data', `set${setTag}.json`);
    const data = JSON.parse(readFileSync(file, 'utf8'));
    const A = data.questions.filter(q => q.section === 'BAHAGIAN A');
    const B = data.questions.filter(q => q.section === 'BAHAGIAN B');
    assert(data.questions.length === 100, `Set ${setTag}: expected 100 A+B questions`);
    assert(A.length === 30, `Set ${setTag}: expected 30 A questions`);
    assert(B.length === 70, `Set ${setTag}: expected 70 B questions`);
    assert(Array.isArray(data.writing) && data.writing.length === 3, `Set ${setTag}: expected 3 C prompts`);
    const visualIndex = data.questions.findIndex(q => q.visual);
    assert(visualIndex >= 0, `Set ${setTag}: expected at least one visual question`);

    pageErrors.length = 0;
    await page.goto(`${BASE}/sim/pksk/simulator/?set=${setNo}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#start:not(.hidden)');
    assert((await page.locator('#setSelect').inputValue()) === String(setNo), `Set ${setTag}: selector did not load requested set`);
    assert((await page.locator('#start .set-label').innerText()).includes(setTag), `Set ${setTag}: start label mismatch`);

    await page.click('#startABBtn');
    await page.waitForSelector('#briefing:not(.hidden)');
    await page.click('#count .start-btn');
    await page.waitForSelector('#exam:not(.hidden)');
    assert((await page.locator('#qnum').innerText()).includes('Soalan 1 daripada 100'), `Set ${setTag}: AB did not start at question 1`);
    assert(await page.locator('#grid button').count() === 100, `Set ${setTag}: question navigator count mismatch`);
    assert(/^\d{2}:\d{2}$/.test(await page.locator('#timer').innerText()), `Set ${setTag}: AB timer not rendering`);

    await page.locator('#opts input').first().check();
    assert((await page.locator('#answeredCount').innerText()).startsWith('1 / 100'), `Set ${setTag}: answer was not recorded`);
    await page.click('#nextBtn');
    assert((await page.locator('#qnum').innerText()).includes('Soalan 2 daripada 100'), `Set ${setTag}: next navigation failed`);
    await page.click('#prevBtn');
    assert((await page.locator('#qnum').innerText()).includes('Soalan 1 daripada 100'), `Set ${setTag}: back navigation failed`);
    assert(await page.locator('#opts input:checked').count() === 1, `Set ${setTag}: answer state did not survive back navigation`);

    const localSaved = await page.evaluate(() => {
      const key = Object.keys(localStorage).find(k => k.includes(':set:') && k.endsWith(String(localStorage.getItem('pksk-selected-set') || '').padStart(2, '0')));
      if (!key) return false;
      try { return Object.keys(JSON.parse(localStorage.getItem(key) || '{}').answers || {}).length >= 1; } catch (_) { return false; }
    });
    assert(localSaved, `Set ${setTag}: local answer save failed`);

    await page.evaluate(i => window.gotoQ(i), visualIndex);
    assert((await page.locator('#qvisual').innerHTML()).trim().length > 0, `Set ${setTag}: visual renderer produced empty output`);
    const img = page.locator('#qvisual img').first();
    if (await img.count()) {
      const ok = await img.evaluate(el => el.complete && el.naturalWidth > 0);
      assert(ok, `Set ${setTag}: visual image failed to load`);
    }

    await page.evaluate(() => window.gotoQ(99));
    await page.locator('#opts input').first().check();
    await page.click('#nextBtn');
    await page.waitForFunction(() => document.getElementById('briefingTitle')?.textContent?.includes('Bahagian C'));
    await page.click('#count .start-btn');
    await page.waitForSelector('#writing:not(.hidden)');
    assert(await page.locator('#topics .topic').count() === 3, `Set ${setTag}: C topic count mismatch`);
    assert(/^\d{2}:\d{2}$/.test(await page.locator('#wTimer').innerText()), `Set ${setTag}: C timer not rendering`);

    await page.locator('#topics .topic').nth(1).click();
    await page.fill('#essay', sampleEssay);
    await page.dispatchEvent('#essay', 'input');
    const words = Number((await page.locator('#wordCount').innerText()).match(/\d+/)?.[0] || 0);
    assert(words >= 100, `Set ${setTag}: C word counter failed`);
    assert((await page.locator('#minStatus').innerText()).includes('Minimum dicapai'), `Set ${setTag}: C minimum status failed`);

    await page.click('#writing .editor-foot .primary');
    await page.waitForSelector('#result:not(.hidden)');
    assert(await page.locator('#summary .stat').count() === 6, `Set ${setTag}: result summary incomplete`);
    assert(await page.locator('#reviewB .review-item').count() === 70, `Set ${setTag}: B review count mismatch`);
    await page.waitForFunction(() => document.getElementById('completionStatus')?.textContent?.includes('Set disimpan'));

    const qAi = page.locator('.ai-review-btn[data-question-id]').first();
    assert(await qAi.count() === 1, `Set ${setTag}: question AI review button missing`);
    await qAi.click();
    await page.waitForFunction(() => document.querySelector('.ai-review-output')?.textContent?.includes('Penerangan smoke test berjaya.'));

    const wAi = page.locator('#aiWritingReview');
    assert(await wAi.count() === 1, `Set ${setTag}: writing AI review button missing`);
    await wAi.click();
    await page.waitForFunction(() => document.getElementById('aiWritingOutput')?.textContent?.includes('Semakan AI smoke test berjaya.'));

    assert(pageErrors.length === 0, `Set ${setTag}: page errors: ${pageErrors.join(' | ')}`);
    report.sets.push({ set: setNo, A: A.length, B: B.length, C: data.writing.length, visualIndex: visualIndex + 1, pass: true });
    console.log(`SMOKE PASS SET ${setTag}`);
  }

  assert(report.sets.length === 50, 'Expected all 50 sets to complete smoke test');
  report.pass = true;
  report.completedAt = new Date().toISOString();
  writeFileSync(join(OUT, 'pksk_simulator_smoke_50sets.json'), JSON.stringify(report, null, 2));
  console.log('PKSK SIMULATOR 50-SET SMOKE PASS');
} catch (err) {
  report.errors.push(String(err?.stack || err));
  report.completedAt = new Date().toISOString();
  writeFileSync(join(OUT, 'pksk_simulator_smoke_50sets.json'), JSON.stringify(report, null, 2));
  if (browser) {
    try {
      const pages = browser.contexts().flatMap(c => c.pages());
      if (pages[0]) await pages[0].screenshot({ path: join(OUT, 'pksk_simulator_smoke_failure.png'), fullPage: true });
    } catch (_) {}
  }
  console.error(err);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  server.kill('SIGTERM');
  if (serverErr.trim()) console.error(serverErr.trim());
}
