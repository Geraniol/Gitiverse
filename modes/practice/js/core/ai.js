'use strict';
window.VGE = window.VGE || {};

const AI_CFG_KEY  = 'vge.ai.cfg.v1';   /* versioned for future schema migration */
const AI_HIST_MAX = 6;                 /* multi-turn context: last 6 messages (3 turns) */
const AI_IDLE_MS  = 20000;             /* watchdog: abort if no delta arrives within 20s */
const AI_TEST_MS  = 12000;             /* "test connection" timeout */
/* The browser talks to the provider directly; the old local-backend relay
   (POST /api/ai/stream) was removed. CORS can still bite on file:// (Origin
   is null), but DeepSeek works directly, so we warn only on a real failure. */

/* Provider presets: endpoint is the full chat/completions path.
   "custom" is for any other OpenAI-compatible service. */
const AI_PRESETS = {
  deepseek:   { endpoint:'https://api.deepseek.com/chat/completions',      model:'deepseek-flash' },
  openrouter: { endpoint:'https://openrouter.ai/api/v1/chat/completions', model:'deepseek/deepseek-chat' },
  ollama:     { endpoint:'http://localhost:11434/v1/chat/completions',     model:'qwen2.5:7b' },
  custom:     { endpoint:'', model:'' },
};

let aiCfg = null;              /* current config in memory (from localStorage) */
let aiHist = [];               /* multi-turn context: [{role, content}] */
let aiAbortCtl = null;         /* the in-flight streaming request */
let aiBusyFlag = false;
let aiSeq = 0;                 /* request generation: when requests overlap, only the newest sets busy */

function aiBlankCfg(){
  return { preset:'deepseek', endpoint:AI_PRESETS.deepseek.endpoint, model:AI_PRESETS.deepseek.model,
           apiKey:'', maxTokens:256, temperature:0.3 };
}
/* Normalise: every source (localStorage / form) passes through here. */
function aiNormalize(raw){
  const c = Object.assign(aiBlankCfg(), raw || {});
  c.endpoint = String(c.endpoint || '').trim();
  c.model    = String(c.model    || '').trim();
  c.apiKey   = String(c.apiKey   || '').trim();
  c.maxTokens = Math.min(1024, Math.max(64, parseInt(c.maxTokens, 10) || 256));
  const t = parseFloat(c.temperature);
  c.temperature = isNaN(t) ? 0.3 : Math.min(2, Math.max(0, t));
  /* Old configs may carry a now-unused viaBackend field. Normalisation reads
     only the keys above, so it is left in place and never migrated. */
  if(!AI_PRESETS[c.preset]) c.preset = 'custom';
  return c;
}
function aiLoadConfig(){
  let raw = null;
  try{ raw = JSON.parse(localStorage.getItem(AI_CFG_KEY) || 'null'); }
  catch(e){ console.warn('[Git Playground] Failed to parse the AI config; falling back to defaults:', e); }
  aiCfg = aiNormalize(raw);
  return aiCfg;
}
function aiSaveConfig(patch){
  aiCfg = aiNormalize(Object.assign({}, aiConfig(), patch || {}));
  try{
    localStorage.setItem(AI_CFG_KEY, JSON.stringify(aiCfg));
    return true;
  }catch(e){
    console.warn('[Git Playground] Could not save the AI config (localStorage unavailable):', e);
    return false;
  }
}
function aiClearConfig(){
  aiAbort();
  aiCfg = aiBlankCfg();
  aiHist = [];
  try{ localStorage.removeItem(AI_CFG_KEY); }
  catch(e){ console.warn('[Git Playground] Could not clear the AI config:', e); }
  return aiCfg;
}
function aiConfig(){ return aiCfg || aiLoadConfig(); }
function aiIsReady(c){
  c = c || aiConfig();
  return !!(c.endpoint && c.apiKey && c.model);
}
const aiIsValidEndpoint = u => /^https?:\/\/\S+$/i.test(String(u || '').trim());
const aiBusy = () => aiBusyFlag;


/* i18n-scan:off - the Chinese strings until i18n-scan:on are model prompts and
   state snapshots, never shown on screen. The snapshot is written in Chinese on
   purpose; the reply language comes from prompt rule 7. */
