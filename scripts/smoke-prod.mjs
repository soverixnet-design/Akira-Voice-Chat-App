// Read-only production API smoke checks. Never log tokens or write wallet data.
const base=(process.env.AKIRA_API_BASE||'https://api.soverixnet.online').replace(/\/$/,'');
const checks=[
 {name:'Health',path:'/health',expected:200,valid:d=>d.ok===true&&d.app==='akira'},
 {name:'Verified seller directory',path:'/api/v1/sellers',expected:200,valid:d=>Array.isArray(d.sellers)},
 {name:'Protected original wallet',path:'/api/v1/wallet',expected:401,valid:d=>d.error==='unauthorized'},
 {name:'Protected seller wallet',path:'/api/v1/seller/wallet',expected:401,valid:d=>d.error==='unauthorized'},
 {name:'Protected admin dashboard',path:'/api/v1/admin/dashboard',expected:401,valid:d=>d.error==='unauthorized'},
 {name:'Protected room seats',path:'/api/v1/rooms/100001/seats',expected:401,valid:d=>d.error==='unauthorized'},
 {name:'Protected game round',path:'/api/v1/games/food-wheel/round',expected:401,valid:d=>d.error==='unauthorized'},
 {name:'Protected account deletion',path:'/api/v1/account/deletion-request',expected:401,valid:d=>d.error==='unauthorized'},
 {name:'Google sign-in configuration',path:'/api/v1/auth/google/config',expected:200,valid:d=>typeof d.enabled==='boolean'},
 {name:'Live room directory',path:'/api/v1/rooms',expected:200,valid:d=>Array.isArray(d.rooms)},
];
let failed=0;
for(const test of checks){
 try{
  const response=await fetch(base+test.path,{signal:AbortSignal.timeout(7000),headers:{Accept:'application/json'}});
  const data=await response.json();
  const ok=response.status===test.expected&&test.valid(data);
  console.log((ok?'PASS':'FAIL')+' '+test.name+': HTTP '+response.status);
  if(!ok)failed++;
 }catch(err){console.log('FAIL '+test.name+': '+err.message);failed++}
}
for(const origin of ['https://api.soverixnet.online','https://voice.soverixnet.online','https://localhost','capacitor://localhost']){
 try{
  const response=await fetch(base+'/health',{headers:{Origin:origin},signal:AbortSignal.timeout(7000)});
  const ok=response.ok&&response.headers.get('access-control-allow-origin')===origin;
  console.log((ok?'PASS':'FAIL')+' App Origin: '+origin+' (HTTP '+response.status+')');
  if(!ok)failed++;
 }catch(err){console.log('FAIL App Origin '+origin+': '+err.message);failed++}
}
if(failed){console.error('NOT READY: '+failed+' check(s) failed. Do not deploy a release yet.');process.exitCode=1}
else console.log('READ-ONLY API CHECKS PASSED; signed-in transfers, voice, and games still require separate tests.');
