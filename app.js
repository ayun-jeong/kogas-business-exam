(function(){
'use strict';
const $ = s => document.querySelector(s);
/* 과목 축은 기업마다 다르다(가스공사=경영·회계·재무, 도로공사=경영·회계·경제).
   company.cats 가 있으면 그 순서를, 없으면 items 등장 순서를 따른다. */
const catsOf = c => (c.cats && c.cats.length) ? c.cats.slice()
  : [...new Set((c.items||[]).map(r => r[3]))];
const cc = i => 'c' + (i % 4);                    // 색 슬롯 (CSS --c-c0~c3)
const cvar = i => `var(--c-${cc(i)})`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const tally = (arr, fn) => arr.reduce((a,r) => { const k = fn(r); if (k) a[k]=(a[k]||0)+1; return a; }, {});
const sorted = o => Object.entries(o).sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0],'ko'));
const grade = n => n>=5 ? 'S' : n>=3 ? 'A' : 'B';

const LIST = window.COMPANIES || [];
if (!LIST.length) { document.body.innerHTML = '<div class="wrap" style="padding:60px">등록된 기업이 없습니다.</div>'; return; }

/* 회사별 파생 지표는 한 번만 계산해 캐시 */
function derive(c){
  if (c._d) return c._d;
  const items = c.items || [];
  const T = items.length;
  const subcat = {}; items.forEach(r => subcat[r[4]] = r[3]);
  const kw = sorted(tally(items.filter(r => r[5]), r => r[5]))
    .filter(([,n]) => n >= 2)
    .map(([k,n]) => {
      const hits = items.filter(r => r[5]===k);
      return { key:k, n:n, cat:hits[0][3], sub:hits[0][4], grade:grade(n),
               srcs:[...new Set(hits.map(r => r[0]))].sort() };
    });
  const cats = catsOf(c).filter(x => items.some(r => r[3]===x));
  const catIndex = {}; cats.forEach((x,i) => catIndex[x] = i);
  return (c._d = {
    items, T, subcat, kw, cats, catIndex,
    cat: tally(items, r => r[3]),
    sub: tally(items, r => r[4]),
    pct: n => T ? (n/T*100).toFixed(1) : '0.0'
  });
}

/* ───────── 기업 탭 ───────── */
function pickInitial(){
  const want = new URLSearchParams(location.search).get('c');
  return LIST.find(c => c.id===want) || LIST.find(c => (c.items||[]).length) || LIST[0];
}
let cur = pickInitial();

$('#tabs').innerHTML = LIST.map(c => {
  const n = (c.items||[]).length;
  return `<button class="tab" role="tab" data-id="${c.id}" aria-selected="${c.id===cur.id}">
    ${esc(c.tab || c.name)}<span class="tabn">${n ? n : '준비중'}</span></button>`;
}).join('');
$('#tabs').addEventListener('click', e => {
  const b = e.target.closest('.tab'); if (!b || b.dataset.id===cur.id) return;
  cur = LIST.find(c => c.id===b.dataset.id);
  rankFilter = ''; dbCat = ''; vFilter = ''; aFilter = '';   // 기업이 바뀌면 필터는 초기화
  $('#tabs').querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', t===b));
  history.replaceState(null,'', '?c='+cur.id + location.hash);
  render();
  window.scrollTo({top:0,behavior:'smooth'});
});

/* ───────── 렌더 ───────── */
let rankFilter = '', dbCat = '';

function render(){
  const d = derive(cur);
  $('#eyebrow').textContent = cur.name + ' · 전공필기 경영학';
  $('#title').innerHTML = d.T
    ? `${esc(cur.summary || '복원')}<br>통합 분석`
    : `${esc(cur.name)}<br>복원 준비 중`;
  $('#lead').innerHTML = cur.lead || '';
  $('#footnote').innerHTML = cur.footnote ? '<b>자료 출처</b> — ' + cur.footnote : '';

  if (!d.T) {
    $('#main').hidden = true; $('#stats').innerHTML = '';
    $('#empty').hidden = false;
    $('#emptyTitle').textContent = '복원 문항이 아직 없습니다';
    $('#emptyBody').innerHTML = `복원 목록을 <code>companies/${esc(cur.id)}.js</code> 의 <code>items</code> 에 넣으면 ` +
      `이 탭의 비중·랭킹·문항 DB가 자동으로 생성됩니다.`;
    return;
  }
  $('#main').hidden = false; $('#empty').hidden = true;

  renderStats(d); renderDonuts(d); renderBars(d); renderRank(d); renderAnalysis(d); renderDB(d); renderCourse(d); renderPlan(d);
}

