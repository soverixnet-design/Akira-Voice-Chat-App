import test from 'node:test';
import assert from 'node:assert/strict';
import {profileRoutes,validAvatar} from '../src/profiles.mjs';
const photo='data:image/jpeg;base64,/9j/';
test('profile photos reject executable content and oversized uploads',()=>{
 assert.ok(validAvatar(photo));assert.ok(validAvatar(null));
 for(const p of ['javascript:alert(1)','data:image/svg+xml;base64,abc','https://x/a.png','x'.repeat(200001),{}])assert.equal(validAvatar(p),false);
});
function req(method,body){return {method,headers:{authorization:'Bearer test'},async *[Symbol.asyncIterator](){yield JSON.stringify(body)}};}
test('profile updates use authenticated user ID, never submitted ID',async()=>{
 const queries=[];let output;
 const pool=()=>({query:async(sql,args)=>{queries.push([sql,args]);return {rows:[{id:'100001',name:'Real',pic:photo}]}}});
 await profileRoutes(req('POST',{id:'999999',name:'Real',pic:photo,bio:''}),'/api/v1/profile',(status,body)=>output={status,body},async()=>({id:7}),pool);
 assert.equal(output.status,200);assert.equal(queries[0][1][3],7);assert.equal(output.body.profile.pic,photo);
});
test('members require auth and room membership before disclosing profiles',async()=>{
 let status,queries=0;const pool=()=>({query:async()=>{queries++;return{rows:[]}}});
 await profileRoutes(req('GET'),'/api/v1/rooms/100001/members',s=>status=s,async()=>null,pool);
 assert.equal(status,401);assert.equal(queries,0);
 await profileRoutes(req('GET'),'/api/v1/rooms/100001/members',s=>status=s,async()=>({id:7}),pool);
 assert.equal(status,403);assert.equal(queries,1);
});
test('invalid profile and oversized body cause no database writes',async()=>{
 let status;const pool=()=>{throw Error('must not access database')};
 for(const body of [{name:'',pic:null,bio:''},{name:'X',pic:'data:image/svg+xml;base64,AA',bio:''},{name:'X',pic:'x'.repeat(220000),bio:''}]){
 await profileRoutes(req('POST',body),'/api/v1/profile',s=>status=s,async()=>({id:1}),pool);assert.ok([400,413].includes(status));
 }
});
