/* Bundles every original Sovera frame/entry/effect asset into Akira's build.
 * Pinned source commit and Git blob checksums: no fabricated or substituted artwork.
 * Imported locally during build; no production database or file deletion involved. */
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const REV='0e30b48962272b8a687509aef4dee9bc4a047767';
const FILES=[
  {
    "path": "effects/castle-entry.webp",
    "sha": "b2ae3d3173999af174637c7025ffededb3936e4d",
    "size": 143128
  },
  {
    "path": "effects/dragon-gold-still.png",
    "sha": "c2ad3cef605b7965a8053d9a17d1fecd77a6f7aa",
    "size": 428542
  },
  {
    "path": "effects/dragon-gold.webp",
    "sha": "cdccc1726ac65b6f1eb8038f7c707e9ce8d1f5aa",
    "size": 3862912
  },
  {
    "path": "effects/dragon-queen-entry.webp",
    "sha": "0638c718542a5f4e1dbce18d595f733de5650277",
    "size": 332164
  },
  {
    "path": "effects/dragon.png",
    "sha": "ac7e5961c8c3889adad80f2e1a3c1a1bea3a715f",
    "size": 2353001
  },
  {
    "path": "effects/ice-admin-still.png",
    "sha": "9ce1a3fda5a6023d7afe71c70a167e030421826c",
    "size": 347108
  },
  {
    "path": "effects/ice-admin.webp",
    "sha": "1291d3fdc7d575d946e242447465881155b8dc4f",
    "size": 662958
  },
  {
    "path": "effects/ice-dragon-still.webp",
    "sha": "cd5c3de05828e6f2ef8c080e9594b606d4553d44",
    "size": 126800
  },
  {
    "path": "effects/ice-dragon.webp",
    "sha": "e2d4a0861007b4ee7cc4b6c3941ad76149de5595",
    "size": 4400960
  },
  {
    "path": "effects/ice-king-entry.webp",
    "sha": "bf55c92f4d1059d45dd76c5f75ab6a24ff0a4432",
    "size": 7147572
  },
  {
    "path": "effects/ice-king-still.webp",
    "sha": "b381a65149cfbd629d739e5c4c04018846de7ce4",
    "size": 154486
  },
  {
    "path": "effects/ice.png",
    "sha": "0338bbeb4c3eac60a3f658095bd705f823d48b17",
    "size": 2121236
  },
  {
    "path": "effects/legend-tag.webp",
    "sha": "6cdd741ccc6d9bac1a57175cbcd91d7e7f41dc6d",
    "size": 64642
  },
  {
    "path": "effects/lion-queen-entry.webp",
    "sha": "753eb082befc2a67ab91c4a2c8833295bbd10717",
    "size": 1037288
  },
  {
    "path": "effects/lion-queen-still.webp",
    "sha": "d2d1195d4dadd296a44a5c0690b13689479f2061",
    "size": 13772
  },
  {
    "path": "effects/phoenix-entry.webp",
    "sha": "967b454343fab1235f36258f608afec613c86357",
    "size": 373774
  },
  {
    "path": "effects/phoenix-queen-entry.webp",
    "sha": "47f4af3f5310b575eb6b04790ddf22b9468c3db2",
    "size": 1288248
  },
  {
    "path": "effects/phoenix-queen-still.webp",
    "sha": "c42fb4c4f5366c2bf7010f581f43284c02f8e141",
    "size": 13214
  },
  {
    "path": "effects/phoenix.png",
    "sha": "811280c77422bdacffe5d35e1cdebf7ff6e3fea2",
    "size": 2498721
  },
  {
    "path": "effects/royal-gold-still.png",
    "sha": "2a1c3c52a8806d139a684ed59b2acca38f99c1a7",
    "size": 390538
  },
  {
    "path": "effects/royal-gold.webp",
    "sha": "79d1da341a6ab182eed7db45191e13ed385f10cb",
    "size": 650764
  },
  {
    "path": "effects/tiger-queen-entry.webp",
    "sha": "32781f887b83b73b72877c813240274d15089329",
    "size": 3300746
  },
  {
    "path": "effects/tiger-queen-still.webp",
    "sha": "fe596251777e162ac27ac36e2fc745bbe81a8720",
    "size": 29202
  },
  {
    "path": "effects/top-host-medal.webp",
    "sha": "0f59a17749c01b55fd5df9f7235d05946f57fc6d",
    "size": 96370
  },
  {
    "path": "effects/violet-love-still.png",
    "sha": "6a207855e6a51bf8c5ec4fac831bf51c5ed07bc3",
    "size": 388879
  },
  {
    "path": "effects/violet-love.webp",
    "sha": "2d87e74a176e8fd317f8ed2ade2973d1c456d860",
    "size": 715390
  },
  {
    "path": "effects/violet-phoenix-still.webp",
    "sha": "bf0fbdf2e85393ae5e22481adeaddc92c8ffc63e",
    "size": 124446
  },
  {
    "path": "effects/violet-phoenix.webp",
    "sha": "47137e073b40940223e23aa8ac70796e53d590ec",
    "size": 4202692
  },
  {
    "path": "effects/vip7.webp",
    "sha": "416b930589f28a9b946e1bfe5f438217d2d7e325",
    "size": 110900
  },
  {
    "path": "effects/voice-gold.webp",
    "sha": "57aa1237f85cbc522b1c30f2d4f946f3f7537c83",
    "size": 120416
  }
];
function gitHash(bytes){const prefix=Buffer.from('blob '+bytes.length+'\0');return createHash('sha1').update(prefix).update(bytes).digest('hex')}
async function transfer(asset){
 const location='web/assets/sovera/'+asset.path;
 try{const existing=await readFile(location);if(gitHash(existing)===asset.sha)return}catch(_){}
 const remote='https://raw.githubusercontent.com/soverixnet-design/sovera-voice-app/'+REV+'/assets/'+asset.path;
 const res=await fetch(remote,{signal:AbortSignal.timeout(45000)});
 if(!res.ok)throw Error('Cannot download original Sovera art '+asset.path+': '+res.status);
 const bytes=Buffer.from(await res.arrayBuffer());
 if(bytes.length!==asset.size||gitHash(bytes)!==asset.sha)throw Error('Sovera original artwork checksum mismatch '+asset.path);
 await mkdir(location.slice(0,location.lastIndexOf('/')),{recursive:true});
 await writeFile(location,bytes);
}
let index=0;
await Promise.all(Array.from({length:Math.min(4,FILES.length)},async()=>{
 while(index<FILES.length){const item=FILES[index++];await transfer(item);}
}));
console.log('Verified and bundled '+FILES.length+' authentic Sovera effects.');
