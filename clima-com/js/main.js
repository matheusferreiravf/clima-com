/* =========================================================
   CLIMA COM — configuração
   ========================================================= */
const CONFIG = {
  // WhatsApp com DDI + DDD, só dígitos
  whatsappNumber: '5516988287628',
  // Usado apenas se o número acima for apagado
  whatsappFallback: 'https://api.whatsapp.com/message/MBLZYKRTC35VI1?autoload=1&app_absent=0',

  // Google Ads: ID/rótulo de conversão. Ex.: 'AW-123456789/AbCdEfGhIjk'
  adsConversion: '',

  // Ribeirão Preto (temperatura ao vivo na barra superior)
  lat: -21.1775,
  lon: -47.8103,
};

const DEFAULT_MSG = 'Olá, Clima Com! Vim pelo site e gostaria de solicitar um orçamento.';

/* ---------- utilidades ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = (n) => n.toLocaleString('pt-BR');
const waDigits = () => CONFIG.whatsappNumber.replace(/\D/g, '');
const hasNumber = () => waDigits().length >= 12;

function waUrl(msg = DEFAULT_MSG) {
  return hasNumber()
    ? `https://wa.me/${waDigits()}?text=${encodeURIComponent(msg)}`
    : CONFIG.whatsappFallback;
}

let toastTimer;
function toast(text) {
  const t = $('#toast');
  t.textContent = text;
  t.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-on'), 3200);
}

function track(event, label) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, lead_source: label });
  if (typeof window.gtag === 'function') {
    window.gtag('event', event, { lead_source: label });
    if (CONFIG.adsConversion) window.gtag('event', 'conversion', { send_to: CONFIG.adsConversion });
  }
}

function onWaClick(label, msg) {
  track('whatsapp_click', label);
  if (!hasNumber() && navigator.clipboard) {
    navigator.clipboard.writeText(msg).then(
      () => toast('Mensagem copiada. É só colar na conversa do WhatsApp.'),
      () => {}
    );
  }
}

/* ---------- links de WhatsApp e telefone ---------- */
$$('.js-wa').forEach((a) => {
  const msg = a.dataset.msg || DEFAULT_MSG;
  a.href = waUrl(msg);
  a.addEventListener('click', () => onWaClick(a.dataset.label || 'wa', msg));
});
$$('.js-tel').forEach((a) => {
  a.addEventListener('click', () => track('phone_click', a.dataset.label || 'tel'));
});

/* ---------- header ---------- */
const hdr = $('#hdr');
let ticking = false;
window.addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { hdr.classList.toggle('is-solid', window.scrollY > 50); ticking = false; });
}, { passive: true });

