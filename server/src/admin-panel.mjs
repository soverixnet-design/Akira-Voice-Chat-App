import { readFileSync, existsSync } from 'node:fs';

const securityHeaders={
  'content-type':'text/html; charset=utf-8',
  'cache-control':'no-store',
  'x-content-type-options':'nosniff',
  'referrer-policy':'no-referrer',
  'content-security-policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'self' https://api.soverixnet.online; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
};

export function serveAdmin(req,res,url){
  if(req.method!=='GET')return false;
  let file;
  if(['/admin-v2','/admin-v2/'].includes(url.pathname))file='./admin-v2.html';
  else if(['/admin','/admin/'].includes(url.pathname))file='./admin.html';
  else if(['/admin-legacy','/admin-legacy/'].includes(url.pathname))file='./admin-legacy.html';
  else return false;
  let target=new URL(file,import.meta.url);
  // Preserve original live admin HTML; when absent in a clean checkout,
  // serve the maintained web admin only for the main /admin route.
  if(!existsSync(target) && file==='./admin.html')target=new URL('../../web/admin.html',import.meta.url);
  if(!existsSync(target))return false;
  res.writeHead(200,securityHeaders);
  res.end(readFileSync(target));
  return true;
}
