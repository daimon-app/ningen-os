/* ============================================================
   人間OS メカニズム辞典 - app.js
   ------------------------------------------------------------
   ★ このファイルは「器（ロジック・UI）」。
     300項目への拡張は mechanisms.js / books.js の追加のみで対応する
     設計になっている。ここを触る必要は基本的にない。
   ★ カテゴリ / 本マップ / 一手モードは汎用データ構造なので、
     将来「営業OS」など別アプリへ分岐する場合も、
     mechanisms.js / books.js / SITUATIONS / ACTIONS / DAIMON_MAP
     を入れ替えるだけで横展開できる。
   ★ MECHANISMS / CATEGORIES / IMPORTANCE は mechanisms.js
     BOOKS は books.js から読み込まれるグローバル変数。
============================================================ */

/* ---------------- localStorage キー ---------------- */
const LS_FAV    = 'jinkan_favorites';
const LS_RECENT = 'jinkan_recent';
const LS_LOG    = 'jinkan_log';
const LS_TODAY  = 'jinkan_today_target';

/* ---------------- safe localStorage ---------------- */
function lsGet(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    if(raw==null) return fallback;
    const v = JSON.parse(raw);
    return v==null ? fallback : v;
  }catch(e){ return fallback; }
}
function lsSet(key, value){
  try{ localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch(e){ return false; }
}

/* ---------------- 重要度の表示順 ---------------- */
const IMP_ORDER = ['S','A','B','C'];

/* ---------------- 応用フィルター（辞典カードの補足表示切替） ---------------- */
const APP_FILTERS = [
  {key:'all', label:'全部', field:null},
  {key:'work', label:'仕事', field:'workExample'},
  {key:'investment', label:'投資', field:'investmentExample'},
  {key:'romance', label:'恋愛', field:'romanceExample'},
  {key:'daimon', label:'DAIMON', field:'daimonUse'},
];

/* ============================================================
   一手モード: 状況 / 一手 / DAIMON転用マップ
   ★ mechIds は MECHANISMS に存在するIDのみ書く前提。
     filterExisting() で実在チェックするので、存在しなくても
     落ちないが表示上は何も出ない（崩れない構造）。
============================================================ */
const SITUATIONS = [
  {id:'craving', label:'吸いたい・飲みたい・食べたい',
    note:'報酬系とホメオスタシスが同時に動いている。今だけの反応。',
    mechIds:['reward_system','homeostasis','delay_discounting']},
  {id:'phone', label:'スマホを見たい',
    note:'期待が先に脳を動かしてる。トリガーへの反応かもしれない。',
    mechIds:['dopamine_prediction','variable_reward','trigger']},
  {id:'buy', label:'買いたくなる',
    note:'希少性か即時報酬が、判断より先にスピードを求めてる。',
    mechIds:['scarcity','immediate_reward','endowment_effect']},
  {id:'trade_loss', label:'損切りできない',
    note:'損失回避とサンクコストが見切りを止めてる。ラインは出てる。',
    mechIds:['loss_aversion','sunk_cost','endowment_effect']},
  {id:'anger', label:'イライラする',
    note:'矛盾を整えようとして出てきた反応。敵ではない。',
    mechIds:['cognitive_dissonance','framing']},
  {id:'read_status', label:'既読や反応が気になる',
    note:'反応への期待が、結果より先に脳を動かしてるだけ。',
    mechIds:['dopamine_prediction','variable_reward','mere_exposure']},
  {id:'compare', label:'人と比較して不安',
    note:'周りの動きに、自分の基準が引っ張られてるだけ。',
    mechIds:['social_proof','status_need','mere_exposure']},
  {id:'lazy', label:'だるい・動きたくない',
    note:'省エネと現状維持。これは仕様であって欠陥じゃない。',
    mechIds:['homeostasis','status_quo_bias','friction_cost']},
  {id:'heavy_work', label:'仕事の段取りが重い',
    note:'頭の容量が一時的に圧迫されてるだけ。能力の問題じゃない。',
    mechIds:['cognitive_load','decision_fatigue']},
  {id:'procrastinate', label:'先延ばししたい',
    note:'未来の価値が、今より小さく見えてるだけ。',
    mechIds:['delay_discounting','immediate_reward','status_quo_bias']},
  {id:'anger_at_person', label:'人に腹が立つ',
    note:'見方ひとつで印象が変わる場面。一旦フレームを置く。',
    mechIds:['framing','cognitive_dissonance','halo_effect']},
  {id:'attracted', label:'女性が気になる',
    note:'愛着と単純接触の力が、同時に強く働いてるだけ。',
    mechIds:['attachment_system','mere_exposure','dopamine_prediction']},
  {id:'loneliness', label:'孤独感が来る',
    note:'所属と愛着の欲求が出てきてる。誰にでも来る反応。',
    mechIds:['belonging_need','attachment_system']},
  {id:'low_confidence', label:'自信がない',
    note:'判断力が一時的に落ちてるだけで、能力の話じゃない。',
    mechIds:['self_efficacy','decision_fatigue','metacognition']},
];

const ACTIONS = [
  {id:'later', label:'後でええやろ',
    desc:'やってもいい。でも今じゃなくていい。',
    confirm:'選んだ。今は反応に流された側じゃない。'},
  {id:'water', label:'水を飲む',
    desc:'コップ1杯で、反応と行動の間に一呼吸を作る。',
    confirm:'飲んだ。それだけで反応は少し弱くなる。'},
  {id:'move', label:'場所を変える',
    desc:'立つ・歩く・移動するだけで、トリガーから離れる。',
    confirm:'動いた。場所が変われば反応も変わる。'},
  {id:'tomorrow_note', label:'明日の一手に書く',
    desc:'今やらなくていい。一手箱に書いて今日は終わりにする。',
    confirm:'書いた。それだけ頭は軽くなる。'},
  {id:'return_action', label:'戻る一手を1個やる',
    desc:'できることを1個だけ。これが再起動のスイッチになる。',
    confirm:'やった。それが証拠になる。'},
  {id:'breathe', label:'3分だけ目を閉じる',
    desc:'何もしない3分間で、反応の勢いをやり過ごす。',
    confirm:'3分、ちゃんと止まれた。'},
  {id:'protein', label:'プロテインを飲む',
    desc:'体に必要な栄養を入れて、別の満足を与える。',
    confirm:'入れた。これも一つの戻る一手。'},
  {id:'bath', label:'風呂に入る',
    desc:'場面ごと切り替えて、反応をリセットする。',
    confirm:'切り替えた。今日はもうこれでいい。'},
  {id:'put_phone', label:'スマホを置く',
    desc:'物理的に距離を作って、摩擦コストを上げる。',
    confirm:'置いた。距離ができれば反応も静まる。'},
  {id:'ittebako', label:'一手箱に預ける',
    desc:'その場で処理せず、箱に預けて外に出す。',
    confirm:'預けた。今は持たなくていい。'},
];

const DAIMON_MAP = [
  {id:'tomorrow_action', name:'明日の一手',
    desc:'今すぐ動かなくても、次にやることだけ先に決めておく。',
    mechIds:['cognitive_load','decision_fatigue','implementation_intention']},
  {id:'return_action', name:'戻る一手',
    desc:'崩れた状態から、いつもの整った自分へ戻すスイッチ。',
    mechIds:['homeostasis','reward_system']},
  {id:'evidence', name:'証拠回収',
    desc:'小さな「できた」を記録として残し、自己効力感に変換する。',
    mechIds:['self_efficacy','small_win']},
  {id:'site_break_switch', name:'現場休憩スイッチ',
    desc:'休憩というトリガーに、戻る一手という行動を結びつける。',
    mechIds:['trigger','implementation_intention','environment_design']},
  {id:'ittebako', name:'一手箱',
    desc:'思考をその場で処理せず、外に置くことで頭を軽くする。',
    mechIds:['cognitive_load','implementation_intention']},
  {id:'kanjobako', name:'感情箱',
    desc:'感情に名前を貼って、観察の対象として外に置く。',
    mechIds:['labeling_effect','metacognition']},
  {id:'atode_eeyaro_daimon', name:'後でええやろ',
    desc:'欲求を許可して、今だけ遅らせる。否定しない衝動サーフィン。',
    mechIds:['atode_eeyaro','immediate_reward','homeostasis']},
  {id:'jinkan_os_jiten', name:'人間OS辞典',
    desc:'反応に名前を貼り、観察し、選択するための基礎ライブラリー。',
    mechIds:['metacognition','labeling_effect']},
];

/* ---------------- アプリ状態 ---------------- */
const state = {
  view: 'dict',
  dict: {cat:'all', imp:'all', q:'', favOnly:false, app:'all'},
  itte: {step:1, situationId:null, action:null, saved:false},
  map:  {subtab:'books', bookId:null},
  more: {subtab:'fav', logFormOpen:false},
  detailStack: [],
};

/* ============================================================
   ユーティリティ
============================================================ */
function escapeHtml(str){
  if(str==null) return '';
  return String(str).replace(/[&<>"']/g, ch=>({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;',
  })[ch]);
}
function pad2(n){ return String(n).padStart(2,'0'); }
function dateKey(d){ return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function formatDate(d){
  const w = ['日','月','火','水','木','金','土'];
  return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日（${w[d.getDay()]}）`;
}

/* ============================================================
   データヘルパー（本↔メカニズムの双方向リンクはここで吸収する）
============================================================ */
function findMechanism(id){ return MECHANISMS.find(m=>m.id===id) || null; }
function existsM(id){ return !!findMechanism(id); }
function filterExisting(ids){ return (ids||[]).filter(existsM); }

/* メカニズム→関連本（mechanism.books と BOOKS.mechanismIds のOR） */
function getBooksForMechanism(mechId){
  const m = findMechanism(mechId);
  const fromM = (m && m.books) || [];
  const fromB = BOOKS.filter(b=>(b.mechanismIds||[]).includes(mechId)).map(b=>b.id);
  const ids = [...new Set([...fromM, ...fromB])];
  return ids.map(id=>BOOKS.find(b=>b.id===id)).filter(Boolean);
}
/* 本→含まれるメカニズム（実在するものだけ。BOOKS.mechanismIds と
   mechanism.books のOR、どちらかにIDがあれば表示対象になる） */
function getMechanismsForBook(bookId){
  const book = BOOKS.find(b=>b.id===bookId);
  if(!book) return [];
  const fromBook = book.mechanismIds || [];
  const fromM = MECHANISMS.filter(m=>(m.books||[]).includes(bookId)).map(m=>m.id);
  const ids = [...new Set([...fromBook, ...fromM])];
  return ids.map(findMechanism).filter(Boolean);
}
/* 本の収録予定数（未実装IDも含む）と、現在実在する数 */
function getBookPlannedCount(bookId){
  const book = BOOKS.find(b=>b.id===bookId);
  if(!book) return {collected:0, total:0};
  const fromBook = book.mechanismIds || [];
  const fromM = MECHANISMS.filter(m=>(m.books||[]).includes(bookId)).map(m=>m.id);
  const total = new Set([...fromBook, ...fromM]).size;
  const collected = getMechanismsForBook(bookId).length;
  return {collected, total};
}
/* 今日のメカニズム（日付ベースで決定的に1件選ぶ） */
function getTodayMechanism(){
  const key = dateKey(new Date());
  let hash = 0;
  for(let i=0;i<key.length;i++){ hash = (hash*31 + key.charCodeAt(i)) >>> 0; }
  return MECHANISMS[hash % MECHANISMS.length];
}

/* ============================================================
   localStorage 操作
============================================================ */
function toggleFavorite(id){
  let favs = lsGet(LS_FAV, []);
  favs = favs.includes(id) ? favs.filter(f=>f!==id) : [...favs, id];
  lsSet(LS_FAV, favs);
}
function addRecent(id){
  let recent = lsGet(LS_RECENT, []).filter(r=>r!==id);
  recent.unshift(id);
  lsSet(LS_RECENT, recent.slice(0,10));
}
function addLogEntry(data){
  const log = lsGet(LS_LOG, []);
  const now = new Date();
  log.push({
    id: 'log_' + now.getTime() + '_' + Math.random().toString(36).slice(2,7),
    date: dateKey(now),
    time: `${pad2(now.getHours())}:${pad2(now.getMinutes())}`,
    mechanismId: data.mechanismId || null,
    mechanismName: data.mechanismName || '',
    note: data.note || '',
    source: data.source || 'manual',
    situationLabel: data.situationLabel || '',
    actionLabel: data.actionLabel || '',
  });
  lsSet(LS_LOG, log);
}

/* ============================================================
   チップ共通 / カード共通
============================================================ */
function chipHtml(key, label, active, color, count){
  const style = (active && color) ? ` style="background:${color}"` : '';
  const countHtml = (count==null) ? '' : `<span class="chip-count">${count}</span>`;
  return `<button class="chip ${active?'active':''}" data-key="${escapeHtml(key)}"${style} type="button">${escapeHtml(label)}${countHtml}</button>`;
}
function entryCardHtml(m, isFav, appFilter){
  const imp = IMPORTANCE[m.importance] || {label:m.importance, color:'#a99878'};
  const cat = CATEGORIES[m.category] || {label:m.category, color:'#a99878'};
  const tags = (m.tags||[]).slice(0,3).map(t=>`<span class="entry-tag">${escapeHtml(t)}</span>`).join('');
  const filter = APP_FILTERS.find(f=>f.key===appFilter) || APP_FILTERS[0];
  let subText = m.oneLine;
  let subLabel = '';
  if(filter.field && m[filter.field]){
    subText = m[filter.field];
    subLabel = `<span class="entry-app-label">${escapeHtml(filter.label)}</span>`;
  }
  return `
  <div class="entry-card" data-id="${m.id}">
    <div class="entry-main">
      <div class="entry-top-row">
        <span class="imp-badge" style="background:${imp.color}">${escapeHtml(imp.label)}</span>
        <span class="cat-dot" style="background:${cat.color}"></span>
        <span class="cat-label">${escapeHtml(cat.label)}</span>
      </div>
      <div class="entry-name">${escapeHtml(m.name)}</div>
      <div class="entry-oneline">${subLabel}${escapeHtml(subText)}</div>
      <div class="entry-tags">${tags}</div>
    </div>
    <div class="entry-fav ${isFav?'active':''}" data-id="${m.id}">${isFav?'★':'☆'}</div>
  </div>`;
}
function bindEntryCardEvents(container, onChange){
  container.querySelectorAll('.entry-card').forEach(el=>{
    el.addEventListener('click', (e)=>{
      if(e.target.closest('.entry-fav')) return;
      openDetail(el.dataset.id);
    });
  });
  container.querySelectorAll('.entry-fav').forEach(el=>{
    el.addEventListener('click', (e)=>{
      e.stopPropagation();
      toggleFavorite(el.dataset.id);
      onChange && onChange();
    });
  });
}

/* ============================================================
   1. 辞典
============================================================ */

/* ---------------- 自然文検索（あいまい一致） ---------------- */
function normalizeText(s){
  return (s||'').toLowerCase().replace(/\s+/g,'');
}
function bigrams(s){
  s = normalizeText(s);
  if(s.length < 2) return s ? [s] : [];
  const out = [];
  for(let i=0; i<s.length-1; i++) out.push(s.substr(i,2));
  return out;
}
function bigramOverlap(query, target){
  const qg = bigrams(query), tg = bigrams(target);
  if(qg.length===0 || tg.length===0) return 0;
  const tset = new Set(tg);
  let hit = 0;
  qg.forEach(g=>{ if(tset.has(g)) hit++; });
  return hit / qg.length;
}
// メカニズム1件に対する検索スコア。
// ・名前/読み/一言/タグに完全に文字列が含まれる → 強いスコア(+8)
// ・aliases（自然文の言い回し）に部分一致 → 最強スコア(+10)
// ・aliasesとのbigram類似度（最大値） → 中スコア(最大+6)
// ・説明文・各応用例とのbigram類似度（最大値） → 弱スコア(最大+2)
// ・関連メカニズム名/関連本の名前に完全一致 → 補助スコア(+3)
function scoreMechanism(m, query){
  const q = normalizeText(query);
  if(!q) return 0;
  let score = 0;

  const core = [m.name, m.kana, m.oneLine, ...(m.tags||[])];
  core.forEach(f=>{
    if(f && normalizeText(f).includes(q)) score += 8;
  });

  let aliasExact = 0, aliasMax = 0;
  (m.aliases||[]).forEach(a=>{
    if(normalizeText(a).includes(q)) aliasExact = Math.max(aliasExact, 10);
    aliasMax = Math.max(aliasMax, bigramOverlap(q, a));
  });
  score += aliasExact + aliasMax * 6;

  const broad = [
    m.shortDescription, m.fullDescription, m.everydayExample,
    m.workExample, m.investmentExample, m.romanceExample,
    m.teppeiExample, m.daimonUse,
  ].filter(Boolean);
  let broadMax = 0;
  broad.forEach(f=>{ broadMax = Math.max(broadMax, bigramOverlap(q, f)); });
  score += broadMax * 2;

  const relNames = [
    ...getBooksForMechanism(m.id).map(b=>b.name),
    ...filterExisting(m.relatedMechanisms).map(id=>findMechanism(id).name),
  ];
  relNames.forEach(n=>{
    if(n && normalizeText(n).includes(q)) score += 3;
  });

  return score;
}
function importanceCategoryCompare(a, b){
  const ai = IMP_ORDER.indexOf(a.importance), bi = IMP_ORDER.indexOf(b.importance);
  if(ai!==bi) return ai-bi;
  const ac = (CATEGORIES[a.category]||{order:99}).order;
  const bc = (CATEGORIES[b.category]||{order:99}).order;
  if(ac!==bc) return ac-bc;
  return (a.kana||a.name).localeCompare(b.kana||b.name, 'ja');
}
function getFilteredMechanisms(){
  const {cat, imp, q, favOnly} = state.dict;
  const favs = lsGet(LS_FAV, []);
  let items = MECHANISMS.filter(m=>{
    if(cat!=='all' && m.category!==cat) return false;
    if(imp!=='all' && m.importance!==imp) return false;
    if(favOnly && !favs.includes(m.id)) return false;
    return true;
  });
  const query = q.trim();
  if(query){
    items = items
      .map(m=>({m, score: scoreMechanism(m, query)}))
      .filter(x=>x.score > 1)
      .sort((a,b)=> (b.score - a.score) || importanceCategoryCompare(a.m, b.m))
      .map(x=>x.m);
  } else {
    items = items.sort(importanceCategoryCompare);
  }
  return items;
}
function renderCatChips(){
  const row = document.getElementById('cat-chip-row');
  const cats = Object.entries(CATEGORIES).sort((a,b)=>a[1].order-b[1].order);
  let html = chipHtml('all','すべて', state.dict.cat==='all', null, MECHANISMS.length);
  cats.forEach(([key,info])=>{
    const count = MECHANISMS.filter(m=>m.category===key).length;
    html += chipHtml(key, info.label, state.dict.cat===key, info.color, count);
  });
  row.innerHTML = html;
  row.querySelectorAll('.chip').forEach(el=>{
    el.addEventListener('click', ()=>{
      state.dict.cat = el.dataset.key;
      renderCatChips(); renderEntryList(); renderDictMeta();
    });
  });
}
function renderImpChips(){
  const row = document.getElementById('imp-chip-row');
  let html = chipHtml('all','すべて', state.dict.imp==='all', null, MECHANISMS.length);
  IMP_ORDER.forEach(key=>{
    const info = IMPORTANCE[key];
    const count = MECHANISMS.filter(m=>m.importance===key).length;
    html += chipHtml(key, `${info.label}・${info.desc}`, state.dict.imp===key, info.color, count);
  });
  row.innerHTML = html;
  row.querySelectorAll('.chip').forEach(el=>{
    el.addEventListener('click', ()=>{
      state.dict.imp = el.dataset.key;
      renderImpChips(); renderEntryList(); renderDictMeta();
    });
  });
}
function renderAppChips(){
  const row = document.getElementById('app-chip-row');
  if(!row) return;
  row.innerHTML = APP_FILTERS.map(f=>
    chipHtml(f.key, f.label, state.dict.app===f.key, null, null)
  ).join('');
  row.querySelectorAll('.chip').forEach(el=>{
    el.addEventListener('click', ()=>{
      state.dict.app = el.dataset.key;
      renderAppChips(); renderEntryList();
    });
  });
}
function renderRecentRow(){
  const wrap = document.getElementById('recent-wrap');
  const row = document.getElementById('recent-row');
  const recent = lsGet(LS_RECENT, []).filter(existsM);
  if(recent.length===0){ wrap.hidden = true; row.innerHTML=''; return; }
  wrap.hidden = false;
  row.innerHTML = recent.map(id=>{
    const m = findMechanism(id);
    return `<div class="recent-chip" data-id="${id}">${escapeHtml(m.name)}</div>`;
  }).join('');
  row.querySelectorAll('.recent-chip').forEach(el=>{
    el.addEventListener('click', ()=>openDetail(el.dataset.id));
  });
}
function renderEntryList(){
  const list = document.getElementById('entry-list');
  const items = getFilteredMechanisms();
  if(items.length===0){
    list.innerHTML = `<div class="entry-empty">該当する項目はまだありません。<br>今後のデータ追加（mechanisms.js）で増えていきます。</div>`;
    return;
  }
  const favs = lsGet(LS_FAV, []);
  list.innerHTML = items.map(m=>entryCardHtml(m, favs.includes(m.id), state.dict.app)).join('');
  bindEntryCardEvents(list, renderEntryList);
}
function renderDictMeta(){
  const meta = document.getElementById('dict-meta');
  const items = getFilteredMechanisms();
  meta.textContent = `${items.length}件 / 全${MECHANISMS.length}件`;
}

/* ============================================================
   2. 今日
============================================================ */
function renderToday(){
  document.getElementById('today-date').textContent = formatDate(new Date());
  const m = getTodayMechanism();
  const hero = document.getElementById('today-hero');
  hero.innerHTML = `
    <div class="today-label">TODAY'S MECHANISM</div>
    <div class="today-name">${escapeHtml(m.name)}</div>
    <div class="today-oneline">${escapeHtml(m.oneLine)}</div>
    <div class="today-short">${escapeHtml(m.shortDescription)}</div>
  `;
  const actions = document.getElementById('today-actions');
  actions.innerHTML = `
    <button class="btn-secondary" id="today-detail-btn" type="button">詳細を見る</button>
    <button class="btn-primary" id="today-find-btn" type="button">今日これを現場で探す</button>
  `;
  document.getElementById('today-detail-btn').addEventListener('click', ()=>openDetail(m.id));
  document.getElementById('today-find-btn').addEventListener('click', ()=>{
    lsSet(LS_TODAY, {date: dateKey(new Date()), mechanismId: m.id, found:false, note:''});
    renderTodayFound();
  });
  renderTodayFound();
}
function renderTodayFound(){
  const box = document.getElementById('today-found');
  const target = lsGet(LS_TODAY, null);
  const todayKey = dateKey(new Date());
  if(!target || target.date!==todayKey){ box.innerHTML=''; return; }
  const m = findMechanism(target.mechanismId);
  if(!m){ box.innerHTML=''; return; }
  if(target.found){
    box.innerHTML = `
      <div class="itte-note-box">
        <strong>見つけた ✓ ${escapeHtml(m.name)}</strong>
        ${target.note ? `<br><br>${escapeHtml(target.note)}` : ''}
      </div>`;
    return;
  }
  box.innerHTML = `
    <div class="form-label">現場で見つけたら、一言メモ（任意）</div>
    <textarea class="itte-textarea" id="today-note" placeholder="例：返報性 - 現場でコーヒーを渡したら空気が良くなった"></textarea>
    <button class="btn-secondary" id="today-save-btn" type="button">見つけた、記録する</button>
  `;
  document.getElementById('today-save-btn').addEventListener('click', ()=>{
    const note = document.getElementById('today-note').value.trim();
    target.found = true; target.note = note;
    lsSet(LS_TODAY, target);
    addLogEntry({mechanismId:m.id, mechanismName:m.name, note, source:'today'});
    renderTodayFound();
  });
}

/* ============================================================
   3. 一手モード（状況→発動メカニズム→一歩引く→一手→証拠回収）
============================================================ */
function renderItte(){
  document.querySelectorAll('#step-dots .dot').forEach((d,i)=>{
    d.classList.toggle('active', i===(state.itte.step-1));
  });
  const content = document.getElementById('itte-content');
  const step = state.itte.step;
  if(step===1) content.innerHTML = itteStep1Html();
  else if(step===2) content.innerHTML = itteStep2Html();
  else if(step===3) content.innerHTML = itteStep3Html();
  else if(step===4) content.innerHTML = itteStep4Html();
  else content.innerHTML = itteStep5Html();
  bindItteEvents();
}
function itteStep1Html(){
  const items = SITUATIONS.map(s=>
    `<button class="itte-btn" data-id="${s.id}" type="button">${escapeHtml(s.label)}</button>`
  ).join('');
  return `<div class="itte-step-title">いま、何が来てる？</div><div class="itte-list">${items}</div>`;
}
function itteStep2Html(){
  const sit = SITUATIONS.find(s=>s.id===state.itte.situationId);
  const mechs = filterExisting(sit.mechIds).map(findMechanism);
  const stamps = mechs.map(m=>`<div class="itte-stamp" data-id="${m.id}">${escapeHtml(m.name)}</div>`).join('');
  return `
    <div class="itte-step-title">『${escapeHtml(sit.label)}』で発動してるメカニズム</div>
    <div class="itte-mech-stamps">${stamps}</div>
    <div class="itte-note-box">${escapeHtml(sit.note)}<br><br>タップすると詳細が見れる。</div>
    <div class="itte-nav-row">
      <button class="btn-ghost" id="itte-restart" type="button">状況を選び直す</button>
      <button class="btn-primary" id="itte-next" type="button">一歩引く</button>
    </div>`;
}
function itteStep3Html(){
  const sit = SITUATIONS.find(s=>s.id===state.itte.situationId);
  return `
    <div class="itte-step-title">一歩引いて見る</div>
    <div class="itte-note-box">
      『${escapeHtml(sit.label)}』が来た。<br><br>
      ${escapeHtml(sit.note)}<br><br>
      <strong>今やらなアカン？<br>後でええやろ。</strong>
    </div>
    <div class="itte-nav-row">
      <button class="btn-ghost" id="itte-back" type="button">戻る</button>
      <button class="btn-primary" id="itte-next" type="button">一手を選ぶ</button>
    </div>`;
}
function itteStep4Html(){
  const items = ACTIONS.map(a=>
    `<button class="itte-btn" data-id="${a.id}" type="button">${escapeHtml(a.label)}<span class="sub">${escapeHtml(a.desc)}</span></button>`
  ).join('');
  return `
    <div class="itte-step-title">一手を選ぶ</div>
    <div class="itte-list">${items}</div>
    <div class="itte-nav-row">
      <button class="btn-ghost" id="itte-back" type="button">戻る</button>
    </div>`;
}
function itteStep5Html(){
  const act = ACTIONS.find(a=>a.id===state.itte.action);
  if(state.itte.saved){
    return `
      <div class="itte-step-title">証拠回収 完了</div>
      <div class="itte-note-box"><strong>${escapeHtml(act.confirm)}</strong></div>
      <button class="btn-primary" id="itte-restart" type="button">もう一度</button>`;
  }
  return `
    <div class="itte-step-title">証拠回収</div>
    <div class="itte-note-box">
      選んだ一手：<strong>${escapeHtml(act.label)}</strong><br><br>${escapeHtml(act.confirm)}
    </div>
    <div class="form-label">メモ（任意）</div>
    <textarea class="itte-textarea" id="itte-note" placeholder="気づいたこと、現場での出来事など"></textarea>
    <button class="btn-primary" id="itte-save" type="button">記録する</button>
    <div class="itte-nav-row">
      <button class="btn-ghost" id="itte-back" type="button">戻る</button>
    </div>`;
}
function resetItte(){
  state.itte = {step:1, situationId:null, action:null, saved:false};
}
function bindItteEvents(){
  const content = document.getElementById('itte-content');
  const step = state.itte.step;

  if(step===1){
    content.querySelectorAll('.itte-btn').forEach(el=>{
      el.addEventListener('click', ()=>{
        state.itte.situationId = el.dataset.id;
        state.itte.step = 2;
        renderItte();
      });
    });
  }
  if(step===2){
    content.querySelectorAll('.itte-stamp').forEach(el=>{
      el.addEventListener('click', ()=>openDetail(el.dataset.id));
    });
    const restart = document.getElementById('itte-restart');
    const next = document.getElementById('itte-next');
    if(restart) restart.addEventListener('click', ()=>{ resetItte(); renderItte(); });
    if(next) next.addEventListener('click', ()=>{ state.itte.step=3; renderItte(); });
  }
  if(step===3){
    const back = document.getElementById('itte-back');
    const next = document.getElementById('itte-next');
    if(back) back.addEventListener('click', ()=>{ state.itte.step=2; renderItte(); });
    if(next) next.addEventListener('click', ()=>{ state.itte.step=4; renderItte(); });
  }
  if(step===4){
    content.querySelectorAll('.itte-btn').forEach(el=>{
      el.addEventListener('click', ()=>{
        state.itte.action = el.dataset.id;
        state.itte.step = 5;
        state.itte.saved = false;
        renderItte();
      });
    });
    const back = document.getElementById('itte-back');
    if(back) back.addEventListener('click', ()=>{ state.itte.step=3; renderItte(); });
  }
  if(step===5){
    if(state.itte.saved){
      const restart = document.getElementById('itte-restart');
      if(restart) restart.addEventListener('click', ()=>{ resetItte(); renderItte(); });
      return;
    }
    const back = document.getElementById('itte-back');
    const save = document.getElementById('itte-save');
    if(back) back.addEventListener('click', ()=>{ state.itte.step=4; renderItte(); });
    if(save) save.addEventListener('click', ()=>{
      const sit = SITUATIONS.find(s=>s.id===state.itte.situationId);
      const act = ACTIONS.find(a=>a.id===state.itte.action);
      const mechs = filterExisting(sit.mechIds).map(findMechanism);
      const note = document.getElementById('itte-note').value.trim();
      addLogEntry({
        mechanismId: mechs[0] ? mechs[0].id : null,
        mechanismName: mechs.map(m=>m.name).join('・'),
        note, source:'itte',
        situationLabel: sit.label,
        actionLabel: act.label,
      });
      state.itte.saved = true;
      renderItte();
    });
  }
}

/* ============================================================
   4. マップ（本マップVer.2 / DAIMONマップ）
============================================================ */
function renderMapBooks(){
  const box = document.getElementById('subview-books');
  if(!state.map.bookId){
    box.innerHTML = `
      <div class="map-section-title">本マップ</div>
      <div class="map-section-note">タップすると、その本に出てくるメカニズム一覧。メカニズム側からも、関連する本に戻れる。</div>
      ${BOOKS.map(b=>{
        const {collected,total} = getBookPlannedCount(b.id);
        return `<div class="book-card" data-id="${b.id}">
          <div class="book-card-top">
            <div class="book-name">${escapeHtml(b.name)}</div>
            <div class="book-progress">${collected} / ${total}</div>
          </div>
          <div class="book-note">${escapeHtml(b.note||'')}</div>
        </div>`;
      }).join('')}
    `;
    box.querySelectorAll('.book-card').forEach(el=>{
      el.addEventListener('click', ()=>{ state.map.bookId = el.dataset.id; renderMapBooks(); });
    });
    return;
  }
  const book = BOOKS.find(b=>b.id===state.map.bookId);
  const mechs = getMechanismsForBook(book.id);
  const favs = lsGet(LS_FAV, []);
  box.innerHTML = `
    <div class="map-back" id="map-back">‹ 本マップ</div>
    <div class="map-section-title">${escapeHtml(book.name)}</div>
    <div class="map-section-note">${escapeHtml(book.note||'')}</div>
    ${mechs.length
      ? mechs.map(m=>entryCardHtml(m, favs.includes(m.id), state.dict.app)).join('')
      : `<div class="entry-empty">この本のメカニズムはまだ収録されていません。<br>今後のデータ追加で表示されます。</div>`}
  `;
  document.getElementById('map-back').addEventListener('click', ()=>{ state.map.bookId=null; renderMapBooks(); });
  bindEntryCardEvents(box, renderMapBooks);
}
function renderMapDaimon(){
  const box = document.getElementById('subview-daimon');
  box.innerHTML = `
    <div class="map-section-title">DAIMON転用マップ</div>
    <div class="map-section-note">DAIMONの各機能が、人間OSのどの仕組みに対応しているかの一覧。</div>
    ${DAIMON_MAP.map(d=>{
      const mechs = filterExisting(d.mechIds).map(findMechanism);
      const chips = mechs.map(m=>`<div class="mech-chip" data-id="${m.id}">${escapeHtml(m.name)}</div>`).join('');
      return `<div class="daimon-card">
        <div class="daimon-name">${escapeHtml(d.name)}</div>
        <div class="daimon-desc">${escapeHtml(d.desc)}</div>
        <div class="mech-chip-row">${chips}</div>
      </div>`;
    }).join('')}
  `;
  box.querySelectorAll('.mech-chip').forEach(el=>{
    el.addEventListener('click', ()=>openDetail(el.dataset.id));
  });
}

/* ============================================================
   5. その他（お気に入り / 発見ログ / 設定）
============================================================ */
function renderFav(){
  const box = document.getElementById('subview-fav');
  const favs = lsGet(LS_FAV, []).filter(existsM);
  if(favs.length===0){
    box.innerHTML = `<div class="empty-box">お気に入りはまだありません。<br>辞典や詳細画面の☆をタップすると追加できる。</div>`;
    return;
  }
  box.innerHTML = `<div class="entry-list">${favs.map(id=>entryCardHtml(findMechanism(id), true, state.dict.app)).join('')}</div>`;
  bindEntryCardEvents(box, renderFav);
}
function logEntryHtml(entry){
  const mechLink = (entry.mechanismId && existsM(entry.mechanismId))
    ? `<span class="log-mech log-mech-link" data-id="${entry.mechanismId}">${escapeHtml(entry.mechanismName||'')}</span>`
    : `<span class="log-mech">${escapeHtml(entry.mechanismName||'記録')}</span>`;
  const meta = [];
  if(entry.situationLabel) meta.push(`状況: ${entry.situationLabel}`);
  if(entry.actionLabel) meta.push(`一手: ${entry.actionLabel}`);
  return `
    <div class="log-entry">
      <div class="log-top">${mechLink}<span class="log-date">${escapeHtml(entry.date)} ${escapeHtml(entry.time||'')}</span></div>
      ${entry.note ? `<div class="log-note">${escapeHtml(entry.note)}</div>` : ''}
      ${meta.length ? `<div class="log-meta">${escapeHtml(meta.join(' / '))}</div>` : ''}
      <div class="log-del" data-logid="${entry.id}">削除</div>
    </div>`;
}
function renderLog(){
  const box = document.getElementById('subview-log');
  const log = lsGet(LS_LOG, []);
  const formOpen = state.more.logFormOpen;

  let html = `<button class="btn-secondary add-log-btn" id="log-add-toggle" type="button">${formOpen ? '閉じる' : '＋ 発見を記録する'}</button>`;

  if(formOpen){
    const options = MECHANISMS.slice()
      .sort((a,b)=>(a.kana||a.name).localeCompare(b.kana||b.name,'ja'))
      .map(m=>`<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');
    html += `
      <div class="add-log-form">
        <div class="form-label">メカニズム</div>
        <select class="form-select" id="log-mech-select">${options}</select>
        <div class="form-label">気づいたこと</div>
        <textarea class="itte-textarea" id="log-note-input" placeholder="例：返報性 - 現場でコーヒー渡したら空気が良くなった"></textarea>
        <div class="form-actions">
          <button class="btn-primary" id="log-save-btn" type="button">記録する</button>
        </div>
      </div>`;
  }

  if(log.length===0){
    html += `<div class="empty-box">発見ログはまだありません。<br>「今日」や「一手」、またはここからの手動記録で残っていく。</div>`;
  } else {
    html += log.slice().reverse().map(logEntryHtml).join('');
  }
  box.innerHTML = html;

  document.getElementById('log-add-toggle').addEventListener('click', ()=>{
    state.more.logFormOpen = !state.more.logFormOpen;
    renderLog();
  });
  if(formOpen){
    document.getElementById('log-save-btn').addEventListener('click', ()=>{
      const id = document.getElementById('log-mech-select').value;
      const m = findMechanism(id);
      const note = document.getElementById('log-note-input').value.trim();
      addLogEntry({mechanismId:id, mechanismName: m? m.name : '', note, source:'manual'});
      state.more.logFormOpen = false;
      renderLog();
    });
  }
  box.querySelectorAll('.log-mech-link').forEach(el=>{
    el.addEventListener('click', ()=>openDetail(el.dataset.id));
  });
  box.querySelectorAll('.log-del').forEach(el=>{
    el.addEventListener('click', ()=>{
      const newLog = lsGet(LS_LOG, []).filter(e=>e.id!==el.dataset.logid);
      lsSet(LS_LOG, newLog);
      renderLog();
    });
  });
}
function renderSettings(){
  const box = document.getElementById('subview-settings');
  const favCount = lsGet(LS_FAV, []).length;
  const logCount = lsGet(LS_LOG, []).length;
  const byCat = {};
  MECHANISMS.forEach(m=>{ byCat[m.category] = (byCat[m.category]||0) + 1; });
  const catRows = Object.entries(CATEGORIES).sort((a,b)=>a[1].order-b[1].order)
    .map(([key,info])=>`<div class="settings-cat-row"><span>${escapeHtml(info.label)}</span><b>${byCat[key]||0}</b></div>`).join('');

  box.innerHTML = `
    <div class="settings-box">
      <div class="settings-title">収録状況</div>
      <div class="settings-row"><span>収録メカニズム</span><span>${MECHANISMS.length} / 300</span></div>
      <div class="settings-row"><span>カテゴリ数</span><span>${Object.keys(CATEGORIES).length}</span></div>
      <div class="settings-row"><span>本マップ</span><span>${BOOKS.length}</span></div>
      <div class="settings-row"><span>お気に入り</span><span>${favCount}</span></div>
      <div class="settings-row"><span>発見ログ</span><span>${logCount}</span></div>
    </div>
    <div class="settings-box">
      <div class="settings-title">カテゴリ別 収録数</div>
      ${catRows}
    </div>
    <div class="settings-box">
      <button class="btn-ghost" id="clear-recent-btn" type="button">最近見た項目をクリア</button>
      <div class="section-gap"></div>
      <button class="btn-danger" id="clear-all-btn" type="button">データを全て消去する</button>
      <div class="about-text">
        お気に入り・発見ログ・最近見た項目・今日のターゲットを消去します。<br>
        メカニズムデータそのもの（mechanisms.js / books.js）は消えません。
      </div>
    </div>
    <div class="settings-box">
      <div class="settings-title">ABOUT</div>
      <div class="about-text">
        人間OS メカニズム辞典　TEPPEI EDITION<br>
        現実を見る → 名前を貼る → 一歩引く → 一手を選ぶ。<br>
        DAIMON派生・人間OS基礎ライブラリー。
      </div>
    </div>
  `;
  document.getElementById('clear-recent-btn').addEventListener('click', ()=>{
    lsSet(LS_RECENT, []);
    renderRecentRow();
    alert('最近見た項目をクリアしました。');
  });
  document.getElementById('clear-all-btn').addEventListener('click', ()=>{
    if(!confirm('お気に入り・発見ログ・最近見た項目・今日のターゲットを全て消去します。よろしいですか？')) return;
    [LS_FAV, LS_RECENT, LS_LOG, LS_TODAY].forEach(k=>{ try{ localStorage.removeItem(k); }catch(e){} });
    renderCurrentView();
    alert('消去しました。');
  });
}

