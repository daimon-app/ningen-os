/* ============================================================
   人間OS メカニズム辞典 - 本マップ Ver.2 データ
   ------------------------------------------------------------
   ★ 本 → メカニズム一覧 → 詳細 → 関連本 の双方向ナビゲーション用。
   ★ mechanismIds には「まだ mechanisms.js に存在しないID」を
     先に書いておいてOK。app.js 側で実在するものだけ表示するので、
     後からメカニズムを追加した瞬間にこの本のリストにも自動で出現する。
   ★ 逆方向（メカニズム詳細→関連本）は、
       ・このファイルの mechanismIds に含まれている
       ・または mechanisms.js 側の books に bookId が含まれている
     のどちらかが成立すれば表示される（OR条件・崩れない設計）。
============================================================ */

const BOOKS = [
  {
    id:'eikyo',
    name:'影響力の武器',
    note:'人を動かす6つの原理。返報性・社会的証明・希少性・権威・好意・一貫性。',
    mechanismIds:['reciprocity','social_proof','scarcity','authority','liking','consistency','commitment'],
  },
  {
    id:'keizai',
    name:'行動経済学が最強の学問である',
    note:'損失回避・フレーミング・ナッジなど、判断のクセを経済学側から整理する一冊。',
    mechanismIds:['loss_aversion','framing','nudge','social_proof','anchoring','default_effect','status_quo_bias'],
  },
  {
    id:'fast_slow',
    name:'ファスト＆スロー',
    note:'システム1/2を軸に、判断バイアスの全体地図を作る基礎書。',
    mechanismIds:['system1','system2','heuristic','loss_aversion','anchoring','confirmation_bias','availability_heuristic','overconfidence_bias','representativeness_heuristic','halo_effect'],
  },
  {
    id:'shukan',
    name:'習慣超大全',
    note:'習慣ループ・トリガー・環境設計など、行動を仕組みで変える実践書。',
    mechanismIds:['homeostasis','habit_loop','trigger','conditioning','implementation_intention','small_win','environment_design','friction_cost','atode_eeyaro'],
  },
  {
    id:'evolution_book',
    name:'進化心理学から考えるホモサピエンス',
    note:'愛着・地位欲求・所属欲求など、欲求の進化的な土台を解説。',
    mechanismIds:['attachment_system','mate_choice','status_need','belonging_need','jealousy','pair_bond','reciprocal_altruism'],
  },
  {
    id:'nokagaku',
    name:'脳科学より心理学',
    note:'報酬系・ドーパミン予測・メタ認知など、脳の仕組みから人間OSを見る。',
    mechanismIds:['reward_system','dopamine_prediction','metacognition','attention_resource','memory_system','learning_system'],
  },
  {
    id:'adler',
    name:'アドラー心理学',
    note:'自己概念・所属欲求・自己効力感など、対人関係と勇気づけの心理学。',
    mechanismIds:['self_concept','belonging_need','teleology','self_efficacy','encouragement','interpersonal_relations'],
  },
  {
    id:'danjo',
    name:'男女の心理学',
    note:'愛着・単純接触効果・嫉妬など、恋愛・関係性に関わるメカニズム。',
    mechanismIds:['attachment_system','mere_exposure','intimacy','jealousy','attraction_judgment'],
  },
  {
    id:'eigyo',
    name:'営業の心理学',
    note:'返報性・好意・社会的証明など、対人影響力を仕事に活かす一冊。',
    mechanismIds:['reciprocity','liking','social_proof','authority','scarcity','foot_in_the_door','door_in_the_face'],
  },
  {
    id:'nlp',
    name:'NLP系',
    note:'条件付け・アンカリング・ラベリングなど、言葉と反応の結びつきを扱う。',
    mechanismIds:['conditioning','anchoring','labeling_effect','mirroring','reframing','suggestion'],
  },
  {
    id:'ishi',
    name:'意志の取扱説明書',
    note:'メタ認知・自己効力感・実行意図など、自分を操作するための知識。',
    mechanismIds:['metacognition','self_efficacy','cognitive_dissonance','implementation_intention'],
  },
  {
    id:'fuyano',
    name:'不夜脳',
    note:'報酬系・ドーパミン・依存形成など、夜更かしと刺激依存の正体。',
    mechanismIds:['reward_system','dopamine_prediction','addiction_formation','sleep_system','stimulation_seeking','variable_reward'],
  },
];