/* Strict system prompt. {lang} follows the UI language. */
function aiSystemPrompt(){
  const lang = VGE.i18n.code() === 'en-US' ? 'English' : '简体中文';
  return [
    '你是「Git Playground」这个 Git 沙盒里的助教。学习者在终端里亲手敲 git 命令，',
    '对话框很窄，只放得下 1~3 行字。',
    '',
    '回复硬性要求：',
    '1. 只回答被问的那一件事：先给结论或命令，再用最多一句话说理由。',
    '2. 全文不超过 60 个汉字（英文不超过 35 个词）。宁可少说，绝不凑字数。',
    '3. 禁止开场白（"好的""当然""这是个好问题"）、禁止总结段、禁止重复问题。',
    '4. 禁止标题、列表、表格、分割线、表情符号。命令用行内 `code`；确实需要多条命令时才换行。',
    '5. 只依据下方【当前状态】给出的事实说话（分支名、提交数、文件名、暂存区）；',
    '   状态里没有的一律不要编造，不确定就直说"当前状态里看不到"。',
    '6. 多轮对话中只有最后一条【当前状态】有效，忽略历史消息里的旧状态。',
    '7. 用' + lang + '回答。',
    '8. 问题超出 Git 范围时，一句话说明并把话题拉回 Git。',
    /* The most important rule: the course panel is gone, so the model must not
       mention steps or a flow the user cannot see. */
    '9. 这个界面**没有课程、没有步骤、没有既定流程**。不要主动安排"下一步做什么"，',
    '   不要催促进度，不要假设学习者正处在某个教学环节；被问到才回答，答完就停。',
  ].join('\n');
}

/* Squash the current UI state into a compact text block. Full terminal output,
   all graph nodes and file contents are deliberately left out. */
function aiStateText(){
  const L = [];
  /* WARNING: no course/step context and no "current mode" is sent. The course
     panel is gone, so steps do not exist in the UI and the model must not see
     them. Only the repository's own objective state is sent. */

  /* repo state */
  if(!repo || !repo.init){
    L.push('仓库：尚未 git init（没有任何提交，也没有分支）');
  }else{
    L.push('仓库已初始化：是');
    L.push('HEAD → ' + repo.HEAD + ' ｜ 已有分支：' + (Object.keys(repo.branches).join(', ') || '无'));
    const cs = repo.commits || [];
    L.push('提交数：' + cs.length);
    const recent = cs.slice(-3).map(c => c.id + ' "' + c.msg + '"' + (c.isMerge ? '(合并提交)' : '') + ' ← ' + c.branch);
    if(recent.length) L.push('最近提交：' + recent.join(' ｜ '));
    const S = staged(), U = unstaged();
    L.push('暂存区：' + (S.length ? S.length + ' 个文件（' + S.slice(0, 6).map(f => f.p).join('、') + '）' : '空'));
    L.push('未暂存：' + (U.length ? U.length + ' 个文件（' + U.slice(0, 6).map(f => f.p).join('、') + '）' : '无'));
    const P = pending();   /* merge or rebase in progress (same state shape) */
    L.push('进行中的操作：' + (repo.rebase ? 'rebase' : (repo.merging ? 'merge' : '无')));
    L.push('冲突文件：' + (P
      ? (P.open.length ? P.open.join('、') : (repo.rebase ? '已全部解决，待 git rebase --continue' : '已全部解决，待提交'))
      : '无'));
    const lg = (repo.log || []).slice(-6).map(e => e.raw + (e.ok ? ' ✓' : ' ✗'));
    if(lg.length) L.push('最近命令：' + lg.join(' → '));
  }

  return L.join('\n');
}

function aiUserContent(question){
  return '【当前状态】\n' + aiStateText() + '\n\n【学习者提问】\n' + question;
}
/* i18n-scan:on - internal input ends here; UI copy below */
function aiMessages(userContent){
  return [{ role:'system', content:aiSystemPrompt() }]
    .concat(aiHist.slice(-AI_HIST_MAX))
    .concat([{ role:'user', content:userContent }]);
}


/* Extract the delta text from delta.content. Reasoning models also send
   delta.reasoning_content, which must be ignored - it would flood the chat. */
function aiDeltaOf(json){
  const ch = json && json.choices && json.choices[0];
  if(!ch) return '';
  const d = ch.delta || ch.message || {};
  return typeof d.content === 'string' ? d.content : '';
}
/* Turn a provider error body into readable text. */
function aiErrText(status, body){
  let msg = '';
  try{
    const j = JSON.parse(body);
    msg = (j.error && (j.error.message || j.error.type)) || j.message || '';
  }catch(e){ /* non-JSON body: fall back to a truncated raw string */ }
  if(!msg && body) msg = String(body).slice(0, 200);
  return { status:status, msg:msg };
}
function aiAbort(){
  if(aiAbortCtl){ try{ aiAbortCtl.abort(); }catch(e){ /* already finished */ } }
}

