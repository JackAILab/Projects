const menuButton = document.querySelector('.menu-button');
const mobileNav = document.querySelector('#mobile-nav');

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  mobileNav.hidden = isOpen;
  document.body.classList.toggle('menu-open', !isOpen);
});

mobileNav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    menuButton.setAttribute('aria-expanded', 'false');
    mobileNav.hidden = true;
    document.body.classList.remove('menu-open');
  });
});

const metricButtons = [...document.querySelectorAll('[data-metric]')];
const metricPanels = [...document.querySelectorAll('[data-panel]')];

metricButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const metric = button.dataset.metric;
    metricButtons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    metricPanels.forEach((panel) => { panel.hidden = panel.dataset.panel !== metric; });
  });
});

const replayClips = window.evaluationReplays?.clips || [];
const replayList = document.querySelector('#replay-list');
const isChinese = document.documentElement.lang.startsWith('zh');
const methodLabels = isChinese
  ? { qwenpi_v3: '纯策略 StarVLA', qwenpi_v3_plus_gpt: '混合方法 StarVLA + GPT-6', gpt_direct: 'GPT-6 直接控制' }
  : { qwenpi_v3: 'StarVLA', qwenpi_v3_plus_gpt: 'StarVLA + GPT 6', gpt_direct: 'GPT 6 (direct)' };
const chineseTaskNames = { organize_table: '整理桌面', classify_objects_by_language: '按语言分类', imitate_sorting_sequence: '模仿排序序列', arrange_largest_number: '排列最大数字', fold_clothes: '叠衣服' };
const taskOrder = window.evaluationReplays?.tasks || [...new Set(replayClips.map((clip) => clip.task))];

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function clipFor(task, method) { return replayClips.find((clip) => clip.task === task && clip.method === method); }

function renderTaskRow(task) {
  const taskClips = replayClips.filter((clip) => clip.task === task);
  const title = (isChinese && chineseTaskNames[task]) || taskClips[0]?.title || task.replaceAll('_', ' ');
  const firstMethod = taskClips[0]?.method || 'qwenpi_v3';
  const buttons = Object.keys(methodLabels).map((method) => {
    const clip = clipFor(task, method);
    return `<button type="button" class="replay-method ${clip ? '' : 'is-empty'}" data-task="${esc(task)}" data-method="${method}" aria-pressed="${String(method === firstMethod)}" ${clip ? '' : 'disabled'}>${methodLabels[method]}${clip ? '' : '<small>No episode</small>'}</button>`;
  }).join('');
  const clip = clipFor(task, firstMethod);
  const source = clip ? `<video controls playsinline preload="metadata" poster="${clip.poster}" src="${clip.video}" aria-label="${esc(title)} ${esc(methodLabels[firstMethod])} evaluation replay"></video>` : '<div class="replay-empty">No replay available</div>';
  const usage = clip ? clip.usage : { total_tokens: 0 };
  return `<article class="replay-row" data-replay-row="${esc(task)}"><h4>${esc(title)}</h4><div class="replay-methods" role="group" aria-label="${esc(title)} control mode">${buttons}</div><figure class="replay-player">${source}<figcaption><div><strong>${esc(methodLabels[firstMethod])}</strong><span>Case ${esc(clip?.caseId || '—')} · ${clip ? `${clip.duration} s · ${clip.observations} observations` : 'No data'}</span></div>${clip ? `<a href="${clip.video}" download>Download MP4 ↗</a>` : ''}</figcaption></figure><div class="replay-details"><div class="replay-instruction"><span class="replay-label">Task instruction</span><p>${esc(clip?.instruction || 'No task record available.')}</p></div><dl class="replay-metrics"><div><dt>Control steps</dt><dd>${clip?.steps?.toLocaleString('en-US') || '—'}</dd></div><div><dt>Policy decisions</dt><dd>${clip?.decisions?.toLocaleString('en-US') || '—'}</dd></div><div><dt>GPT calls</dt><dd>${clip?.reasonerCalls?.toLocaleString('en-US') || '0'}</dd></div><div><dt>GPT tokens</dt><dd>${usage.total_tokens?.toLocaleString('en-US') || '0'}</dd></div></dl></div><details class="replay-record"><summary>Episode record</summary><p>Selected source: <code>${esc(clip?.source || 'No data')}</code></p><p>Outcome: ${esc(clip?.termination || 'No data')} · Success: ${clip?.success == null ? 'unknown' : clip.success ? 'yes' : 'no'} · Native score: ${clip?.score ?? '—'}</p><p>${clip?.reasonerCalls ? 'GPT 6 reasoning is embedded in the replay annotations.' : 'GPT 6 was not invoked in this episode.'}</p></details></article>`;
}

