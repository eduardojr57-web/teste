import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {transpileModule,ModuleKind,ScriptTarget} from 'typescript';
mkdirSync('work',{recursive:true});
writeFileSync('work/media.mjs',transpileModule(readFileSync('lib/media.ts','utf8'),{compilerOptions:{module:ModuleKind.ESNext,target:ScriptTarget.ES2022}}).outputText);
const {acquireMicrophone,mediaError}=await import('../work/media.mjs');
const error=name=>Object.assign(new Error('Requested device not found'),{name});
let count=0;async function test(name,fn){await fn();console.log('PASS',name);count++}
await test('Missing microphone supports receive-only entry instead of rejecting the call',async()=>{assert.equal(await acquireMicrophone({getUserMedia:async()=>{throw error('NotFoundError')}}),null)});
await test('Legacy missing device error also supports receive-only mode',async()=>{assert.equal(await acquireMicrophone({getUserMedia:async()=>{throw error('DevicesNotFoundError')}}),null)});
await test('Permission denial is preserved and never retried to bypass consent',async()=>{let calls=0;await assert.rejects(()=>acquireMicrophone({getUserMedia:async()=>{calls++;throw error('NotAllowedError')}}),e=>e.name==='NotAllowedError');assert.equal(calls,1);assert.match(mediaError(error('NotAllowedError'),'microphone'),/não foi permitido/)});
await test('Unsupported audio processing settings retry once with basic audio constraints',async()=>{const seen=[],stream={getTracks:()=>[]};const result=await acquireMicrophone({getUserMedia:async c=>{seen.push(c);if(seen.length===1)throw error('OverconstrainedError');return stream}});assert.equal(result,stream);assert.deepEqual(seen[1],{audio:true,video:false});assert.equal(seen.length,2)});
await test('Missing device after basic-constraints retry supports receive-only',async()=>{let calls=0;assert.equal(await acquireMicrophone({getUserMedia:async()=>{throw error(++calls===1?'OverconstrainedError':'NotFoundError')}}),null);assert.equal(calls,2)});
await test('Busy device is reported with recovery guidance',async()=>{await assert.rejects(()=>acquireMicrophone({getUserMedia:async()=>{throw error('NotReadableError')}}),e=>e.name==='NotReadableError');assert.match(mediaError(error('NotReadableError'),'microphone'),/Feche outros aplicativos/)});
await test('Unsupported browser has actionable Portuguese message',async()=>{await assert.rejects(()=>acquireMicrophone(undefined),/Este navegador/)});
await test('Camera error does not incorrectly identify the microphone',async()=>{const message=mediaError(error('NotFoundError'),'camera');assert.match(message,/câmera/);assert.doesNotMatch(message,/microfone|Requested/)});
await test('Cancelled screen selection is identified separately',async()=>{assert.match(mediaError(error('NotAllowedError'),'screen'),/compartilhamento de tela foi cancelado/)});
await test('Normal microphone acquisition preserves the acquired stream',async()=>{const stream={getTracks:()=>[]};assert.equal(await acquireMicrophone({getUserMedia:async()=>stream}),stream)});
console.log(`\n${count} media regression tests passed.`);
