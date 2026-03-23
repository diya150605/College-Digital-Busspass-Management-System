// Shared behavior for language toggle and support modal
(function(){
  function initLangButtons(){
    const saved = localStorage.getItem('guni-lang') || 'en';
    setLang(saved);
    document.querySelectorAll('.actions .lang').forEach(btn=>{
      btn.textContent = (saved === 'en') ? 'EN' : saved.toUpperCase();
      btn.addEventListener('click', ()=>{
        const cur = document.documentElement.lang || 'en';
        const next = (cur === 'en') ? 'hi' : 'en';
        setLang(next);
      });
    });
  }

  function setLang(code){
    document.documentElement.lang = code;
    localStorage.setItem('guni-lang', code);
    document.querySelectorAll('.actions .lang').forEach(b=> b.textContent = (code==='en')? 'EN' : code.toUpperCase());
  }

  function initSupportButtons(){
    document.querySelectorAll('.actions .support').forEach(btn=>{
      btn.addEventListener('click', openSupport);
    });
  }

  function openSupport(){
    if(document.querySelector('.ga-modal-backdrop')) return;
    const backdrop = document.createElement('div');
    backdrop.className = 'ga-modal-backdrop';
    backdrop.innerHTML = `
      <div class="ga-modal" role="dialog" aria-modal="true">
        <h3>Support</h3>
        <p>For help, email: <a href="mailto:info@ganpatuniversity.ac.in">info@ganpatuniversity.ac.in</a> or call +91 2763 235100</p>
        <div class="ga-actions">
          <a class="btn primary" href="mailto:info@ganpatuniversity.ac.in">Email</a>
          <button class="btn ghost ga-close">Close</button>
        </div>
      </div>`;
    document.body.appendChild(backdrop);
    backdrop.querySelector('.ga-close').addEventListener('click', ()=> backdrop.remove());
    backdrop.addEventListener('click', (e)=>{ if(e.target === backdrop) backdrop.remove(); });
  }

  // init on DOM ready
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ()=>{ initLangButtons(); initSupportButtons(); });
  } else {
    initLangButtons(); initSupportButtons();
  }

})();