/* The request body sent to the model. */
function aiBody(c, messages, stream, maxTokens){
  return { model:c.model, stream:!!stream, max_tokens:maxTokens, temperature:c.temperature,
           messages:messages };
}
/* The only exit: call the provider endpoint directly; the reply is
   OpenAI-compatible JSON / SSE. The Authorization + application/json headers
   trigger a CORS preflight, so the provider must answer OPTIONS too. */
function aiRequest(c, messages, opts){
  const o = opts || {}, body = aiBody(c, messages, o.stream, o.maxTokens);
  return fetch(c.endpoint, {
    method:'POST', signal:o.signal,
    headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer ' + c.apiKey },
    body:JSON.stringify(body),
  });
}
/* Translate a non-2xx response: the provider's own OpenAI-style error body. */
async function aiErrFrom(res, c){
  const body = await res.text().catch(() => '');
  return aiErrText(res.status, body);
}

/* Run one streaming Q&A.
   handlers: { onDelta(text) } (optional, for per-token rendering)
   Returns: {ok:true} | {ok:false, reason:'off'|'aborted'|'empty'|'error', ...} */
async function aiAsk(question, handlers){
  const c = aiConfig();
  if(!aiIsReady(c)) return { ok:false, reason:'off' };

  aiAbort();                                     /* only one stream at a time */
  const h = handlers || {};
  const ac = new AbortController();
  const mySeq = ++aiSeq;
  aiAbortCtl = ac;
  aiBusyFlag = true;

  const userContent = aiUserContent(question);
  let idle = null, timedOut = false, raw = '';
  /* The watchdog aborts only its own stream - not via aiAbort(), which a late
     watchdog could fire against a newer request. */
  const kickWatchdog = () => {
    clearTimeout(idle);
    idle = setTimeout(() => { timedOut = true; try{ ac.abort(); }catch(e){ /* already finished */ } }, AI_IDLE_MS);
  };

  try{
    kickWatchdog();
    const res = await aiRequest(c, aiMessages(userContent), {
      stream:true, maxTokens:c.maxTokens, signal:ac.signal,
    });

    if(!res.ok){
      return { ok:false, reason:'error', err: await aiErrFrom(res, c) };
    }

    /* Very old browsers lack stream reading: fall back to one-shot rendering. */
    if(!res.body || !res.body.getReader){
      const txt = await res.text();
      let one = '';
      try{ one = aiDeltaOf(JSON.parse(txt)); }catch(e){ /* keep empty string */ }
      if(one && h.onDelta) h.onDelta(one);
      return one ? { ok:true } : { ok:false, reason:'empty' };
    }

    const reader = res.body.getReader(), dec = new TextDecoder();
    /* Race the abort signal against the read, so "Stop" always ends the request
       at once instead of leaving busy stuck. */
    const abortSignal = new Promise(res => {
      if(ac.signal.aborted) res();
      else ac.signal.addEventListener('abort', res, { once:true });
    });
    let buf = '';
    for(;;){
      const readP = reader.read();
      readP.catch(() => {});            /* this read errors after abort; mark it handled to avoid unhandled rejection */
      const r = await Promise.race([readP, abortSignal]);
      if(ac.signal.aborted){
        try{ reader.cancel(); }catch(e){ /* stream already closed */ }
        return finish(raw);
      }
      if(!r || r.done) break;
      kickWatchdog();
      /* stream:true is required - otherwise multi-byte chars split across chunks break */
      buf += dec.decode(r.value, { stream:true });

      let nl;
      while((nl = buf.indexOf('\n')) >= 0){
        const line = buf.slice(0, nl).replace(/\r$/, '').trim();
        buf = buf.slice(nl + 1);
        if(!line || line.charAt(0) === ':') continue;      /* blank line / SSE comment heartbeat */
        if(line.indexOf('data:') !== 0) continue;          /* other fields such as event: */
        const payload = line.slice(5).trim();
        if(payload === '[DONE]') return finish(raw);
        let j;
        try{ j = JSON.parse(payload); }catch(e){ continue; }  /* partial line: wait for the next chunk */
        const t = aiDeltaOf(j);
        if(t){ raw += t; if(h.onDelta) h.onDelta(t); }
      }
    }
    return finish(raw);
  }catch(e){
    if(ac.signal.aborted){
      if(timedOut) return { ok:false, reason:'error', err:{ status:0, timeout:true, msg:'' } };
      return { ok:false, reason:'aborted', partial:!!raw };
    }
    /* Include the real endpoint and error name: "could not connect" alone tells
       the user nothing about whether it is a typo, the network, or a blocker. */
    console.error('[Git Playground] AI request failed:', c.endpoint, e);
    return { ok:false, reason:'error', err:{
      status:0, endpoint:c.endpoint,
      name:(e && e.name) ? e.name : '', msg:(e && e.message) ? e.message : String(e),
    } };
  }finally{
    clearTimeout(idle);
    /* Only the newest request resets busy, or an older superseded one would
       wrongly mark the new request idle on its way out. */
    if(aiSeq === mySeq) aiBusyFlag = false;
    if(aiAbortCtl === ac) aiAbortCtl = null;
  }

  /* Wrap up: only a successful round with text is added to the history. */
  function finish(text){
    /* On abort or watchdog timeout, report stopped even if the stream finished -
       the outcome must be deterministic. */
    if(ac.signal.aborted){
      return timedOut ? { ok:false, reason:'error', err:{ status:0, timeout:true, msg:'' } }
                      : { ok:false, reason:'aborted', partial:!!text };
    }
    if(!text) return { ok:false, reason:'empty' };
    aiHist = aiHist
      .concat([{ role:'user', content:userContent }, { role:'assistant', content:text }])
      .slice(-AI_HIST_MAX);
    return { ok:true };
  }
}

