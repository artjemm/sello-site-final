/* Sello v2 landing — interactions */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- smooth scroll (Lenis) — a "manteiga" do getquoti/Linear ----------
     Scroll real (não transform): sticky/fixed, IntersectionObserver e o fade do
     hero seguem funcionando. Desligado em reduced-motion; toque fica nativo
     (mobile já tem momentum próprio — evita sensação de lag). */
  var lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true });
    window.lenis = lenis;
    (function raf(time){ lenis.raf(time); requestAnimationFrame(raf); })(performance.now());
  }

  /* ---------- scroll: nav state + hero text fade-out (estilo Novu) ---------- */
  var nav = document.getElementById('nav');
  var hero = document.querySelector('.hero');
  var heroContent = document.querySelector('.hero__content');
  var sTick = false;
  function onNav(){
    if (sTick) return; sTick = true;
    requestAnimationFrame(function(){
      // light frosted nav only once the white sheet reaches the nav (stays transparent over the dark hero)
      var trig = (hero ? hero.offsetHeight : 640) - 64;
      if (nav) nav.classList.toggle('is-scrolled', scrollY > trig);
      if (heroContent && !reduce){
        var p = Math.min(1, Math.max(0, scrollY / (innerHeight * 0.62)));
        heroContent.style.opacity = (1 - p).toFixed(3);
        // parallax compoe com o offset base (--hero-shift) definido no CSS
        heroContent.style.setProperty('--hero-parallax', (-p * 60).toFixed(1) + 'px');
      }
      sTick = false;
    });
  }
  addEventListener('scroll', onNav, {passive:true}); onNav();

  /* ---------- airport split-flap buttons ---------- */
  [].forEach.call(document.querySelectorAll('.btn__t'), function(t){
    var txt = t.textContent, frag = document.createDocumentFragment();
    for (var i=0;i<txt.length;i++){
      var ch = txt[i] === ' ' ? ' ' : txt[i];
      var c = document.createElement('span'); c.className='c'; c.style.setProperty('--i', i);
      var a = document.createElement('span'); a.textContent = ch;
      var b = document.createElement('span'); b.textContent = ch;
      c.appendChild(a); c.appendChild(b); frag.appendChild(c);
    }
    t.textContent=''; t.appendChild(frag);
  });

  /* ---------- stats: dígitos rolando (split-flap/odômetro) ao entrar na tela ---------- */
  var statGrid = document.querySelector('.stats__grid');
  var statNums = [].slice.call(document.querySelectorAll('.statc__n'));
  if (statGrid && statNums.length){
    statNums.forEach(function(el){
      var txt = el.textContent.trim(), frag = document.createDocumentFragment(), reels = [];
      for (var i=0;i<txt.length;i++){
        var ch = txt.charAt(i);
        if (ch>='0' && ch<='9'){
          var T=+ch, roll=document.createElement('span'), strip=document.createElement('span'), h='';
          roll.className='roll'; strip.className='roll__s';
          for (var k=0;k<=9;k++) h+='<i>'+k+'</i>';
          for (var k2=0;k2<=T;k2++) h+='<i>'+k2+'</i>';
          strip.innerHTML=h; roll.appendChild(strip); frag.appendChild(roll);
          reels.push({s:strip, d:10+T});
        } else {
          var x=document.createElement('span'); x.className='roll-x'; x.textContent=ch; frag.appendChild(x);
        }
      }
      el.textContent=''; el.appendChild(frag);
      var card=el.closest('.statc');
      el._reels=reels;
      el._base=(parseFloat(getComputedStyle(card).getPropertyValue('--d'))||0)*1000;
    });
    var runRoll=function(){
      statNums.forEach(function(el){
        el._reels.forEach(function(r,j){
          r.s.style.transitionDelay=(el._base+460+j*55)+'ms';
          r.s.style.transform='translateY(-'+r.d+'em)';
        });
      });
    };
    if (reduce){
      statNums.forEach(function(el){ el._reels.forEach(function(r){ r.s.style.transition='none'; r.s.style.transform='translateY(-'+r.d+'em)'; }); });
    } else if ('IntersectionObserver' in window){
      var sio=new IntersectionObserver(function(en){
        en.forEach(function(x){ if(x.isIntersecting){ runRoll(); sio.disconnect(); } });
      }, {threshold:0.25});
      sio.observe(statGrid);
    } else { runRoll(); }
  }

  /* ---------- reveal (reusable; works for elements added later) ---------- */
  var io = null;
  if (!reduce && 'IntersectionObserver' in window){
    io = new IntersectionObserver(function(en){
      en.forEach(function(x){
        if(x.isIntersecting){
          var d = parseInt(x.target.getAttribute('data-delay')||'0',10);
          x.target.style.transitionDelay = (d*90)+'ms';
          x.target.classList.add('is-in'); io.unobserve(x.target);
        }
      });
    }, {rootMargin:'0px 0px -8% 0px', threshold:0.12});
  }
  function reveal(el){ if(!io){ el.classList.add('is-in'); } else { io.observe(el); } }
  [].forEach.call(document.querySelectorAll('[data-reveal]'), reveal);

  /* ---------- Anton SC headings: word-rise (GSAP SplitText, vanilla) ----------
     Wrap every word in <span.w-mask><span.w-in>; words sit at translateY(110%) (hidden behind
     their own clip) and rise to 0 staggered 40ms, via the shared reveal observer. Recurses into
     child elements (e.g. .accent, .line) and preserves <br> so nested markup keeps its styling. */
  function splitFrag(node){
    var frag = document.createDocumentFragment();
    [].forEach.call(node.childNodes, function(ch){
      if (ch.nodeType === 3){
        ch.nodeValue.split(/(\s+)/).forEach(function(tok){
          if (tok === '') return;
          if (/^\s+$/.test(tok)){ frag.appendChild(document.createTextNode(' ')); return; }
          var m = document.createElement('span'); m.className = 'w-mask';
          var w = document.createElement('span'); w.className = 'w-in'; w.textContent = tok;
          m.appendChild(w); frag.appendChild(m);
        });
      } else if (ch.nodeType === 1){
        if (ch.tagName === 'BR'){ frag.appendChild(ch.cloneNode(false)); }
        else { var el = ch.cloneNode(false); el.appendChild(splitFrag(ch)); frag.appendChild(el); }
      }
    });
    return frag;
  }
  [].forEach.call(document.querySelectorAll('[data-split]'), function(h){
    var f = splitFrag(h);
    while (h.firstChild) h.removeChild(h.firstChild);
    h.appendChild(f);
    [].forEach.call(h.querySelectorAll('.w-in'), function(w,i){ w.style.transitionDelay = (i*0.04) + 's'; });
    h.classList.add('split-ready');
    reveal(h); // shared IO adds .is-in on scroll-in (or instantly when reduced-motion/no-IO)
  });

  /* ---------- play-once-on-scroll: dispara o demo 1x quando entra na viewport, depois solta
     (mesmo idioma do odômetro de stats: IntersectionObserver + disconnect). Sem IO → roda já. ---------- */
  function playOnce(el, start){
    if (!el) return;
    if (!('IntersectionObserver' in window)){ start(); return; }
    // threshold:0 + margem inferior negativa → dispara quando o topo do demo sobe ~22% da viewport,
    // independente da altura (telefones são mais altos que a tela, então um ratio fixo nunca fecharia).
    var ob = new IntersectionObserver(function(en){
      en.forEach(function(x){ if (x.isIntersecting){ ob.disconnect(); start(); } });
    }, {rootMargin:'0px 0px -22% 0px', threshold:0});
    ob.observe(el);
  }

  /* ---------- live phones: hover-scroll distance (exact to screen bottom) ---------- */
  function setScrollVars(){
    [].forEach.call(document.querySelectorAll('.lphone'), function(ph){
      if (ph.classList.contains('lphone--avalie')) return; // avalie animates a sheet, not a scroll
      var scr = ph.querySelector('.lphone__scr'), img = scr && scr.querySelector('.lphone__img');
      if(!img) return;
      var apply = function(){
        var sh = scr.clientHeight, iw = scr.clientWidth;
        var ih = iw * (img.naturalHeight/img.naturalWidth);
        var dist = Math.max(0, ih - sh);
        ph.style.setProperty('--sy', '-'+dist.toFixed(0)+'px');
      };
      if(img.complete && img.naturalWidth) apply(); else img.addEventListener('load', apply);
    });
  }
  setScrollVars(); addEventListener('resize', setScrollVars, {passive:true});

  /* ---------- steps carousel: arrows + drag ---------- */
  var track = document.querySelector('[data-steps-track]');
  if (track){
    var nextB=document.querySelector('[data-steps-next]'), prevB=document.querySelector('[data-steps-prev]');
    function stepW(){ var c=track.querySelector('.scard'); return c ? c.getBoundingClientRect().width+24 : 360; }
    if(nextB) nextB.onclick=function(){ track.scrollBy({left:stepW(),behavior:'smooth'}); };
    if(prevB) prevB.onclick=function(){ track.scrollBy({left:-stepW(),behavior:'smooth'}); };
    enableDrag(track, function(dx){ track.scrollLeft -= dx; });
  }

  /* generic pointer drag (horizontal) */
  function enableDrag(el, onMove){
    var down=false, lastX=0, moved=0;
    el.addEventListener('pointerdown', function(e){ down=true; moved=0; lastX=e.clientX; el.classList.add('is-drag'); el.setPointerCapture&&el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', function(e){ if(!down) return; var dx=e.clientX-lastX; lastX=e.clientX; moved+=Math.abs(dx); onMove(dx); });
    function up(){ down=false; el.classList.remove('is-drag'); }
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up);
    el.addEventListener('click', function(e){ if(moved>6){ e.preventDefault(); e.stopPropagation(); } }, true);
    return function(){ return moved; };
  }

  /* ---------- reviews: 2 carrosséis em sentidos opostos (slideshow puro) ---------- */
  var star='<svg viewBox="0 0 24 24"><path d="m12 17.27 4.15 2.51c.76.46 1.69-.22 1.49-1.08l-1.1-4.72 3.67-3.18c.67-.58.31-1.68-.57-1.75l-4.83-.41-1.89-4.46c-.34-.81-1.5-.81-1.84 0L9.19 8.63l-4.83.41c-.88.07-1.24 1.17-.57 1.75l3.67 3.18-1.1 4.72c-.2.86.73 1.54 1.49 1.08z"/></svg>';
  var REVIEWS={                                            // pessoas (nome+foto) do Figma 2091:291; textos fornecidos pelo user (12 dos 15)
    '1':[
      {a:'rev-giovanna.png', n:'Giovanna C.', q:'Achei um japonês que eu provavelmente nunca teria encontrado sozinha. Já virou um dos meus favoritos.'},
      {a:'rev-nicolas.png',  n:'Nicolas K.',  q:'Gostei que as recomendações parecem ter um motivo. Não é só uma lista dos restaurantes mais famosos.'},
      {a:'rev-tarcisio.png', n:'Tarcísio M.', q:'O guia de bares salvou nossa sexta. Todo mundo gostou do lugar.'},
      {a:'rev-thales.png',   n:'Thales V.',   q:'Tenho o hábito de salvar lugares no Instagram e nunca lembrar depois. Aqui ficou muito mais organizado.'},
      {a:'rev-joao.png',     n:'João T.',     q:'As descrições ajudam mais do que as notas. Dá pra entender se o restaurante combina com o momento.'},
      {a:'rev-beatriz.png',  n:'Beatriz L.',  q:'Acabei conhecendo um bairro novo por causa de um restaurante que apareceu aqui.'}
    ],
    '2':[
      {a:'rev-mayara.png',   n:'Mayara M.',   q:'Já deixei de ir em lugar hypado porque a descrição mostrava exatamente o tipo de experiência que eu não queria.'},
      {a:'rev-brenda.png',   n:'Brenda A.',   q:'Gostei que não parece uma rede social. Entro, escolho um lugar e pronto.'},
      {a:'rev-joao-a.png',   n:'João A.',     q:'Achei legal que os guias não são óbvios. Descobri lugares que eu nunca tinha visto em outras listas.'},
      {a:'rev-gabriel.png',  n:'Gabriel V.',  q:'Sempre travava quando alguém perguntava ‘onde vamos comer?’. Agora já tenho várias opções salvas.'},
      {a:'rev-pamela.png',   n:'Pamela K.',   q:'É aquele tipo de app que você abre quando quer uma boa ideia, não quando quer ficar rolando infinitamente.'},
      {a:'rev-fernanda.png', n:'Fernanda S.', q:'Gostei de ver que nem todo restaurante famoso está recomendado. Dá a sensação de que alguém realmente escolheu.'}
    ]
  };
  function rcard(d){ return '<article class="rcard"><div class="rcard__stars" role="img" aria-label="5 estrelas">'+star+star+star+star+star+'</div><p class="rcard__quote">&ldquo;'+d.q+'&rdquo;</p><div class="rcard__by"><img class="rcard__av" src="assets/avatars/'+d.a+'" alt="" decoding="async" width="44" height="44" />'+d.n+'</div></article>'; }
  /* marquees rodam em CSS keyframes (compositor): rAF por frame congela no iOS real (Low Power/ProMotion)
     e lia scrollWidth todo frame (layout forçado). JS só monta 2 conjuntos (2º = clone aria-hidden, loop
     sem costura) e mede o período pra manter a velocidade exata em px/s via --mq-dur. */
  function mqBuild(el, setHtml, cls, pxPerSec){
    if (reduce){ el.innerHTML = '<div class="'+cls+'">'+setHtml+'</div>'; return; } // sem animação: 1 conjunto, vira faixa rolável (CSS reduced-motion)
    el.innerHTML = '<div class="'+cls+'">'+setHtml+'</div><div class="'+cls+'" aria-hidden="true">'+setHtml+'</div>';
    var measure = function(){ var w = el.firstElementChild.getBoundingClientRect().width; if (w>0) el.style.setProperty('--mq-dur', (w/pxPerSec).toFixed(2)+'s'); };
    measure();
    if (window.ResizeObserver){ new ResizeObserver(measure).observe(el.firstElementChild); } // re-mede quando CSS/fonts/viewport mudarem o período
    else { addEventListener('resize', measure); addEventListener('load', measure); }
  }
  [].forEach.call(document.querySelectorAll('[data-marquee]'), function(mq){
    var data = REVIEWS[mq.getAttribute('data-row')] || REVIEWS['1'];
    mqBuild(mq, data.map(function(d){ return rcard(d); }).join(''), 'marquee__set', 30); // 30px/s = 0.5px/frame@60 de antes
  });

  /* ---------- city wall: mosaico flex misturado; hover expande o box+coluna e os outros se ajustam (flex-grow, smooth); stretch-in; sem repetir foto ---------- */
  var wall = document.querySelector('[data-city-wall]');
  if (wall){
    var POOL=[29,30,31,26,12,13,15,17,18,27,28,16,8,19,10,4]; // curados profissionais: pizzas, burger, pratos montados (sem garfo/porção/bebida)
    var COLS=[                                            // +tiles, sem retângulo gigante; larguras variadas -> mosaico misturado
      {w:1.0,  h:[1,0.85,1.15]},
      {w:0.82, h:[1.1,0.9]},
      {w:1.12, h:[0.9,1.2,0.85]},
      {w:1.15, h:[1,1.15,0.9]},
      {w:0.78, h:[0.95,1.1]},
      {w:0.95, h:[1.1,0.85,1.0]}
    ];
    var dsrc=function(n){ return 'assets/dishes/d'+(n<10?'0':'')+n+'.jpg?v=2'; };
    var used=Object.create(null);
    var take=function(){                                  // 1 prato livre do acervo curado: nenhum box repete foto
      var a=[],i; for(i=0;i<POOL.length;i++){ if(!used[POOL[i]]) a.push(POOL[i]); }
      if(!a.length){ a=POOL.slice(); }
      return a[Math.floor(Math.random()*a.length)];
    };
    var html='';
    for(var c=0;c<COLS.length;c++){
      html+='<div class="city__col" style="--w:'+COLS[c].w+'">';
      for(var r=0;r<COLS[c].h.length;r++){
        var d=take(); used[d]=1;
        html+='<div class="city__tile" style="--h:'+COLS[c].h[r]+'" data-cur="'+d+'">'
            +'<img src="'+dsrc(d)+'" alt="" decoding="async">'
            +'</div>';
      }
      html+='</div>';
    }
    wall.innerHTML=html;

    var tiles=[].slice.call(wall.querySelectorAll('.city__tile'));
    if(reduce){ tiles.forEach(function(t){ t.classList.add('is-in'); }); }
    else {
      var shown=false, cio=new IntersectionObserver(function(en){
        en.forEach(function(x){
          if(x.isIntersecting && !shown){ shown=true;
            tiles.forEach(function(t,i){ setTimeout(function(){ t.classList.add('is-in'); }, i*45); });
            cio.disconnect();
          }
        });
      }, {threshold:0.12});
      cio.observe(wall);
    }
  }

  /* ---------- FAQ accordion ---------- */
  [].forEach.call(document.querySelectorAll('.faq__q'), function(btn){
    var panel = btn.nextElementSibling;
    btn.addEventListener('click', function(){
      var open = btn.getAttribute('aria-expanded')==='true';
      [].forEach.call(document.querySelectorAll('.faq__q'), function(b){ if(b!==btn){ b.setAttribute('aria-expanded','false'); b.nextElementSibling.style.height='0px'; } });
      if(open){ btn.setAttribute('aria-expanded','false'); panel.style.height='0px'; }
      else { btn.setAttribute('aria-expanded','true'); panel.style.height = panel.scrollHeight+'px'; }
    });
  });

  /* Foto da FAQ fica ESTÁTICA: a célula .faq__media é align-self:stretch e a
     img usa height:calc(100% + …) — abrir uma resposta crescia a linha do grid
     e a foto "ampliava" (object-fit:cover re-enquadra). Trava a célula na
     altura do estado fechado (mede o stretch e desconta respostas abertas);
     re-mede em resize/fonts. */
  var faqMedia = document.querySelector('.faq__media');
  if (faqMedia){
    var faqFreeze = function(){
      if (getComputedStyle(faqMedia).display === 'none') return;   // mobile esconde a foto
      faqMedia.style.height = 'auto';
      var openH = 0;
      [].forEach.call(document.querySelectorAll('.faq__a'), function(a){ openH += a.offsetHeight; });
      faqMedia.style.height = (faqMedia.offsetHeight - openH) + 'px';
    };
    faqFreeze();
    addEventListener('resize', faqFreeze);
    addEventListener('load', faqFreeze);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(faqFreeze);
  }

  /* ---------- DE SUA NOTA: slider corre + nota muda (loop contínuo) ---------- */
  var notaEl = document.querySelector('[data-nota]');
  if (notaEl && !reduce){
    var notaBox = notaEl.closest('.nota'), N_DUR=2200, nStart=null;
    var notaSet = function(p){ notaBox.style.setProperty('--p', p.toFixed(3)); notaEl.textContent=(p*10).toFixed(1); };
    var notaStep = function(ts){
      if(nStart==null) nStart=ts;
      var t=Math.min(1,(ts-nStart)/N_DUR), e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
      notaSet(0.5+0.4*e);
      if(t<1) requestAnimationFrame(notaStep);          // anima 1x e congela em 9,0
    };
    notaSet(0.5);                                        // frame base antes de entrar na tela
    playOnce(notaBox, function(){ nStart=null; requestAnimationFrame(notaStep); });
  }

  /* ---------- EXPLORE mapa: transição (crossfade) entre as telas reais (fotos do user) ---------- */
  var mapScr = document.querySelector('[data-map]');
  if (mapScr && !reduce){
    var slides = mapScr.querySelectorAll('.map-slide');
    if (slides.length > 1){
      playOnce(mapScr, function(){
        var mi = 0;
        var advance = function(){                        // crossfade cada tela 1x, congela na última
          slides[mi].classList.remove('is-on');
          mi++;
          slides[mi].classList.add('is-on');
          if (mi < slides.length - 1) setTimeout(advance, 2400);
        };
        setTimeout(advance, 2400);                        // mostra a 1ª por um beat antes de trocar
      });
    }
  }

  /* ---------- auto-pan estilo GIF: começa logo, roda contínuo, independente de scroll/hover ---------- */
  if (!reduce) [].forEach.call(document.querySelectorAll('[data-pan]'), function(panPh, pIdx){
    var pImg = panPh.querySelector('.lphone__img'), pScr = panPh.querySelector('.lphone__scr'), armed = false;
    var panTo = function(down){
      var dist = Math.max(0, pImg.clientHeight - pScr.clientHeight);
      if (dist < 8) return;
      pImg.style.transform = 'translateY(' + (down ? -dist : 0).toFixed(0) + 'px)';
    };
    var panStart = function(){                            // rola topo→fim 1x e congela embaixo
      if (armed) return; armed = true;
      pImg.style.transform = 'translateY(0)';
      setTimeout(function(){ panTo(true); }, 350 + pIdx * 180);
    };
    playOnce(panPh, function(){ if (pImg.complete && pImg.naturalWidth) panStart(); else pImg.addEventListener('load', panStart); });
    addEventListener('resize', function(){ if (armed) panTo(true); }, {passive:true});
  });

  /* ---------- AVALIE: sheet sobe → slider/nota animam → "Continuar" → crossfade "veredito enviado" (loop) ---------- */
  var rv = document.querySelector('[data-review]');
  if (rv && !reduce){
    var rvSheet = rv.querySelector('.vnota'), rvNum = rv.querySelector('[data-review-num]');
    var rvSet = function(p){ rvSheet.style.setProperty('--p', p.toFixed(3)); rvNum.textContent = (p*10).toFixed(1); };
    var rvSlide = function(target, dur){
      var from = parseFloat(rvSheet.style.getPropertyValue('--p')) || 0.5, start = null;
      var step = function(ts){ if(start==null) start=ts; var t=Math.min(1,(ts-start)/dur); var e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2; rvSet(from+(target-from)*e); if(t<1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    };
    var rvRun = function(){                               // toca 1x e congela mostrando "veredito enviado"
      rv.classList.remove('is-sent','is-press'); rvSet(0.5);
      rv.classList.add('is-open');
      setTimeout(function(){ rvSlide(0.9, 1600); }, 800);
      setTimeout(function(){ rv.classList.add('is-press'); }, 2900);
      setTimeout(function(){ rv.classList.remove('is-press'); rv.classList.add('is-sent'); }, 3250);
    };
    rvSet(0.5);
    playOnce(rv, rvRun);
  }

  /* ---------- GAMEFICAÇÃO: trocar de chip (Geral/Exploração/Influência) reordena as pessoas do ranking ---------- */
  var rk = document.querySelector('[data-rank]');
  if (rk){
    var rkf = [].slice.call(rk.querySelectorAll('.rkf')), rkScr = rk.querySelector('.lphone__scr');
    if (rkf.length && !reduce){
      var rki = 0;
      var rkShow = function(i){ rkf.forEach(function(f,k){ f.classList.toggle('is-on', k===i); }); };
      var rkNext = function(){ if (rki >= rkf.length - 1) return; rki++; rkLoop(); };   // para e congela no último ranking
      var rkLoop = function(){
        rkShow(rki);
        if (rki === 0){                                  // FEED: rola até embaixo, volta ao topo, depois segue
          var feed = rkf[0], dist = Math.max(0, feed.clientHeight - rkScr.clientHeight);
          feed.style.transform = 'translateY(0)';
          setTimeout(function(){ feed.style.transform = 'translateY(' + (-dist).toFixed(0) + 'px)'; }, 800);
          setTimeout(function(){ feed.style.transform = 'translateY(0)'; }, 3600);
          setTimeout(rkNext, 6600);
        } else {                                         // RANKING: troca de chip (crossfade)
          setTimeout(rkNext, 2400);
        }
      };
      playOnce(rk, function(){ rkShow(0); rkLoop(); });   // começa ao rolar até o ranking; toca 1x
    }
  }

  /* ---------- SELLO watermark: carrossel de 2 linhas em sentidos opostos ---------- */
  [].forEach.call(document.querySelectorAll('[data-swm]'), function(row){
    mqBuild(row, row.innerHTML, 'swm__set', 19.2); // 19.2px/s = 0.32px/frame@60 de antes
  });

  /* ---------- guias: carrossel horizontal (desliza p/ esquerda, fade vermelho na borda) ---------- */
  [].forEach.call(document.querySelectorAll('[data-gmarquee]'), function(track){
    mqBuild(track, track.innerHTML, 'gmarquee__set', 25.2); // 25.2px/s = 0.42px/frame@60 de antes
  });

  /* ---------- download modal (todos os "BAIXAR APP" abrem o modal) ---------- */
  (function(){
    // App publicado — links reais. Preencher aqui habilita os botões e força
    // target="_blank" (abre em nova aba) em todas as páginas que têm o modal.
    var STORES = {
      ios: 'https://apps.apple.com/br/app/sello/id6791353216',
      android: 'https://play.google.com/store/apps/details?id=com.sello.app'
    };
    var modal = document.getElementById('dl-modal');
    if (!modal) return;
    var card = modal.querySelector('.dlm__card');
    var FOCUS = 'a[href],button:not([disabled]),input,[tabindex]:not([tabindex="-1"])';
    var lastFocus = null, hideT = null;

    [].forEach.call(modal.querySelectorAll('[data-store]'), function(a){
      var url = STORES[a.getAttribute('data-store')];
      if (url){ a.href = url; a.target = '_blank'; a.rel = 'noopener'; }
      else { a.setAttribute('aria-disabled', 'true'); a.addEventListener('click', function(e){ e.preventDefault(); }); }
    });

    function open(){
      lastFocus = document.activeElement;
      clearTimeout(hideT);
      modal.hidden = false;
      requestAnimationFrame(function(){ modal.classList.add('is-open'); });
      document.documentElement.style.overflow = 'hidden';
      if (lenis) lenis.stop();                               // congela a inércia do scroll atrás do modal
      var x = modal.querySelector('.dlm__x'); if (x) x.focus();
      document.addEventListener('keydown', onKey);
    }
    function close(){
      modal.classList.remove('is-open');
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = '';
      if (lenis) lenis.start();                              // retoma o smooth scroll
      var done = false;
      function hide(){ if (done) return; done = true; modal.hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
      card.addEventListener('transitionend', hide, { once: true });
      hideT = setTimeout(hide, 380);
    }
    function onKey(e){
      if (e.key === 'Escape'){ close(); return; }
      if (e.key !== 'Tab') return;
      var f = [].filter.call(card.querySelectorAll(FOCUS), function(el){ return el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
    [].forEach.call(modal.querySelectorAll('[data-dl-close]'), function(el){ el.addEventListener('click', close); });
    [].forEach.call(document.querySelectorAll('.btn--app, [data-cta="download"]'), function(btn){
      btn.addEventListener('click', function(e){ e.preventDefault(); open(); });
    });
  })();

  /* ---------- âncoras internas: scroll suave mantendo a URL limpa (sem #hash) ---------- */
  (function(){
    // estes abrem o modal / têm handler próprio — não interceptar
    var SKIP = '.btn--app,[data-cta="download"],[data-store]';
    document.addEventListener('click', function(e){
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || a.matches(SKIP)) return;
      var id = a.getAttribute('href').slice(1);
      var target = id ? document.getElementById(id) : null;
      e.preventDefault();                                  // sem pulo nativo nem #hash na barra
      if (id === 'top') { if (lenis) lenis.scrollTo(0); else scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); }   // logo → topo
      else if (target) { if (lenis) lenis.scrollTo(target); else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }
      // href="#" sem destino (links de rodapé ainda sem página): só previne o pulo, não rola
      if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    });
  })();
})();

/* "Nos contate": o clique nunca fica mudo. Copia o e-mail + mostra um toast,
   e NÃO previne o mailto — quem tem app de e-mail configurado, abre também.
   Assim funciona em qualquer aparelho, com ou sem cliente de e-mail. */
(function(){
  var toastEl, toastTimer;
  function toast(msg){
    if(!toastEl){
      toastEl = document.createElement('div');
      toastEl.setAttribute('role','status');
      toastEl.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(12px);'
        + 'background:#0D111B;color:#fff;font:600 14px/1.2 system-ui,-apple-system,Segoe UI,sans-serif;'
        + 'padding:12px 18px;border-radius:999px;box-shadow:0 8px 24px rgba(0,0,0,.28);'
        + 'z-index:99999;opacity:0;transition:opacity .18s ease,transform .18s ease;pointer-events:none;'
        + 'max-width:90vw;text-align:center';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    requestAnimationFrame(function(){
      toastEl.style.opacity = '1';
      toastEl.style.transform = 'translateX(-50%) translateY(0)';
    });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){
      toastEl.style.opacity = '0';
      toastEl.style.transform = 'translateX(-50%) translateY(12px)';
    }, 2600);
  }
  function copyText(text){
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text)['catch'](function(){ legacyCopy(text); });
    } else { legacyCopy(text); }
  }
  function legacyCopy(text){
    try{
      var t = document.createElement('textarea');
      t.value = text;
      t.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
      document.body.appendChild(t); t.focus(); t.select();
      document.execCommand('copy');
      document.body.removeChild(t);
    }catch(e){}
  }
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[data-mailcopy]');
    if(!a) return;
    var email = a.getAttribute('data-mailcopy');
    copyText(email);
    toast('E-mail copiado: ' + email);
  });
})();
