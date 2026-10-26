#!/usr/bin/env node
// Surgical Google auth enablement for the existing Akira VPS. Never replaces
// admin, wallet, gift, game, voice, or other application routes.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const root=process.env.AKIRA_DEPLOY_ROOT||'/opt/akira';
const apply=process.argv.includes('--apply');
const path=root+'/server/src/server.mjs';
const pkgPath=root+'/server/package.json';
const composePath=root+'/server/compose.yaml';
const googlePath=root+'/server/src/google-auth.mjs';
if(!existsSync(googlePath))throw Error('google-auth.mjs missing; refusing to modify server');
const authImport="import {googleClientId,googleSignIn,linkGoogleAccount} from './google-auth.mjs';";
const anchorImport="import { register, login, authenticate, logout, profile } from './auth.mjs';";
const routeAnchor="if (req.method === 'POST' && ['/api/v1/auth/register','/api/v1/auth/login'].includes(url.pathname))";
const googleRoutes=`  // Google identity is verified by the server before creating an Akira session.
  if(req.method==='GET'&&url.pathname==='/api/v1/auth/google/config'){
    const clientId=googleClientId();
    return send(200,{enabled:!!clientId,clientId});
  }
  if(url.pathname==='/api/v1/auth/google'||url.pathname==='/api/v1/auth/google/link'){
    if(req.method!=='POST')return send(405,{error:'method_not_allowed'});
    try{
      const linking=url.pathname.endsWith('/link');
      let user=null;
      if(linking){
        user=await authenticate(req.headers.authorization);
        if(!user)return send(401,{error:'unauthorized'});
      }
      let raw='';
      for await(const chunk of req){raw+=chunk;if(raw.length>10000)return send(413,{error:'payload_too_large'})}
      let body;try{body=JSON.parse(raw)}catch{return send(400,{error:'invalid_json'})}
      if(typeof body?.idToken!=='string'||body.idToken.length>8192)return send(400,{error:'invalid_google_credential'});
      const result=linking?await linkGoogleAccount(user,body.idToken):await googleSignIn(body.idToken);
      return send(result.status,result.body);
    }catch(err){console.error('google_sign_in_failed',err.code||err.message);return send(503,{error:'google_login_unavailable'})}
  }
`;
function one(source,needle,label){
  const pos=source.indexOf(needle);
  if(pos<0||source.indexOf(needle,pos+1)!==-1)throw Error('Cannot uniquely locate '+label+'; no live files changed');
  return pos;
}
let code=readFileSync(path,'utf8');
if(!code.includes('/api/v1/auth/google/config')){
  const imp=one(code,anchorImport,'auth import');
  code=code.slice(0,imp)+authImport+'\n'+code.slice(imp);
  const point=one(code,routeAnchor,'existing auth handler');
  code=code.slice(0,point)+googleRoutes+'  '+code.slice(point);
}
let compose=readFileSync(composePath,'utf8');
if(!compose.includes('AKIRA_GOOGLE_WEB_CLIENT_ID:')){
  const mat=compose.match(/^\s+AKIRA_LIVEKIT_URL:[^\n]*\n/m);
  if(!mat)throw Error('Cannot locate LiveKit environment in compose; no changes made');
  compose=compose.replace(mat[0],mat[0]+`      AKIRA_GOOGLE_WEB_CLIENT_ID: "\${AKIRA_GOOGLE_WEB_CLIENT_ID:-}"\n`);
}
const pkg=JSON.parse(readFileSync(pkgPath,'utf8'));
pkg.dependencies=pkg.dependencies||{};
pkg.dependencies['google-auth-library']=pkg.dependencies['google-auth-library']||'^11.3.1';
const newPkg=JSON.stringify(pkg,null,2)+'\n';

// Parse and compile an isolated candidate before touching the live code.
const check=spawnSync('node',['--check','--input-type=module'],{input:code,encoding:'utf8'});
if(check.status!==0)throw Error('Node syntax check failed: '+check.stderr);
const googleCheck=spawnSync('node',['--check',googlePath],{encoding:'utf8'});
if(googleCheck.status!==0)throw Error('Google verifier syntax check failed: '+googleCheck.stderr);
console.log('Google routes:',code.includes('/api/v1/auth/google/config')?'present':'missing');
console.log('Docker Google client ID mapping:',compose.includes('AKIRA_GOOGLE_WEB_CLIENT_ID:')?'present':'missing');
console.log('Google ID token verification library:',pkg.dependencies['google-auth-library']);
if(!apply){console.log('DRY RUN ONLY. Use --apply after saving a complete backup.');process.exit(0)}
// Existing file modes are retained so Docker's non-root Node process can read them.
writeFileSync(path,code);
writeFileSync(composePath,compose);
writeFileSync(pkgPath,newPkg);
console.log('Patched Google routes/config only. Restart the API with Docker and verify health.');
