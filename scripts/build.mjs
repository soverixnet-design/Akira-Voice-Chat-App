import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
await rm('dist', { recursive:true, force:true });
await mkdir('dist', {recursive:true});
await cp('web','dist',{recursive:true});
// Pin the SDK into every APK: live microphone audio must not depend on a CDN at runtime.
const sdkUrl='https://cdn.jsdelivr.net/npm/livekit-client@2.15.1/dist/livekit-client.umd.min.js';
const sdkResponse=await fetch(sdkUrl,{signal:AbortSignal.timeout(30000)});
if(!sdkResponse.ok)throw Error('LiveKit SDK download failed: '+sdkResponse.status);
const sdk=Buffer.from(await sdkResponse.arrayBuffer());
const sdkSha=createHash('sha256').update(sdk).digest('hex');
if(sdkSha!=='3f6c725e299407e5d24c55735f66d77713777719171f15ed792ad37650a04644') throw Error('LiveKit SDK integrity mismatch: '+sdkSha);
await mkdir('dist/vendor',{recursive:true});
await writeFile('dist/vendor/livekit-client.umd.min.js',sdk);

await build({entryPoints:['web/src/native.mjs'],bundle:true,outfile:'dist/src/native.js',format:'esm',target:'es2022'});
await rm('dist/src/native.mjs');
console.log('Built dist/ (prototype, no backend connection).');
