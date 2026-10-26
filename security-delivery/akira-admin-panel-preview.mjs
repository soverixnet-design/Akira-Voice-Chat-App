import { readFileSync } from 'node:fs';

const securityHeaders={
  'content-type':'text/html; charset=utf-8',
  'cache-control':'no-store',
  'x-content-type-options':'nosniff',
  'referrer-policy':'no-referrer',
  'content-security-policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
};

export function serveAdmin(req,res,url){
  if(req.method!=='GET')return false;
  let file;
  if(['/admin-v2','/admin-v2/'].includes(url.pathname))file='./admin-v2.html';
  else if(['/admin','/admin/'].includes(url.pathname))file='./admin.html';
  else if(['/admin-legacy','/admin-legacy/'].includes(url.pathname))file='./admin-legacy.html';
  else return false;
  res.writeHead(200,securityHeaders);
  res.end(readFileSync(new URL(file,import.meta.url)));
  return true;
}