/* ============================================================
   メカニズム詳細オーバーレイ
   （本→メカニズム→詳細→関連本／関連メカニズム の双方向ナビ）
============================================================ */
function openDetail(id){
  if(!existsM(id)) return;
  const overlay = document.getElementById('detail-overlay');
  if(overlay.classList.contains('open') && state.detailStack.length){
    const top = state.detailStack[state.detailStack.length-1];
    if(top !== id) state.detailStack.push(id);
  } else {
    state.detailStack = [id];
  }
  addRecent(id);
  renderDetail(id);
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden','false');
  document.getElementById('detail-back').hidden = state.detailStack.length<=1;
}
function closeDetail(){
  const overlay = document.getElementById('detail-overlay');
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden','true');
  state.detailStack = [];
  renderCurrentView();
}
function backDetail(){
  state.detailStack.pop();
  const id = state.detailStack[state.detailStack.length-1];
  if(!id){ closeDetail(); return; }
  renderDetail(id);
  document.getElementById('detail-back').hidden = state.detailStack.length<=1;
}
function renderDetail(id){
  const m = findMechanism(id);
  const body = document.getElementById('detail-body');
  const imp = IMPORTANCE[m.importance] || {label:m.importance, color:'#a99878'};
  const cat = CATEGORIES[m.category] || {label:m.category, color:'#a99878'};
  const favs = lsGet(LS_FAV, []);
  const isFav = favs.includes(m.id);
  const related = filterExisting(m.relatedMechanisms).map(findMechanism);
  const books = getBooksForMechanism(m.id);

  body.innerHTML = `
    <div class="detail-badges">
      <span class="imp-badge" style="background:${imp.color}">${escapeHtml(imp.label)}</span>
      <span class="cat-dot" style="background:${cat.color}"></span>
      <span class="cat-label">${escapeHtml(cat.label)}</span>
    </div>
    <div class="detail-kana">${escapeHtml(m.kana||'')}</div>
    <div class="detail-name">${escapeHtml(m.name)}</div>
    <div class="detail-oneline">${escapeHtml(m.oneLine)}</div>
    <div class="detail-fav ${isFav?'active':''}" id="detail-fav-btn">
      <span>${isFav?'★':'☆'}</span><span>お気に入り</span>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">概要</div>
      <div class="detail-section-body">${escapeHtml(m.shortDescription)}</div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">詳しく</div>
      <div class="detail-section-body">${escapeHtml(m.fullDescription)}</div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">日常での例</div>
      <div class="detail-section-body">${escapeHtml(m.everydayExample)}</div>
    </div>
    <div class="detail-section app-ex work">
      <div class="detail-section-title">仕事での応用</div>
      <div class="detail-section-body">${escapeHtml(m.workExample)}</div>
    </div>
    <div class="detail-section app-ex investment">
      <div class="detail-section-title">投資での応用</div>
      <div class="detail-section-body">${escapeHtml(m.investmentExample)}</div>
    </div>
    <div class="detail-section app-ex romance">
      <div class="detail-section-title">恋愛での応用</div>
      <div class="detail-section-body">${escapeHtml(m.romanceExample)}</div>
    </div>
    <div class="detail-section teppei">
      <div class="detail-section-title">鉄兵の現場・実戦では</div>
      <div class="detail-section-body">${escapeHtml(m.teppeiExample)}</div>
    </div>
    <div class="detail-section daimon">
      <div class="detail-section-title">DAIMONでの使い方</div>
      <div class="detail-section-body">${escapeHtml(m.daimonUse)}</div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">タグ</div>
      <div class="detail-tags">${(m.tags||[]).map(t=>`<span class="detail-tag">${escapeHtml(t)}</span>`).join('')}</div>
    </div>

    ${related.length ? `
    <div class="detail-section">
      <div class="detail-section-title">関連メカニズム</div>
      <div class="detail-chip-row">${related.map(r=>`<div class="mech-chip" data-id="${r.id}">${escapeHtml(r.name)}</div>`).join('')}</div>
    </div>` : ''}

    ${books.length ? `
    <div class="detail-section">
      <div class="detail-section-title">関連する本</div>
      <div class="detail-chip-row">${books.map(b=>`<div class="mech-chip" data-book="${b.id}">${escapeHtml(b.name)}</div>`).join('')}</div>
    </div>` : ''}
  `;

  document.getElementById('detail-fav-btn').addEventListener('click', ()=>{
    toggleFavorite(m.id);
    renderDetail(id);
  });
  body.querySelectorAll('.mech-chip[data-id]').forEach(el=>{
    el.addEventListener('click', ()=>openDetail(el.dataset.id));
  });
  body.querySelectorAll('.mech-chip[data-book]').forEach(el=>{
    el.addEventListener('click', ()=>{
      const bookId = el.dataset.book;
      closeDetail();
      state.map.bookId = bookId;
      switchView('map');
      switchSubtab('map','books');
    });
  });
  body.scrollTop = 0;
}

