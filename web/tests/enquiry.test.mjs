import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {handleEnquiry} from '../server/enquiry.js';

function database() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../migrations/0001_enquiry.sql',import.meta.url),'utf8'));
  const api = { prepare(sql) {
    let values = [];
    const statement = {
      bind(...v) {values=v;return statement;},
      async first() {return sqlite.prepare(sql).get(...values) || null;},
      async run() {return sqlite.prepare(sql).run(...values);},
      execute() {return {results:sqlite.prepare(sql).all(...values)};},
    }; return statement;
  }, async batch(statements) {
    sqlite.exec('BEGIN');
    try {const results=statements.map(s=>s.execute());sqlite.exec('COMMIT');return results;}
    catch(e) {sqlite.exec('ROLLBACK');throw e;}
  }};
  return {api,sqlite};
}
const fields = {name:'Local Test',email:'test@example.com',phone:'',message:'Please discuss this architecture project with me.'};
function request(values=fields, headers={}) {
  return new Request('https://btldesigns.in/api/enquiry',{method:'POST',headers:{Origin:'https://btldesigns.in',Accept:'application/json','CF-Connecting-IP':'192.0.2.1',...headers},body:new URLSearchParams(values)});
}
function setup() {const db=database();return {...db,env:{ENQUIRY_ACCESS_KEY:'test-key',ENQUIRY_DB:db.api}};}
const accepted = async()=>Response.json({success:true});

test('valid delivery and repeated message result in one provider call',async()=>{
  const {env}=setup();let sends=0;const send=async()=>{sends++;return accepted();};
  assert.equal((await handleEnquiry(request(),env,send)).status,200);
  assert.equal((await handleEnquiry(request(),env,send)).status,200);
  assert.equal(sends,1);
});
test('foreign and absent origins are rejected before provider or database access',async()=>{
  for(const origin of ['https://elsewhere.example','null']) assert.equal((await handleEnquiry(request(fields,{Origin:origin}),{})).status,403);
  const req=request();req.headers.delete('Origin');assert.equal((await handleEnquiry(req,{})).status,403);
});
test('same-origin Referer supports clients without Origin',async()=>{
  const {env}=setup();const req=request(fields,{Referer:'https://btldesigns.in/contact/'});req.headers.delete('Origin');
  assert.equal((await handleEnquiry(req,env,accepted)).status,200);
});
test('invalid input and honeypot do not send',async()=>{
  const {env}=setup();let sends=0;const send=async()=>{sends++;return accepted();};
  assert.equal((await handleEnquiry(request({...fields,email:'invalid'}),env,send)).status,400);
  assert.equal((await handleEnquiry(request({...fields,message:'short'}),env,send)).status,400);
  assert.equal((await handleEnquiry(request({...fields,company:'bot'}),env,send)).status,200);
  assert.equal(sends,0);
});
test('request body is bounded even with no Content-Length',async()=>{
  assert.equal((await handleEnquiry(request({...fields,message:'a'.repeat(40000)}),{})).status,413);
});
test('file fields and wrong content types are rejected',async()=>{
  const body=new FormData();for(const [key,value] of Object.entries(fields))body.set(key,value);body.set('message',new Blob(['a'.repeat(40)]),'message.txt');
  const req=new Request('https://btldesigns.in/api/enquiry',{method:'POST',headers:{Origin:'https://btldesigns.in',Accept:'application/json'},body});
  assert.equal((await handleEnquiry(req,{})).status,400);
});
test('missing configuration fails honestly',async()=>{
  assert.equal((await handleEnquiry(request(),{})).status,503);
});
test('provider rejection is not a success and can be retried',async()=>{
  const {env}=setup();
  const failed=await handleEnquiry(request(),env,async()=>Response.json({success:false},{status:400}));
  assert.equal(failed.status,502);
  assert.equal((await handleEnquiry(request(),env,accepted)).status,200);
});
test('uncertain delivery cannot immediately send a second copy',async()=>{
  const {env}=setup();
  assert.equal((await handleEnquiry(request(),env,async()=>{throw new DOMException('timeout','TimeoutError');})).status,502);
  assert.equal((await handleEnquiry(request(),env,accepted)).status,409);
});
test('concurrent duplicate requests reserve one send',async()=>{
  const {env}=setup();let finish;let started;const ready=new Promise(r=>started=r);
  const first=handleEnquiry(request(),env,async()=>{started();return new Promise(r=>finish=r);});
  await ready;
  assert.equal((await handleEnquiry(request(),env,accepted)).status,409);
  finish(Response.json({success:true}));assert.equal((await first).status,200);
});
test('per-IP and global rate limits share storage',async()=>{
  const {env}=setup();
  for(let i=0;i<5;i++)assert.equal((await handleEnquiry(request({...fields,message:fields.message+i}),env,accepted)).status,200);
  const limited=await handleEnquiry(request({...fields,message:fields.message+'six'}),env,accepted);
  assert.equal(limited.status,429);assert.ok(Number(limited.headers.get('Retry-After'))>0);
  const second=setup();
  for(let i=0;i<50;i++)assert.equal((await handleEnquiry(request({...fields,message:fields.message+i},{'CF-Connecting-IP':`192.0.2.${i+1}`}),second.env,accepted)).status,200);
  assert.equal((await handleEnquiry(request({...fields,message:fields.message+'global'},{'CF-Connecting-IP':'192.0.2.200'}),second.env,accepted)).status,429);
});
test('no-JavaScript errors preserve escaped input and never cache it',async()=>{
  const result=await handleEnquiry(request({...fields,name:'<script>alert(1)</script>'},{Accept:'text/html'}),{});
  const html=await result.text();assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>alert/);assert.match(html,/mailto:studio@btldesigns.in/);assert.equal(result.headers.get('Cache-Control'),'no-store');
});
test('storage contains no raw IP, email or message',async()=>{
  const {env,sqlite}=setup();await handleEnquiry(request(),env,accepted);
  const stored=JSON.stringify([sqlite.prepare('SELECT * FROM enquiry_limits').all(),sqlite.prepare('SELECT * FROM enquiry_receipts').all()]);
  for(const value of [fields.email,fields.message,'192.0.2.1']) assert.ok(!stored.includes(value));
});
