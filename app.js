(function(){
'use strict';
const $ = s => document.querySelector(s);
const TOTAL = DATA.length;
const CATS = ['경영','회계','재무'];
const COLOR = { '경영':'var(--c-mgmt)', '회계':'var(--c-acct)', '재무':'var(--c-fin)' };
const SUBCAT = {}; // 소분류 → 대분류
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pct = n => (n / TOTAL * 100).toFixed(1);

const tally = (arr, fn) => arr.reduce((a, r) => { const k = fn(r); if (k) a[k] = (a[k]||0)+1; return a; }, {});
const sorted = o => Object.entries(o).sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0],'ko'));

DATA.forEach(r => { SUBCAT[r[4]] = r[3]; });
const catCount = tally(DATA, r => r[3]);
const subCount = tally(DATA, r => r[4]);
const kwRows = sorted(tally(DATA.filter(r => r[5]), r => r[5]))
  .map(([k,n]) => ({
    key:k, n:n, cat:DATA.find(r => r[5]===k)[3], sub:DATA.find(r => r[5]===k)[4],
    srcs:[...new Set(DATA.filter(r => r[5]===k).map(r => r[0]))].sort(),
    grade: n>=5 ? 'S' : n>=3 ? 'A' : 'B'
  }))
  .filter(r => r.n >= 2);