/* ============================================================
   ナビゲーション / 初期化
============================================================ */
function switchView(name){
  state.view = name;
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active', v.dataset.view===name));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.view===name));
  renderCurrentView();
}
function switchSubtab(viewName, subtab){
  const rowId = viewName==='map' ? 'map-subtab-row' : 'more-subtab-row';
  const row = document.getElementById(rowId);
  row.querySelectorAll('.subtab').forEach(b=>b.classList.toggle('active', b.dataset.subtab===subtab));

  if(viewName==='map'){
    document.getElementById('subview-books').classList.toggle('active', subtab==='books');
    document.getElementById('subview-daimon').classList.toggle('active', subtab==='daimon');
    state.map.subtab = subtab;
  } else {
    document.getElementById('subview-fav').classList.toggle('active', subtab==='fav');
    document.getElementById('subview-log').classList.toggle('active', subtab==='log');
    document.getElementById('subview-settings').classList.toggle('active', subtab==='settings');
    state.more.subtab = subtab;
  }
}
function renderCurrentView(){
  switch(state.view){
    case 'dict':
      renderCatChips(); renderImpChips(); renderAppChips(); renderRecentRow(); renderEntryList(); renderDictMeta();
      break;
    case 'today': renderToday(); break;
    case 'itte': renderItte(); break;
    case 'map': renderMapBooks(); renderMapDaimon(); break;
    case 'more': renderFav(); renderLog(); renderSettings(); break;
  }
}
function init(){
  document.querySelectorAll('.nav-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>switchView(btn.dataset.view));
  });
  document.getElementById('map-subtab-row').querySelectorAll('.subtab').forEach(btn=>{
    btn.addEventListener('click', ()=>switchSubtab('map', btn.dataset.subtab));
  });
  document.getElementById('more-subtab-row').querySelectorAll('.subtab').forEach(btn=>{
    btn.addEventListener('click', ()=>switchSubtab('more', btn.dataset.subtab));
  });
  document.getElementById('search').addEventListener('input', (e)=>{
    state.dict.q = e.target.value;
    renderEntryList(); renderDictMeta();
  });
  const favToggle = document.getElementById('fav-toggle');
  favToggle.addEventListener('click', ()=>{
    state.dict.favOnly = !state.dict.favOnly;
    favToggle.setAttribute('aria-pressed', state.dict.favOnly ? 'true' : 'false');
    renderEntryList(); renderDictMeta();
  });
  document.getElementById('detail-close').addEventListener('click', closeDetail);
  document.getElementById('detail-back').addEventListener('click', backDetail);

  renderCurrentView();
}

document.addEventListener('DOMContentLoaded', init);
