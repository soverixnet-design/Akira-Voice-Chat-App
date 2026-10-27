const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const {test}=require('node:test');
function handler(file){
 let source=fs.readFileSync(file,'utf8').replace(/^import .*;\n/gm,'').split('export const server =')[0].replace('export const requestHandler =','globalThis.requestHandler =');
 const calls=[];const context={URL,process:{env:{}},console,randomUUID:()=> 'test',serveAdmin:()=>false,controlRoutes:async()=>false,profileRoutes:async()=>false,getPool:()=>null,
 authenticate:async token=>token==='Bearer test'?{id:'1'}:null};
 for(const name of ['roomSeats','setSeat','updateRoomSettings'])context[name]=async(...args)=>{calls.push([name,...args]);return {status:200,body:{ok:true,action:name}}};
 vm.createContext(context);vm.runInContext(source,context);
 return async(action,method='GET',body='',auth='Bearer test')=>{
 const req={url:'/api/v1/rooms/100001/'+action,method,headers:{authorization:auth},async *[Symbol.asyncIterator](){yield body}};
 let status,result;await context.requestHandler(req,{writeHead(code){status=code},end(data){result=JSON.parse(data)}});return {status,result,calls};
 };
}
const file=__dirname+'/files/server/src/server.mjs';
test('seat snapshot route dispatches to authoritative module',async()=>{const r=await handler(file)('seats');assert.equal(r.status,200);assert.equal(r.result.action,'roomSeats')});
test('seat write and settings routes dispatch validated JSON',async()=>{for(const [path,fn] of [['seat','setSeat'],['settings','updateRoomSettings']]){const r=await handler(file)(path,'POST','{"seatNo":0}');assert.equal(r.status,200);assert.equal(r.result.action,fn)}});
test('room seat routes require authentication',async()=>{const r=await handler(file)('seats','GET','','');assert.equal(r.status,401);assert.equal(r.calls.length,0)});
test('malformed seat body is refused',async()=>{const r=await handler(file)('seat','POST','{');assert.equal(r.status,400);assert.equal(r.calls.length,0)});
test('unsupported method is refused',async()=>{const r=await handler(file)('seats','POST','{}');assert.equal(r.status,405)});
test('oversized seat payload is refused',async()=>{const r=await handler(file)('seat','POST','x'.repeat(4097));assert.equal(r.status,413)});