function updateRow(row, clip, method) {
  const video = row.querySelector('video');
  if (!video || !clip) return;
  video.pause(); video.poster = clip.poster; video.src = clip.video;
  video.setAttribute('aria-label', `${clip.title} ${methodLabels[method]} evaluation replay`); video.load();
  row.querySelector('figcaption strong').textContent = methodLabels[method];
  row.querySelector('figcaption span').textContent = `Case ${clip.caseId} · ${clip.duration} s · ${clip.observations} observations`;
  row.querySelector('figcaption a').href = clip.video;
  row.querySelector('.replay-instruction p').textContent = clip.instruction;
  const values = [clip.steps, clip.decisions, clip.reasonerCalls, clip.usage.total_tokens];
  row.querySelectorAll('.replay-metrics dd').forEach((item, index) => { item.textContent = Number(values[index] || 0).toLocaleString('en-US'); });
  const record = row.querySelector('.replay-record');
  record.querySelector('p').innerHTML = `Selected source: <code>${esc(clip.source)}</code>`;
  record.querySelectorAll('p')[1].textContent = `Outcome: ${clip.termination} · Success: ${clip.success == null ? 'unknown' : clip.success ? 'yes' : 'no'} · Native score: ${clip.score ?? '—'}`;
  record.querySelectorAll('p')[2].textContent = clip.reasonerCalls ? 'GPT 6 reasoning is embedded in the replay annotations.' : 'GPT 6 was not invoked in this episode.';
  localizeReplayRow(row, clip);
}

function localizeReplayRow(row, clip) {
  if (!isChinese || !clip) return;
  row.querySelectorAll('.replay-method small').forEach((item) => { item.textContent = '暂无案例'; });
  row.querySelector('figcaption span').textContent = `案例 ${clip.caseId} · ${clip.duration} 秒 · ${clip.observations} 次观测`;
  row.querySelector('figcaption a').textContent = '下载 MP4 ↗';
  row.querySelector('.replay-instruction .replay-label').textContent = '原始英文任务指令';
  ['控制步数', '策略决策次数', 'GPT 调用次数', 'GPT token'].forEach((label, index) => {
    row.querySelectorAll('.replay-metrics dt')[index].textContent = label;
  });
  const record = row.querySelector('.replay-record');
  record.querySelector('summary').textContent = '案例记录';
  record.querySelector('p').innerHTML = `案例来源：<code>${esc(clip.source)}</code>`;
  record.querySelectorAll('p')[1].textContent = `终止：${clip.termination} · 成功：${clip.success == null ? '未知' : clip.success ? '是' : '否'} · 原生得分：${clip.score ?? '—'}`;
  record.querySelectorAll('p')[2].textContent = clip.reasonerCalls ? '视频注释中包含 GPT-6 推理记录。' : '此案例未调用 GPT-6。';
}

if (replayList) {
  replayList.innerHTML = taskOrder.map(renderTaskRow).join('');
  if (isChinese) replayList.querySelectorAll('.replay-row').forEach((row) => {
    const clip = clipFor(row.dataset.replayRow, replayClips.find((item) => item.task === row.dataset.replayRow)?.method);
    localizeReplayRow(row, clip);
  });
  replayList.querySelectorAll('.replay-method:not([disabled])').forEach((button) => button.addEventListener('click', () => {
    const row = button.closest('.replay-row'); const clip = clipFor(button.dataset.task, button.dataset.method);
    row.querySelectorAll('.replay-method').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    updateRow(row, clip, button.dataset.method);
  }));
}


const readingProgress = document.querySelector('#reading-progress');
const readingPercent = document.querySelector('#reading-percent');
const railSession = document.querySelector('#rail-session');
const railDetail = document.querySelector('#rail-detail');
const readingSections = [...document.querySelectorAll('main section[id], main header.hero')];
const sectionNames = isChinese
  ? {abstract: '摘要', introduction: '引言', method: '方法', architecture: '系统架构', results: '实验结果', replays: '视频回放', evaluation: '评测协议', limitations: '局限与后续', roadmap: '路线图'}
  : {abstract: 'Abstract', introduction: 'Introduction', method: 'Method', architecture: 'Architecture', results: 'Results', replays: 'Video replays', evaluation: 'Evaluation', limitations: 'Limitations', roadmap: 'Roadmap'};
function updateReadingRail() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  if (readingProgress) readingProgress.style.width = `${progress * 100}%`;
  if (readingPercent) readingPercent.textContent = `${Math.round(progress * 100)}%`;
  let current = 'abstract';
  const threshold = window.scrollY + window.innerHeight * 0.28;
  readingSections.forEach((section) => { if (section.getBoundingClientRect().top + window.scrollY <= threshold && section.id) current = section.id; });
  document.querySelectorAll('#reader-sections a').forEach(a => { if (a.hash === `#${current}`) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
  if (railSession) railSession.textContent = sectionNames[current] || 'Reading';
  if (railDetail) { const index = Math.max(1, Object.keys(sectionNames).indexOf(current) + 1); railDetail.textContent = `${String(index).padStart(2, '0')} / ${String(Object.keys(sectionNames).length).padStart(2, '0')} ${isChinese ? '节' : 'sections'}`; }
}
window.addEventListener('scroll', updateReadingRail, { passive: true });
window.addEventListener('resize', updateReadingRail);
updateReadingRail();

const railToggle = document.querySelector('.rail-toggle');
railToggle?.addEventListener('click', () => {
 const expanded = railToggle.getAttribute('aria-expanded') === 'true';
 railToggle.setAttribute('aria-expanded', String(!expanded));
 document.querySelector('#reader-sections').hidden = expanded;
});
if (window.matchMedia('(max-width: 1500px)').matches) {
 railToggle?.setAttribute('aria-expanded', 'false');
 const contents = document.querySelector('#reader-sections'); if (contents) contents.hidden = true;
}