/* "Test connection": a minimal non-streaming request that surfaces real errors.
   It must use the SAME transport path as a real question, or a passing test
   proves nothing. */
async function aiTest(patch){
  const c = aiNormalize(Object.assign({}, aiConfig(), patch || {}));
  if(!aiIsValidEndpoint(c.endpoint)) return { ok:false, code:'endpoint' };
  if(!c.apiKey) return { ok:false, code:'key' };
  if(!c.model)  return { ok:false, code:'model' };

  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), AI_TEST_MS);
  const t0 = Date.now();
  try{
    const res = await aiRequest(c, [{ role:'user', content:'ping' }], {
      stream:false, maxTokens:16, signal:ac.signal,
    });
    if(!res.ok){
      const e = await aiErrFrom(res, c);
      return { ok:false, code:'http', status:res.status, msg:e.msg || '' };
    }
    /* This ping is non-streaming: some setups block streaming but allow it, so
       success is not proof; failure definitely means the path is broken. */
    return { ok:true, model:c.model, ms:Date.now() - t0 };
  }catch(e){
    return { ok:false, code: ac.signal.aborted ? 'timeout' : 'net',
             msg:(e && e.message) ? e.message : String(e) };
  }finally{ clearTimeout(to); }
}

const aiResetHistory = () => { aiHist = []; };

function aiMockAnswer(question, ctx){
  const q = question, T = VGE.i18n.t.bind(VGE.i18n);
  /* The "what should I do next" branch now gives generic advice based on the
     repository state alone; the course engine and its steps are gone. */
  if(/该做什么|下一步|接下来|怎么办|what should|next|do now/i.test(q)) return T('ai.freeform');
  if(/rebase/.test(q)) return T('ai.rebase');
  if(/reset|hard|危险/.test(q)) return T('ai.reset');
  if(/暂存|staging|add/.test(q)) return T('ai.staging');
  if(/merge|合并|冲突|conflict/.test(q)) return T('ai.merge');
  if(/branch|分支/.test(q)) return T('ai.branch', { branches:Object.keys(repo.branches).join(T('ai.listSep')), head:esc(repo.HEAD) });
  if(/commit|提交/.test(q)) return T('ai.commit', { n:repo.commits.length });
  return T('ai.fallback');
}

VGE.ai = {
  /* config */
  loadConfig:aiLoadConfig, saveConfig:aiSaveConfig, clearConfig:aiClearConfig,
  config:aiConfig, isReady:aiIsReady, isValidEndpoint:aiIsValidEndpoint,
  PRESETS:AI_PRESETS,
  /* session */
  ask:aiAsk, abort:aiAbort, test:aiTest, busy:aiBusy, resetHistory:aiResetHistory,
  IDLE_MS:AI_IDLE_MS,
  /* prompt / context (exported for debugging and reuse) */
  /* messages(question) returns the real array sent out (system + history +
     this turn with the state snapshot), not messages(assembled content). */
  systemPrompt:aiSystemPrompt, stateText:aiStateText,
  messages: q => aiMessages(aiUserContent(q)),
  /* offline fallback */
  provider:'mock', answer:aiMockAnswer,
};
