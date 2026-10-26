/* Akira Connected v2.1 — helps users distinguish the new build from legacy APK. */
(()=>{
 const VERSION='Akira v2.1.0 • Connected';
 const settings=document.getElementById('sh');
 if(!settings)return;
 const add=()=>{
  const logout=settings.querySelector('#lo');
  if(!logout||settings.querySelector('#akiraReleaseInfo'))return;
  const info=document.createElement('div');
  info.id='akiraReleaseInfo';
  info.style.cssText='text-align:center;margin:16px 0 8px;color:#baadcf;font:12px system-ui';
  info.textContent=VERSION;
  const admin=document.createElement('a');
  admin.href='admin.html';admin.textContent='🔐 Admin Control Center (staff login)';
  admin.rel='noopener noreferrer';admin.target='_blank';
  admin.style.cssText='display:block;text-align:center;margin:8px 0;color:#d8b3ff;font:13px system-ui';
  info.appendChild(admin);
  logout.insertAdjacentElement('beforebegin',info);
 };
 new MutationObserver(add).observe(settings,{childList:true});
 add();
})();
