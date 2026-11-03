import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {transpileModule,ModuleKind,ScriptTarget} from 'typescript';
mkdirSync('work',{recursive:true});
writeFileSync('work/voice-media.mjs',transpileModule(readFileSync('lib/voice-media.ts','utf8'),{compilerOptions:{module:ModuleKind.ESNext,target:ScriptTarget.ES2022}}).outputText);
const {bindCallTracks,setMicrophoneMuted}=await import('../work/voice-media.mjs');
function peer(kinds=[]){const transceivers=[];const pc={getTransceivers:()=>transceivers,addTransceiver(kind){const t={receiver:{track:{kind}},direction:'recvonly',sender:{track:null,async replaceTrack(track){this.track=track}}};transceivers.push(t);return t}};kinds.forEach(k=>pc.addTransceiver(k));return pc}
const audio={kind:'audio',enabled:true},screenA={kind:'video',id:'a'},screenB={kind:'video',id:'b'};
const caller=peer();await bindCallTracks(caller,audio,screenA,true);assert.equal(caller.getTransceivers().length,2);
// Answerer already has transceivers from the remote SDP. It must send on those,
// rather than creating an extra, unnegotiated video sender.
const answerer=peer(['audio','video']);await bindCallTracks(answerer,audio,screenB);assert.equal(answerer.getTransceivers().length,2);assert.equal(answerer.getTransceivers()[1].sender.track,screenB);
await bindCallTracks(caller,audio,null);await bindCallTracks(caller,audio,screenB);assert.equal(caller.getTransceivers()[1].sender.track,screenB);assert.equal(answerer.getTransceivers()[1].sender.track,screenB);
const late=peer(['audio','video']);await bindCallTracks(late,null,null);await bindCallTracks(late,audio,screenA);assert.equal(late.getTransceivers()[0].sender.track,audio);assert.equal(late.getTransceivers()[0].direction,'sendrecv');
setMicrophoneMuted({getAudioTracks:()=>[audio]},true);assert.equal(audio.enabled,false);setMicrophoneMuted({getAudioTracks:()=>[audio]},false);assert.equal(audio.enabled,true);
setMicrophoneMuted(null,true);
console.log('PASS: negotiated answerer senders, bidirectional screen replacement, late microphone, mute/unmute');