/* ---------- temperatura agora em Ribeirão ---------- */
(async function liveTemp() {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${CONFIG.lat}&longitude=${CONFIG.lon}&current=temperature_2m&timezone=America%2FSao_Paulo`,
      { signal: ctrl.signal }
    );
    clearTimeout(timer);
    const d = await r.json();
    const t = d?.current?.temperature_2m;
    if (typeof t === 'number') {
      $('#tOut').textContent = `${Math.round(t)} °C`;
      $('#tWrap').hidden = false;
    }
  } catch (_) { /* sem temperatura: o item continua oculto */ }
})();

/* ---------- steppers ---------- */
const LIMITS = { qtd: [1, 20], pessoas: [1, 20], eletros: [0, 10] };
$$('.stepper').forEach((st) => {
  const out = $('output', st);
  const [min, max] = LIMITS[st.dataset.name];
  $$('.stepper__b', st).forEach((b) => {
    b.addEventListener('click', () => {
      const v = Math.min(max, Math.max(min, Number(out.textContent) + Number(b.dataset.step)));
      out.value = v; out.textContent = v;
      st.closest('form').dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
});

/* ---------- montador de orçamento ---------- */
const form = $('#builder');
const bubble = $('#bubble');
const sendBtn = $('#builderSend');
let builderMsg = DEFAULT_MSG;

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function buildMessage() {
  const fd = new FormData(form);
  const servico = fd.get('servico');
  const isEletrica = servico === 'Elétrica';

  $$('[data-for="ar"]', form).forEach((f) => (f.hidden = isEletrica));
  $$('[data-for="eletrica"]', form).forEach((f) => (f.hidden = !isEletrica));
  $$('[data-n-ar]', form).forEach((n) => (n.textContent = isEletrica ? n.dataset.nEl : n.dataset.nAr));

  const lines = ['Olá, Clima Com! Vim pelo site e quero um orçamento.', ''];
  lines.push(`*Serviço:* ${isEletrica ? 'Serviço elétrico' : servico}`);

  if (isEletrica) {
    const itens = fd.getAll('eletrica');
    lines.push(`*Preciso de:* ${itens.length ? itens.join(', ') : 'vou explicar aqui'}`);
  } else {
    lines.push(`*Equipamento:* ${fd.get('equip')}`);
    lines.push(`*Capacidade:* ${fd.get('btu')}`);
    lines.push(`*Quantidade:* ${$('#qtd').textContent.trim()}`);
  }
  lines.push(`*Local:* ${fd.get('local')}`);

  const bairro = String(fd.get('bairro') || '').trim();
  if (bairro) lines.push(`*Bairro/cidade:* ${bairro}`);
  const nome = String(fd.get('nome') || '').trim();
  if (nome) lines.push('', `Meu nome é ${nome}.`);

  return lines.join('\n');
}

function renderBuilder() {
  builderMsg = buildMessage();
  bubble.innerHTML = escapeHtml(builderMsg).replace(/\*([^*\n]+)\*/g, '<b>$1</b>');
  sendBtn.href = waUrl(builderMsg);
}

form.addEventListener('input', renderBuilder);
form.addEventListener('change', renderBuilder);
form.addEventListener('submit', (e) => e.preventDefault());
sendBtn.addEventListener('click', () => onWaClick('builder', builderMsg));
renderBuilder();

// "Detalhar no formulário" a partir dos serviços
$$('.js-prefill').forEach((b) => {
  b.addEventListener('click', () => {
    const r = $(`input[name="servico"][value="${b.dataset.svc}"]`, form);
    if (r) { r.checked = true; renderBuilder(); }
    $('#orcamento').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  });
});

/* ---------- calculadora de BTU ---------- */
const SIZES = [9000, 12000, 18000, 24000, 30000, 36000, 48000, 60000];
const calc = $('#calc');
const area = $('#area');
const calcSend = $('#calcSend');
let calcMsg = DEFAULT_MSG;

function renderCalc() {
  const m2 = Number(area.value);
  const solVal = Number(new FormData(calc).get('sol'));
  const pessoas = Number($('#pessoas').textContent);
  const eletros = Number($('#eletros').textContent);

  const raw = m2 * solVal + Math.max(0, pessoas - 1) * 600 + eletros * 600;
  const size = SIZES.find((s) => s >= raw);

  $('#areaOut').textContent = m2;
  area.style.setProperty('--p', `${((m2 - area.min) / (area.max - area.min)) * 100}%`);
  $('#btuRaw').textContent = fmt(Math.round(raw));
  $('#btuOut').textContent = size ? fmt(size) : '60.000+';

  // posição na régua 9.000 · 12.000 · 18.000 · 24.000 · 30.000+
  const idx = !size || size >= 30000 ? 4 : [9000, 12000, 18000, 24000].indexOf(size);
  $('#scaleDot').style.left = `${(idx / 4) * 100}%`;

  const solTxt = solVal === 800 ? 'pega sol da tarde' : 'pouco sol ou só de manhã';
  const resultado = size ? `${fmt(size)} BTUs` : 'mais de 60.000 BTUs';
  $('#calcSendTxt').textContent = size ? `Orçar um de ${fmt(size)} BTUs` : 'Pedir um projeto sob medida';

  calcMsg = [
    'Olá, Clima Com! Vim pelo site e usei a calculadora de BTU.',
    '',
    `*Ambiente:* ${m2} m², ${solTxt}`,
    `*Pessoas:* ${pessoas} · *Eletrônicos:* ${eletros}`,
    `*Resultado:* ${resultado}`,
    '',
    'Quero um orçamento de *instalação*.',
  ].join('\n');
  calcSend.href = waUrl(calcMsg);
}
calc.addEventListener('input', renderCalc);
calc.addEventListener('change', renderCalc);
calcSend.addEventListener('click', () => onWaClick('calculadora', calcMsg));
renderCalc();

/* ---------- revelar ao rolar ---------- */
if ('IntersectionObserver' in window && !reduceMotion) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
  $$('.reveal').forEach((el) => {
    const sibs = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
    el.style.transitionDelay = `${(sibs.indexOf(el) % 4) * 60}ms`;
    io.observe(el);
  });
} else {
  $$('.reveal').forEach((el) => el.classList.add('is-in'));
}

/* ---------- vitrine: filtro + visualizador ---------- */
(function showcase() {
  const shots = $$('#showcase .shot');
  const filters = $$('.filter');
  const lb = $('#lightbox'), lbImg = $('#lbImg'), lbCap = $('#lbCap');
  let current = 0;

  filters.forEach((f) => f.addEventListener('click', () => {
    const cat = f.dataset.filter;
    filters.forEach((x) => { const on = x === f; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', String(on)); });
    $('#showcase').classList.toggle('is-filtered', cat !== 'all');
    shots.forEach((s) => {
      const show = cat === 'all' || s.dataset.cat === cat;
      s.hidden = !show;
      if (show) { s.style.animation = 'none'; void s.offsetWidth; s.style.animation = ''; }
    });
  }));

  const visible = () => shots.filter((s) => !s.hidden);
  function show(i) {
    const list = visible();
    current = (i + list.length) % list.length;
    const img = $('img', list[current]);
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    lbCap.textContent = $('.shot__cap', list[current]).lastChild.textContent.trim();
  }

  if (!lb || typeof lb.showModal !== 'function') return;
  shots.forEach((s) => $('.shot__btn', s).addEventListener('click', () => {
    show(visible().indexOf(s));
    lb.showModal();
    track('vitrine_open', s.dataset.cat);
  }));
  $('#lbClose').addEventListener('click', () => lb.close());
  $('#lbPrev').addEventListener('click', () => show(current - 1));
  $('#lbNext').addEventListener('click', () => show(current + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });
  // arrastar para os lados no celular
  let x0 = null;
  lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
    x0 = null;
  });
})();

/* ---------- barra fixa (celular) ---------- */
(function dock() {
  const dockEl = $('#dock');
  const state = { heroVisible: true, footerVisible: false, ctaZone: false };

  const update = () => {
    const show = !state.heroVisible && !state.footerVisible && !state.ctaZone;
    dockEl.classList.toggle('is-on', show);
    dockEl.setAttribute('aria-hidden', String(!show));
    $$('a', dockEl).forEach((a) => (a.tabIndex = show ? 0 : -1));
  };
  if (!('IntersectionObserver' in window)) { state.heroVisible = false; update(); return; }

  const watch = (el, key) => new IntersectionObserver(([en]) => { state[key] = en.isIntersecting; update(); }).observe(el);
  watch($('.hero__ctas'), 'heroVisible');
  watch($('#rodape'), 'footerVisible');

  // onde o botão de envio já está na tela (montador e calculadora), a barra some para não duplicar
  const zones = new Set();
  const zoneIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => (en.isIntersecting ? zones.add(en.target) : zones.delete(en.target)));
    state.ctaZone = zones.size > 0;
    update();
  }, { threshold: 0.35 });
  $$('.builder__out, .calc__res').forEach((el) => zoneIO.observe(el));
})();

$('#year').textContent = new Date().getFullYear();
