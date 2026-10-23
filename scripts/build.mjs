import { cp, mkdir, rm } from 'node:fs/promises';
import { build } from 'esbuild';
await rm('dist', { recursive:true, force:true });
await mkdir('dist', {recursive:true});
await cp('web','dist',{recursive:true});
await build({entryPoints:['web/src/native.mjs'],bundle:true,outfile:'dist/src/native.js',format:'esm',target:'es2022'});
await rm('dist/src/native.mjs');
console.log('Built dist/ (prototype, no backend connection).');
