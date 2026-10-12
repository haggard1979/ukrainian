/* Shared building blocks for all pages: theme (light/dark), language preference, cross-stitch band, read-aloud.
   Load it in <head> without defer/async: it applies the stored theme before the first paint.
   Everything is exposed on window.UK; pages keep their own state (lang, store) and pass it in. */
(function(){
'use strict';
var UK=window.UK={};

/* ---------- light / dark: system default unless chosen; stored for all pages ---------- */
var THEME_KEY='ukrainian.theme';
try{var th=localStorage.getItem(THEME_KEY);if(th==='light'||th==='dark')document.documentElement.dataset.theme=th;}catch(e){}
var THEME_T={de:{dark:'Dunkles Design',light:'Helles Design'},en:{dark:'Dark mode',light:'Light mode'}};
var MOON='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="currentColor"/></svg>';
var SUN='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
var darkMq=window.matchMedia?window.matchMedia('(prefers-color-scheme: dark)'):null;
function isDark(){var t=document.documentElement.dataset.theme;return t?t==='dark':!!(darkMq&&darkMq.matches);}
/* updates the #theme-toggle button (icon and label in the current interface language) */
UK.renderTheme=function(lang){
  var b=document.getElementById('theme-toggle');if(!b)return;
  var d=isDark(),label=THEME_T[lang==='en'?'en':'de'][d?'light':'dark'];
  b.innerHTML=d?SUN:MOON;b.title=label;b.setAttribute('aria-label',label);
};
/* wires the toggle; getLang returns the page's current interface language */
UK.initTheme=function(getLang){
  var b=document.getElementById('theme-toggle');
  function render(){UK.renderTheme(getLang());}
  if(b)b.addEventListener('click',function(){
    var t=isDark()?'light':'dark';
    document.documentElement.dataset.theme=t;
    try{localStorage.setItem(THEME_KEY,t);}catch(e){}
    render();
  });
  if(darkMq&&darkMq.addEventListener)darkMq.addEventListener('change',render);
  render();
};

/* ---------- interface language: stored for all pages, default from the browser ---------- */
var LANG_KEY='ukrainian.lang';
UK.initialLang=function(){
  var lang='de';
  try{var s=localStorage.getItem(LANG_KEY);if(s==='de'||s==='en')lang=s;else if(!/^de\b/i.test(navigator.language||'de'))lang='en';}catch(e){}
  return lang;
};
UK.storeLang=function(l){try{localStorage.setItem(LANG_KEY,l);}catch(e){}};

/* ---------- cross-stitch band: fills <pattern id="stitch-tile"> ---------- */
UK.stitch=function(){
  var tile=document.getElementById('stitch-tile');if(!tile)return;
  var h='';
  for(var y=0;y<7;y++)for(var x=0;x<16;x++){
    var d1=Math.abs(x-4)+Math.abs(y-3), ax=Math.abs(x-12), ay=Math.abs(y-3), c='';
    if(d1===3) c='sa'; else if(d1<=1) c='sb';
    else if(ax===ay&&ay<=2) c=ay===0?'sa':'sb';
    if(c) h+='<rect class="'+c+'" x="'+x+'" y="'+y+'" width="1" height="1"/>';
  }
  tile.innerHTML=h;
};

/* ---------- read aloud (Web Speech API, needs a Ukrainian voice on the device) ---------- */
var tts=('speechSynthesis' in window)&&typeof SpeechSynthesisUtterance!=='undefined',ukVoice=null;
var SPEAKER='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
function pickVoice(){
  if(!tts)return;
  ukVoice=(speechSynthesis.getVoices()||[]).filter(function(v){return /^uk([-_]|$)/i.test(v.lang);})[0]||null;
}
if(tts){pickVoice();if(speechSynthesis.addEventListener)speechSynthesis.addEventListener('voiceschanged',pickVoice);else speechSynthesis.onvoiceschanged=pickVoice;}
else document.documentElement.classList.add('no-tts');
/* speaks Ukrainian text; without a Ukrainian voice it shows #say-note instead of using another language */
UK.speak=function(text){
  if(!tts||!text)return;
  if(!ukVoice)pickVoice();
  var note=document.getElementById('say-note');if(note)note.hidden=!!ukVoice;
  if(!ukVoice)return;
  speechSynthesis.cancel();
  var u=new SpeechSynthesisUtterance(text);u.voice=ukVoice;u.lang=ukVoice.lang;u.rate=.9;
  speechSynthesis.speak(u);
};
/* turns a button into a speaker button that reads getText() */
UK.sayButton=function(btn,getText){
  btn.type='button';btn.innerHTML=SPEAKER;
  btn.addEventListener('click',function(){UK.speak(getText());});
  return btn;
};
/* the #auto-say chip toggles store.say; save() persists the page's store */
UK.initAutoSay=function(store,save){
  var b=document.getElementById('auto-say');if(!b)return;
  function render(){b.setAttribute('aria-pressed',String(!!store.say));}
  b.addEventListener('click',function(){store.say=!store.say;save();render();});
  render();
};
})();