function renderStats(d){
  $('#stats').innerHTML = [
    [d.T, '수합 문항'],
    [Object.keys(cur.sources||{}).length || '—', '복원본'],
    [Object.keys(d.sub).length, '세부영역'],
    [d.kw.length, '반복 출제 테마'],
    [d.kw.filter(r => r.grade==='S').length, 'S등급 테마']
  ].map(([v,l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('');
}

function renderDonuts(d){
  $('#donuts').innerHTML = d.cats.map(c => {
    const n = d.cat[c], p = +d.pct(n), C = cvar(d.catIndex[c]), R = 32, circ = 2*Math.PI*R;
    const subs = sorted(tally(d.items.filter(r => r[3]===c), r => r[4]));
    return `<div class="dcard ac-${cc(d.catIndex[c])}">
      <div class="top">
        <svg width="82" height="82" viewBox="0 0 82 82" aria-hidden="true">
          <circle cx="41" cy="41" r="${R}" fill="none" stroke="var(--bg3)" stroke-width="11"/>
          <circle cx="41" cy="41" r="${R}" fill="none" stroke="${C}" stroke-width="11" stroke-linecap="round"
            stroke-dasharray="${(circ*p/100).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 41 41)"/>
        </svg>
        <div><div class="pct" style="color:${C}">${p}%</div><h3>${c}</h3>
          <div class="cnt">${n}문항 / ${d.T}</div></div>
      </div>
      <ul>${subs.map(([s,v]) => `<li><span>${esc(s)}</span><b>${v}</b></li>`).join('')}</ul>
    </div>`;
  }).join('');
}

function renderBars(d){
  $('#ratioLead').innerHTML = `수합한 전 문항을 <b>${d.cats.join(' · ')}</b> ` +
    `${['','한','두','세','네'][d.cats.length] || d.cats.length} 축과 세부영역 ${Object.keys(d.sub).length}개로 나눈 결과입니다.`;
  const max = Math.max(...Object.values(d.sub));
  $('#subbars').innerHTML = sorted(d.sub).map(([s,n]) => `<div class="bar">
    <div class="nm">${esc(s)}</div>
    <div class="tr"><div class="fl" style="width:${(n/max*100).toFixed(1)}%;background:${cvar(d.catIndex[d.subcat[s]])}"></div></div>
    <div class="vl">${n}· ${d.pct(n)}%</div></div>`).join('');
  $('#ratioNote').innerHTML = cur.ratioNote ? '※ ' + cur.ratioNote : '';
}

function renderRank(d){
  const sa = d.kw.filter(r => r.n>=3), saN = sa.reduce((a,r) => a+r.n, 0);
  $('#rankSummary').innerHTML = sa.length
    ? `S·A등급 <b>${sa.length}개 테마가 전체 ${d.T}문항 중 ${saN}문항(${d.pct(saN)}%)</b>을 설명합니다.` : '';
  const once = d.T - d.kw.reduce((a,r) => a+r.n, 0);
  $('#rankNote').innerHTML = once > 0
    ? `※ 1회만 등장한 ${once}개 문항은 랭킹에서 빠져 있습니다. 전체 목록은 <a href="#db">1번 전체 문항 검색</a>에서 확인하세요.` : '';

  const chips = ['전체', ...d.cats, 'S등급만'];
  if (!chips.includes(rankFilter)) rankFilter = '';
  $('#rankchips').innerHTML = chips.map(c =>
    `<button class="chip" data-r="${c==='전체'?'':c}" aria-pressed="${(c==='전체'&&!rankFilter)||c===rankFilter}">${c}</button>`).join('');
  drawRank(d);
}
function drawRank(d){
  const rows = d.kw.filter(r => !rankFilter ? true : rankFilter==='S등급만' ? r.grade==='S' : r.cat===rankFilter);
  $('#rankbody').innerHTML = rows.map(r => `<tr>
    <td><span class="grade g-${r.grade}">${r.grade}</span></td>
    <td style="font-weight:650">${esc(r.key)}</td>
    <td><span class="pill p-${cc(d.catIndex[r.cat])}">${esc(r.cat)}</span></td>
    <td class="dim">${esc(r.sub)}</td>
    <td class="num">${r.n}회</td>
    <td><div class="srcs">${r.srcs.map(s => srcTag(s)).join('')}</div></td>
  </tr>`).join('') || `<tr><td colspan="6" class="dim">해당 없음</td></tr>`;
}
const srcTag = (k, suffix) => {
  const s = (cur.sources||{})[k];
  return `<span class="src" title="${esc(s ? s.desc : k)}">${esc(s ? s.label : k)}${suffix||''}</span>`;
};

function renderAnalysis(d){
  const groups = cur.analysis || [];
  document.getElementById('analysis').hidden = !groups.length;
  $('#analysisWrap').innerHTML = groups.map(g => {
    const n = d.cat[g.cat] || 0, ci = cc(d.catIndex[g.cat] || 0);
    return `<div class="agroup">
      <div class="ahead">
        <h3>${esc(g.cat)}<span class="pill p-${ci}">${n}문항 · ${d.pct(n)}%</span></h3>
        <p>${g.lead || ''}</p>
      </div>
      <div class="topics">${(g.topics||[]).map(t => {
        const tn = d.sub[t.name] || 0;
        return `<div class="topic ac-${ci}">
          <div class="th"><h4>${esc(t.name)}</h4><span class="cn">${tn}문항 · ${d.pct(tn)}%</span></div>
          <ul class="kw">${(t.points||[]).map(p => `<li>${p}</li>`).join('')}</ul>
          ${t.trap ? `<div class="trap">${t.trap}</div>` : ''}
        </div>`;
      }).join('')}</div>
    </div>`;
  }).join('');
}

function renderDB(d){
  const cats = d.cats;
  if (dbCat && !cats.includes(dbCat)) dbCat = '';
  $('#catchips').innerHTML = ['전체', ...cats].map(c =>
    `<button class="chip" data-c="${c==='전체'?'':c}" aria-pressed="${(c==='전체'&&!dbCat)||c===dbCat}">${c} ${c==='전체'?d.T:d.cat[c]}</button>`).join('');
  $('#src').innerHTML = '<option value="">복원본 전체</option>' +
    Object.entries(cur.sources||{}).map(([k,v]) =>
      `<option value="${esc(k)}">${esc(v.label)} (${d.items.filter(r=>r[0]===k).length})</option>`).join('');
  $('#sub').innerHTML = '<option value="">세부영역 전체</option>' +
    sorted(d.sub).map(([s,n]) => `<option value="${esc(s)}">${esc(s)} (${n})</option>`).join('');
  $('#q').value = '';
  drawDB(d);

  $('#srclegend').innerHTML = Object.keys(cur.sources||{}).length ? `<div class="listcard" style="grid-column:1/-1">
    <h4>복원본 ${Object.keys(cur.sources).length}종</h4>
    <ul style="list-style:none;padding:0">${Object.entries(cur.sources).map(([k,v]) => {
      const rows = d.items.filter(r => r[0]===k);
      const mix = cats.map(c => `${c} ${rows.filter(r=>r[3]===c).length}`).join(' · ');
      return `<li style="padding:5px 0"><span class="src">${esc(v.label)}</span>
        <b style="margin-left:6px">${rows.length}문항</b>
        <span class="dim"> — ${esc(v.desc)}</span><span class="dim" style="font-size:12.5px"> · ${mix}</span></li>`;
    }).join('')}</ul></div>` : '';
}
function drawDB(d){
  const q = $('#q').value.trim().toLowerCase(), src = $('#src').value, sub = $('#sub').value;
  const rows = d.items.filter(r =>
    (!dbCat || r[3]===dbCat) && (!src || r[0]===src) && (!sub || r[4]===sub) &&
    (!q || (r[2]+' '+r[4]+' '+r[5]).toLowerCase().includes(q)));
  $('#dbcount').textContent = `${rows.length}문항 표시 중 (전체 ${d.T})`;
  $('#dbbody').innerHTML = rows.map(r => `<tr>
    <td>${srcTag(r[0], '·'+r[1])}</td>
    <td style="min-width:240px">${esc(r[2])}</td>
    <td><span class="pill p-${cc(d.catIndex[r[3]])}">${esc(r[3])}</span></td>
    <td class="dim" style="white-space:nowrap">${esc(r[4])}</td>
    <td class="dim" style="font-size:12.5px">${r[5] ? esc(r[5]) : '—'}</td>
  </tr>`).join('') || `<tr><td colspan="5" class="dim">검색 결과가 없습니다.</td></tr>`;
}

function renderPlan(d){
  const p = cur.plan;
  document.getElementById('plan').hidden = !p;
  if (!p) return;
  $('#steps').innerHTML = (p.steps||[]).map((s,i) => `<div class="step">
    <div class="no">${i+1}</div>
    <div><h4>${esc(s.title)}</h4>${(s.body||[]).map(b => `<p>${b}</p>`).join('')}</div></div>`).join('');
  const card = (title, list, ordered) => list && list.length ? `<div class="listcard"><h4>${esc(title)}</h4>
    <${ordered?'ol':'ul'}>${list.map(x => `<li>${x}</li>`).join('')}</${ordered?'ol':'ul'}></div>` : '';
  $('#planlists').innerHTML =
    card(`꼭 외울 계산 유형 ${(p.formulas||[]).length}`, p.formulas, true) +
    card('복원으로 확인된 함정 선지', p.traps, false);
}

/* ───────── 강의 판별 ─────────
   강의 목록은 과목(subject) 단위라 등록된 모든 기관에 자동 적용된다.
   매칭: 문항의 (제목 + 세부영역 + 빈출키워드) 에 match 문자열이 하나라도 들어가면 1건.
         exclude 는 '제목' 에만 적용 — 기관마다 빈출키워드를 묶어 써서(예 '사채·복합금융상품')
         이웃 강의 문항이 딸려 오는 것을 막기 위함.
   판정은 보수적: 다른 기관에서 나온 주제는 '스킵 후보' 가 아니라 '후순위' 까지만 내린다. */
const COURSE_LIST = window.COURSES || [];
const VERDICTS = ['최우선','필수','권장','조건부','모의고사','후순위','스킵 후보'];
const VCLASS = { '최우선':'v0', '필수':'v1', '권장':'v2', '조건부':'v3', '모의고사':'v6', '후순위':'v4', '스킵 후보':'v5' };

function lecHits(course, lec, company){
  return (company.items||[]).filter(r => {
    if (r[3] !== course.subject) return false;
    if ((lec.exclude||[]).some(x => r[2].includes(x))) return false;
    const hay = r[2] + ' ' + r[4] + ' ' + (r[5] || '');
    return (lec.match||[]).some(m => hay.includes(m));
  });
}
function verdictOf(mine, others, common, peers, mock){
  if (mock) return '모의고사';          // 전범위 모의고사는 주제 매칭 대상이 아님
  if (mine >= 6) return '최우선';
  if (mine >= 3) return '필수';
  if (mine >= 1) return '권장';
  if (common)    return '조건부';
  if (others > 0) return '후순위';
  // 그 과목을 치는 기관이 하나뿐이면 '전 기관 0회'가 근거로 약하다 → 후순위까지만.
  return peers >= 2 ? '스킵 후보' : '후순위';
}
const hhmm = m => (m >= 60 ? Math.floor(m/60) + '시간 ' : '') + (m % 60) + '분';

let courseId = '', vFilter = '', aFilter = '';

function renderCourse(d){
  const mine = COURSE_LIST.filter(c => d.cats.includes(c.subject));
  const sec = document.getElementById('course');
  sec.hidden = !mine.length;
  if (!mine.length) return;
  if (!mine.some(c => c.id === courseId)) courseId = mine[0].id;
  const course = mine.find(c => c.id === courseId);

  $('#coursechips').innerHTML = mine.map(c =>
    `<button class="chip" data-course="${esc(c.id)}" aria-pressed="${c.id===courseId}" title="${esc(c.title)}">
      <span class="pill p-${cc(d.catIndex[c.subject])}">${esc(c.subject)}</span> ${esc(c.short || c.kind || '')}</button>`).join('');

  const peers = LIST.filter(x => (x.items||[]).some(r => r[3] === course.subject));
  const others = peers.filter(x => x.id !== cur.id);
  const rows = course.lectures.map(l => {
    const h = lecHits(course, l, cur);
    const o = others.map(x => ({ name: x.tab || x.name, n: lecHits(course, l, x).length }));
    const oMax = o.reduce((a,b) => Math.max(a, b.n), 0);
    return { l, h, o, v: verdictOf(h.length, oMax, l.common, peers.length, l.mock) };
  });

  const tot = rows.reduce((a,r) => a + r.l.min, 0);
  const byV = v => rows.filter(r => r.v === v);
  const minOf = a => a.reduce((s,r) => s + r.l.min, 0);
  const keep = rows.filter(r => ['최우선','필수','권장','조건부','모의고사'].includes(r.v));
  const drop = rows.filter(r => ['후순위','스킵 후보'].includes(r.v));

  $('#coursestats').innerHTML = [
    [rows.length + '강', '총 ' + hhmm(tot)],
    [byV('최우선').length + byV('필수').length + '강', '필수 이상 · ' + hhmm(minOf(byV('최우선')) + minOf(byV('필수')))],
    [byV('권장').length + byV('조건부').length + byV('모의고사').length + '강',
     '권장·조건부·모의 · ' + hhmm(minOf(byV('권장')) + minOf(byV('조건부')) + minOf(byV('모의고사')))],
    [byV('후순위').length + '강', '후순위 · ' + hhmm(minOf(byV('후순위')))],
    [byV('스킵 후보').length + '강', '스킵 후보 · ' + hhmm(minOf(byV('스킵 후보')))]
  ].map(([v,l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('');

  const solo = peers.length < 2
    ? ` <b>${esc(course.subject)}</b> 과목을 치는 기관이 ${cur.name} 하나뿐이라 한 기관의 복원만으로 판정했습니다 — 더 보수적으로 보세요.` : '';
  $('#coursesave').innerHTML = drop.length
    ? `<b>${cur.name}</b> 기준으로 <b>${drop.length}강 ${hhmm(minOf(drop))}</b>을 덜어낼 수 있습니다 ` +
      `(전체 ${hhmm(tot)}의 ${Math.round(minOf(drop)/tot*100)}%). 남는 분량은 <b>${keep.length}강 ${hhmm(minOf(keep))}</b>.` + solo
    : '덜어낼 강의가 없습니다.' + solo;

  const counts = {}; rows.forEach(r => counts[r.v] = (counts[r.v]||0) + 1);
  const avail = ['전체', ...VERDICTS.filter(v => counts[v])];
  if (vFilter && !counts[vFilter]) vFilter = '';
  $('#verdictchips').innerHTML = avail.map(v =>
    `<button class="chip" data-v="${v==='전체'?'':v}" aria-pressed="${(v==='전체'&&!vFilter)||v===vFilter}">
      ${v}${v==='전체'?` ${rows.length}`:` ${counts[v]}`}</button>`).join('');

  const areas = [...new Set(rows.map(r => r.l.area).filter(Boolean))];
  if (aFilter && !areas.includes(aFilter)) aFilter = '';
  $('#areachips').innerHTML = areas.length > 1
    ? ['전체', ...areas].map(a => {
        const g = a==='전체' ? rows : rows.filter(r => r.l.area===a);
        return `<button class="chip" data-a="${a==='전체'?'':a}" aria-pressed="${(a==='전체'&&!aFilter)||a===aFilter}">
          ${a} ${g.length}강 · ${hhmm(minOf(g))}</button>`;
      }).join('') : '';
  const shown = rows.filter(r => (!vFilter || r.v === vFilter) && (!aFilter || r.l.area === aFilter));
  $('#coursebody').innerHTML = shown.map(({l,h,o,v}) => `<tr>
    <td class="num">${l.no}강</td>
    <td style="min-width:190px">${esc(l.title)}${l.note ? `<div class="lecnote">${esc(l.note)}</div>` : ''}</td>
    <td class="num dim">${l.min}분</td>
    <td><span class="grade g-${VCLASS[v]}">${v}</span></td>
    <td style="min-width:230px">
      ${h.length ? `<b>${h.length}문항</b><div class="lecev">${h.slice(0,3).map(r => esc(r[2])).join(' · ')}${h.length>3?` 외 ${h.length-3}건`:''}</div>`
                 : '<span class="dim">0문항</span>'}</td>
    <td>${o.length ? `<div class="srcs">${o.map(x => `<span class="src">${esc(x.name)} ${x.n}</span>`).join('')}</div>` : '<span class="dim">—</span>'}</td>
  </tr>`).join('') || `<tr><td colspan="6" class="dim">해당 없음</td></tr>`;

  const hidden = COURSE_LIST.length - mine.length;
  $('#coursenote').innerHTML =
    `※ 선택한 강좌 — <b>${esc(course.title)}</b> (${rows.length}강 ${hhmm(tot)})<br>` +
    `※ 판정 기준 — <b>최우선</b> 6문항 이상 · <b>필수</b> 3~5 · <b>권장</b> 1~2 · ` +
    `<b>조건부</b> 0회지만 공기업 단골 주제 · <b>모의고사</b> 주제 매칭 대상 아님 · ` +
    `<b>후순위</b> 0회지만 다른 기관에서 출제 · <b>스킵 후보</b> 모든 기관에서 0회.` +
    (course.note ? `<br>※ ${course.note}` : '') +
    (hidden ? `<br>※ 이 기관에 없는 과목의 강의 ${hidden}개는 숨겼습니다.` : '') +
    `<br>※ 복원은 기억에 의존한 자료라 <b>0회가 "출제되지 않는다"는 뜻은 아닙니다.</b> 시간 배분 우선순위로만 쓰세요.`;
}

/* ───────── 스티키 바 높이 실측 ─────────
   상단 메뉴와 기업 탭 두 층이 겹쳐 있어서, 높이를 하드코딩하면
   폰트·화면 폭에 따라 1~2px씩 어긋나 틈이 보이고 앵커가 바 뒤로 숨는다.
   실제 높이를 재서 CSS 변수로 넘긴다. */
(function stickySync(){
  const nav = document.querySelector('nav'), bar = document.querySelector('.tabbar');
  if (!nav || !bar) return;
  const root = document.documentElement;
  const sync = () => {
    const nh = Math.round(nav.getBoundingClientRect().height);
    const bh = Math.round(bar.getBoundingClientRect().height);
    if (!nh) return;                       // 숨겨진 상태면 건너뜀
    root.style.setProperty('--nav-h', nh + 'px');
    root.style.setProperty('--sticky-h', (nh + bh) + 'px');
  };
  sync();
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(sync);
    ro.observe(nav); ro.observe(bar);
  } else {
    window.addEventListener('resize', sync);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(sync);
})();

/* ───────── 이벤트 ───────── */
$('#rankchips').addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return;
  rankFilter = b.dataset.r;
  $('#rankchips').querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', x===b));
  drawRank(derive(cur));
});
$('#catchips').addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return;
  dbCat = b.dataset.c;
  $('#catchips').querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', x===b));
  drawDB(derive(cur));
});
['#q','#src','#sub'].forEach(s => $(s).addEventListener('input', () => drawDB(derive(cur))));
$('#coursechips').addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return;
  courseId = b.dataset.course; vFilter = ''; aFilter = ''; renderCourse(derive(cur));
});
$('#verdictchips').addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return;
  vFilter = b.dataset.v; renderCourse(derive(cur));
});
$('#areachips').addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return;
  aFilter = b.dataset.a; renderCourse(derive(cur));
});

render();
})();