/* ── 상단 스탯 ── */
$('#stats').innerHTML = [
  [TOTAL, '수합 문항'],
  [Object.keys(SOURCES).length, '복원본'],
  [Object.keys(subCount).length, '세부영역'],
  [kwRows.length, '반복 출제 테마'],
  [kwRows.filter(r => r.grade==='S').length, 'S등급 테마']
].map(([v,l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('');

/* ── 도넛 3개 ── */
$('#donuts').innerHTML = CATS.map(c => {
  const n = catCount[c], p = +pct(n), C = COLOR[c], R = 32, circ = 2*Math.PI*R;
  const subs = sorted(tally(DATA.filter(r => r[3]===c), r => r[4]));
  return `<div class="dcard ac-${c}">
    <div class="top">
      <svg width="82" height="82" viewBox="0 0 82 82" aria-hidden="true">
        <circle cx="41" cy="41" r="${R}" fill="none" stroke="var(--bg3)" stroke-width="11"/>
        <circle cx="41" cy="41" r="${R}" fill="none" stroke="${C}" stroke-width="11" stroke-linecap="round"
          stroke-dasharray="${(circ*p/100).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 41 41)"/>
      </svg>
      <div>
        <div class="pct" style="color:${C}">${p}%</div>
        <h3>${c}</h3>
        <div class="cnt">${n}문항 / ${TOTAL}</div>
      </div>
    </div>
    <ul>${subs.map(([s,v]) => `<li><span>${esc(s)}</span><b>${v}</b></li>`).join('')}</ul>
  </div>`;
}).join('');

/* ── 세부영역 바 ── */
const maxSub = Math.max(...Object.values(subCount));
$('#subbars').innerHTML = sorted(subCount).map(([s,n]) => {
  const c = SUBCAT[s];
  return `<div class="bar">
    <div class="nm">${esc(s)}</div>
    <div class="tr"><div class="fl" style="width:${(n/maxSub*100).toFixed(1)}%;background:${COLOR[c]}"></div></div>
    <div class="vl">${n}· ${pct(n)}%</div>
  </div>`;
}).join('');

/* ── 빈출 랭킹 ── */
let rankFilter = '';
const rankChips = ['전체', ...CATS, 'S등급만'];
$('#rankchips').innerHTML = rankChips.map(c =>
  `<button class="chip" data-r="${c==='전체'?'':c}" aria-pressed="${c==='전체'}">${c}</button>`).join('');
function drawRank(){
  const rows = kwRows.filter(r =>
    !rankFilter ? true : rankFilter==='S등급만' ? r.grade==='S' : r.cat===rankFilter);
  $('#rankbody').innerHTML = rows.map((r,i) => `<tr>
    <td><span class="grade g-${r.grade}">${r.grade}</span></td>
    <td style="font-weight:650">${esc(r.key)}</td>
    <td><span class="pill p-${r.cat}">${r.cat}</span></td>
    <td style="color:var(--tx2);font-size:13px">${esc(r.sub)}</td>
    <td class="num">${r.n}회</td>
    <td><div class="srcs">${r.srcs.map(s => `<span class="src" title="${esc(SOURCES[s].desc)}">${SOURCES[s].label}</span>`).join('')}</div></td>
  </tr>`).join('') || `<tr><td colspan="6" style="color:var(--tx3)">해당 없음</td></tr>`;
}
$('#rankchips').addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return;
  rankFilter = b.dataset.r;
  $('#rankchips').querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', x===b));
  drawRank();
});
drawRank();

/* ── 전체 문항 DB ── */
let dbCat = '';
$('#catchips').innerHTML = ['전체', ...CATS].map(c =>
  `<button class="chip" data-c="${c==='전체'?'':c}" aria-pressed="${c==='전체'}">${c}${c==='전체'?` ${TOTAL}`:` ${catCount[c]}`}</button>`).join('');
$('#src').insertAdjacentHTML('beforeend',
  Object.entries(SOURCES).map(([k,v]) => `<option value="${k}">${v.label} (${DATA.filter(r=>r[0]===k).length})</option>`).join(''));
$('#sub').insertAdjacentHTML('beforeend',
  sorted(subCount).map(([s,n]) => `<option value="${esc(s)}">${esc(s)} (${n})</option>`).join(''));

function drawDB(){
  const q = $('#q').value.trim().toLowerCase();
  const src = $('#src').value, sub = $('#sub').value;
  const rows = DATA.filter(r =>
    (!dbCat || r[3]===dbCat) && (!src || r[0]===src) && (!sub || r[4]===sub) &&
    (!q || (r[2]+' '+r[4]+' '+r[5]).toLowerCase().includes(q)));
  $('#dbcount').textContent = `${rows.length}문항 표시 중 (전체 ${TOTAL})`;
  $('#dbbody').innerHTML = rows.map(r => `<tr>
    <td><span class="src" title="${esc(SOURCES[r[0]].desc)}">${SOURCES[r[0]].label}·${r[1]}</span></td>
    <td style="min-width:240px">${esc(r[2])}</td>
    <td><span class="pill p-${r[3]}">${r[3]}</span></td>
    <td style="color:var(--tx2);font-size:13px;white-space:nowrap">${esc(r[4])}</td>
    <td style="color:var(--tx3);font-size:12.5px">${r[5] ? esc(r[5]) : '—'}</td>
  </tr>`).join('') || `<tr><td colspan="5" style="color:var(--tx3)">검색 결과가 없습니다.</td></tr>`;
}
$('#catchips').addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return;
  dbCat = b.dataset.c;
  $('#catchips').querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', x===b));
  drawDB();
});
['#q','#src','#sub'].forEach(s => $(s).addEventListener('input', drawDB));
drawDB();

/* ── 복원본 범례 ── */
$('#srclegend').innerHTML = `<div class="listcard" style="grid-column:1/-1">
  <h4>복원본 6종</h4>
  <ul style="list-style:none;padding:0">${Object.entries(SOURCES).map(([k,v]) => {
    const n = DATA.filter(r => r[0]===k);
    const mix = CATS.map(c => `${c} ${n.filter(r=>r[3]===c).length}`).join(' · ');
    return `<li style="padding:5px 0"><span class="src">${v.label}</span>
      <b style="margin-left:6px">${n.length}문항</b>
      <span style="color:var(--tx3)"> — ${esc(v.desc)}</span>
      <span style="color:var(--tx3);font-size:12.5px"> · ${mix}</span></li>`;
  }).join('')}</ul></div>`;
})();
