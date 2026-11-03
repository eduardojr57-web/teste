export class AppError extends Error { constructor(public status:number,message:string){super(message)} }
export const fail=(status:number,message:string):never=>{throw new AppError(status,message)};
export const id=()=>crypto.randomUUID();
export function field(v:unknown,max=100,min=1){if(typeof v!=='string'||v.trim().length<min||v.length>max)fail(400,`Use entre ${min} e ${max} caracteres.`);return (v as string).trim()}
export type Actor={id:string;name:string};
export class Service {
 constructor(public db:any,public actor:Actor,public bucket?:any){}
 async all(sql:string,...args:unknown[]){return (await this.db.prepare(sql).bind(...args).all()).results as any[]}
 async one(sql:string,...args:unknown[]){return this.db.prepare(sql).bind(...args).first()}
 async run(sql:string,...args:unknown[]){return this.db.prepare(sql).bind(...args).run()}
 async ensure(){await this.run('INSERT INTO users(id,name,active) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET active=excluded.active',this.actor.id,this.actor.name.slice(0,40),Date.now())}
 async membership(server:string){return await this.one('SELECT * FROM members WHERE server=? AND user=?',server,this.actor.id)||fail(403,'Você não participa desta comunidade.')}
 async admin(server:string){const m=await this.membership(server);if(!['owner','admin'].includes(m.role))fail(403,'Apenas administradores podem fazer isso.');return m}
 async channel(channel:string){const c=await this.one('SELECT * FROM channels WHERE id=?',channel);if(!c)fail(404,'Canal não encontrado.');if(c.server)await this.membership(c.server);else if(![c.peer_a,c.peer_b].includes(this.actor.id))fail(403,'Conversa privada.');return c}
 async bootstrap(){
  const me=await this.one('SELECT * FROM users WHERE id=?',this.actor.id);
  const ss=await this.all('SELECT s.*,m.role FROM servers s JOIN members m ON m.server=s.id WHERE m.user=? ORDER BY s.created',this.actor.id);
  const cs=await this.all('SELECT c.* FROM channels c WHERE c.server IN (SELECT server FROM members WHERE user=?) OR c.peer_a=? OR c.peer_b=? ORDER BY c.created',this.actor.id,this.actor.id,this.actor.id);
  const people=await this.all('SELECT DISTINCT u.id,u.name,u.color,u.status,u.active,u.bio,m.server,m.role FROM users u JOIN members m ON m.user=u.id WHERE m.server IN (SELECT server FROM members WHERE user=?)',this.actor.id);
  const peers=await this.all('SELECT DISTINCT id,name,color,status,active,bio FROM users WHERE id IN (SELECT peer_a FROM channels WHERE peer_b=? UNION SELECT peer_b FROM channels WHERE peer_a=?)',this.actor.id,this.actor.id);
  const latest=await this.all('SELECT channel,MAX(created) AS latest FROM messages WHERE channel IN (SELECT id FROM channels WHERE server IN (SELECT server FROM members WHERE user=?) OR peer_a=? OR peer_b=?) GROUP BY channel',this.actor.id,this.actor.id,this.actor.id);
  return {me,servers:ss,channels:cs,people,peers,latest};
 }
 async history(channel:string,before:number,query:string,pins:boolean){
  await this.channel(channel);
  const rows=await this.all(`SELECT m.*,u.name,u.color FROM messages m JOIN users u ON u.id=m.user WHERE m.channel=? AND m.created<? ${query?"AND m.content LIKE ? ESCAPE '\\'":''} ${pins?'AND m.pinned=1':''} ORDER BY m.created DESC,m.id DESC LIMIT 60`,channel,before||Date.now()+1,...(query?['%'+query.replace(/[\\%_]/g,'\\$&')+'%']:[]));
  const ids=rows.map(r=>r.id);const reacts=ids.length?await this.all(`SELECT * FROM reactions WHERE message IN (${ids.map(()=>'?').join(',')})`,...ids):[];
  const typers=await this.all('SELECT u.id,u.name FROM typing t JOIN users u ON u.id=t.user WHERE t.channel=? AND t.active>? AND t.user<>?',channel,Date.now()-5000,this.actor.id);
  return {messages:rows.reverse().map(r=>({...r,attachment:r.attachment?JSON.parse(r.attachment):null,reactions:reacts.filter(x=>x.message===r.id)})),typing:typers,hasMore:rows.length===60};
 }
 async action(a:string,b:any){
  if(!b||typeof b!=='object')fail(400,'Dados inválidos.');const me=this.actor.id,now=Date.now();
  if(a==='profile'){const name=field(b.name,40),bio=field(b.bio||'',180,0),status=['online','idle','dnd','invisible'].includes(b.status)?b.status:'online',color=/^#[0-9a-f]{6}$/i.test(b.color)?b.color:'#8b7bff';await this.run('UPDATE users SET name=?,bio=?,color=?,status=? WHERE id=?',name,bio,color,status,me);return {ok:true}}
  if(a==='createServer'){
   const name=field(b.name,60),sid=id(),general=id(),ann=id(),vc=id(),color=/^#[0-9a-f]{6}$/i.test(b.color)?b.color:'#8b7bff';
   await this.db.batch([this.db.prepare('INSERT INTO servers(id,name,description,owner,color,created) VALUES(?,?,?,?,?,?)').bind(sid,name,field(b.description||'',200,0),me,color,now),this.db.prepare("INSERT INTO members(server,user,role) VALUES(?,?,'owner')").bind(sid,me),this.db.prepare("INSERT INTO channels(id,server,name,topic,type,created) VALUES(?,?,?,?,'text',?)").bind(general,sid,'geral','O começo de boas conversas.',now),this.db.prepare("INSERT INTO channels(id,server,name,topic,type,created) VALUES(?,?,?,?,'text',?)").bind(ann,sid,'avisos','Novidades da comunidade.',now+1),this.db.prepare("INSERT INTO channels(id,server,name,topic,type,created) VALUES(?,?,?,?,'voice',?)").bind(vc,sid,'Sala de voz','Entre e fique à vontade.',now+2)]);return {id:sid,channel:general};
  }
  if(a==='editServer'){await this.admin(b.server);await this.run('UPDATE servers SET name=?,description=? WHERE id=?',field(b.name,60),field(b.description||'',200,0),b.server);return {ok:true}}
  if(a==='createChannel'){await this.admin(b.server);const cid=id();await this.run('INSERT INTO channels(id,server,name,topic,type,created) VALUES(?,?,?,?,?,?)',cid,b.server,field(b.name,40),field(b.topic||'',200,0),b.type==='voice'?'voice':'text',now);return {id:cid}}
  if(a==='editChannel'){const c=await this.channel(b.channel);if(!c.server)fail(400,'Esta é uma conversa privada.');await this.admin(c.server);await this.run('UPDATE channels SET name=?,topic=? WHERE id=?',field(b.name,40),field(b.topic||'',200,0),c.id);return {ok:true}}
  if(a==='deleteChannel'){const c=await this.channel(b.channel);if(!c.server)fail(400,'Esta é uma conversa privada.');await this.admin(c.server);if((await this.one('SELECT COUNT(*) n FROM channels WHERE server=?',c.server)).n<=1)fail(400,'Mantenha pelo menos um canal.');await this.db.batch([this.db.prepare('DELETE FROM reactions WHERE message IN (SELECT id FROM messages WHERE channel=?)').bind(c.id),...['messages','voice','signals','typing'].map(t=>this.db.prepare(`DELETE FROM ${t} WHERE channel=?`).bind(c.id)),this.db.prepare('DELETE FROM channels WHERE id=?').bind(c.id)]);return {ok:true}}
  if(a==='invite'){await this.admin(b.server);const code=id().replaceAll('-','');await this.run('INSERT INTO invites(code,server,creator,expires) VALUES(?,?,?,?)',code,b.server,me,now+7*86400000);return {code}}
  if(a==='join'){const raw=field(b.code,500);let code=raw;try{code=new URL(raw).searchParams.get('invite')||raw}catch{}const inv=await this.one('SELECT * FROM invites WHERE code=? AND expires>?',code,now);if(!inv)fail(404,'Convite inválido ou expirado.');await this.run("INSERT OR IGNORE INTO members(server,user,role) VALUES(?,?,'member')",inv.server,me);return {id:inv.server}}
  if(a==='role'||a==='kick'){
   const own=await this.admin(b.server),target=await this.one('SELECT * FROM members WHERE server=? AND user=?',b.server,b.user);if(!target)fail(404,'Membro não encontrado.');if(target.role==='owner'||b.user===me)fail(403,'Não é possível alterar o proprietário ou você mesmo.');if(own.role!=='owner'&&target.role==='admin')fail(403,'Somente o proprietário pode alterar administradores.');
   if(a==='role'){if(own.role!=='owner')fail(403,'Somente o proprietário pode definir cargos.');await this.run('UPDATE members SET role=? WHERE server=? AND user=?',b.role==='admin'?'admin':'member',b.server,b.user)}else{await this.db.batch([this.db.prepare('DELETE FROM members WHERE server=? AND user=?').bind(b.server,b.user),this.db.prepare('DELETE FROM voice WHERE user=? AND channel IN (SELECT id FROM channels WHERE server=?)').bind(b.user,b.server)])}return {ok:true};
  }
  if(a==='leave'){const m=await this.membership(b.server);if(m.role==='owner')fail(400,'O proprietário não pode sair.');await this.db.batch([this.db.prepare('DELETE FROM members WHERE server=? AND user=?').bind(b.server,me),this.db.prepare('DELETE FROM voice WHERE user=? AND channel IN (SELECT id FROM channels WHERE server=?)').bind(me,b.server)]);return {ok:true}}
  if(a==='dm'){if(b.user===me)fail(400,'Escolha outra pessoa.');const shared=await this.one('SELECT a.server FROM members a JOIN members b ON a.server=b.server WHERE a.user=? AND b.user=?',me,b.user);if(!shared)fail(403,'Escolha alguém de uma das suas comunidades.');const pair=[me,b.user].sort(),cid='dm_'+await this.hash(pair.join(':'));await this.run("INSERT OR IGNORE INTO channels(id,name,type,peer_a,peer_b,created) VALUES(?,'Conversa privada','dm',?,?,?)",cid,pair[0],pair[1],now);return {id:cid}}
  if(a==='send'){
   const c=await this.channel(b.channel),content=field(b.content||'',4000,0);let attachment:string|null=null;
   if(b.attachment){const up=await this.one('SELECT * FROM uploads WHERE id=? AND user=? AND channel=?',b.attachment,me,c.id);if(!up)fail(400,'Anexo inválido.');attachment=JSON.stringify({id:up.id,name:up.name,mime:up.mime,size:up.size})}if(!content&&!attachment)fail(400,'Escreva uma mensagem ou escolha um arquivo.');
   const recent=await this.one('SELECT COUNT(*) n FROM messages WHERE user=? AND created>?',me,now-10000);if(recent.n>=15)fail(429,'Você está enviando rápido demais. Aguarde alguns segundos.');const mid=b.clientId?'m_'+await this.hash(me+':'+b.clientId):id();await this.run('INSERT OR IGNORE INTO messages(id,channel,user,content,created,attachment) VALUES(?,?,?,?,?,?)',mid,c.id,me,content,now,attachment);await this.run('DELETE FROM typing WHERE user=?',me);return {id:mid};
  }
  if(['edit','delete','pin','react'].includes(a)){
   const m=await this.one('SELECT * FROM messages WHERE id=?',b.message);if(!m)fail(404,'Mensagem não encontrada.');const c=await this.channel(m.channel);
   if(a==='react'){const emoji=field(b.emoji,12);if(!['👍','❤️','😂','🎉','🔥','👀'].includes(emoji))fail(400,'Reação inválida.');const exists=await this.one('SELECT * FROM reactions WHERE message=? AND user=? AND emoji=?',m.id,me,emoji);if(exists)await this.run('DELETE FROM reactions WHERE message=? AND user=? AND emoji=?',m.id,me,emoji);else await this.run('INSERT INTO reactions(message,user,emoji) VALUES(?,?,?)',m.id,me,emoji);return {ok:true}}
   if(a==='edit'){if(m.user!==me)fail(403,'Você só pode editar suas mensagens.');await this.run('UPDATE messages SET content=?,edited=? WHERE id=?',field(b.content,4000),now,m.id)}
   else{if(c.server){if(m.user!==me||a==='pin')await this.admin(c.server)}else if(a==='delete'&&m.user!==me)fail(403,'Você só pode apagar suas mensagens.');if(a==='pin')await this.run('UPDATE messages SET pinned=? WHERE id=?',m.pinned?0:1,m.id);else await this.db.batch([this.db.prepare('DELETE FROM reactions WHERE message=?').bind(m.id),this.db.prepare('DELETE FROM messages WHERE id=?').bind(m.id)])}return {ok:true};
  }
  if(a==='typing'){await this.channel(b.channel);await this.run('INSERT INTO typing(user,channel,active) VALUES(?,?,?) ON CONFLICT(user) DO UPDATE SET channel=excluded.channel,active=excluded.active',me,b.channel,now);return {ok:true}}
  if(a==='voiceLeave'){await this.run('DELETE FROM voice WHERE user=?',me);return {ok:true}}
  if(a==='voiceJoin'){const c=await this.channel(b.channel);if(c.type!=='voice'&&c.type!=='dm')fail(400,'Escolha um canal de voz.');const count=await this.one('SELECT COUNT(*) n FROM voice WHERE channel=? AND active>? AND user<>?',c.id,now-20000,me);if(count.n>=8)fail(400,'Esta sala já tem oito pessoas.');await this.run('INSERT INTO voice(user,channel,active) VALUES(?,?,?) ON CONFLICT(user) DO UPDATE SET channel=excluded.channel,active=excluded.active',me,c.id,now);return {ok:true}}
  if(a==='signal'){await this.channel(b.channel);const participants=await this.all('SELECT user FROM voice WHERE channel=? AND active>? AND user IN (?,?)',b.channel,now-20000,me,b.recipient);if(participants.length!==2||me===b.recipient)fail(403,'Participantes fora da chamada.');const payload=JSON.stringify(b.payload);if(payload.length>64000||!['offer','answer','candidate'].includes(b.payload?.type))fail(400,'Sinal inválido.');await this.run('INSERT INTO signals(channel,sender,recipient,payload,created) VALUES(?,?,?,?,?)',b.channel,me,b.recipient,payload,now);return {ok:true}}
  fail(400,'Ação desconhecida.');
 }
 async hash(s:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('')}
 async voiceState(channel:string,since:number){await this.channel(channel);await this.run('UPDATE voice SET active=? WHERE user=? AND channel=?',Date.now(),this.actor.id,channel);const peers=await this.all('SELECT v.user,u.name,u.color FROM voice v JOIN users u ON u.id=v.user WHERE v.channel=? AND v.active>?',channel,Date.now()-20000);const list=await this.all('SELECT id,sender,payload FROM signals WHERE channel=? AND recipient=? AND id>? AND created>? ORDER BY id LIMIT 100',channel,this.actor.id,since,Date.now()-90000);if(Math.random()<.02)await this.run('DELETE FROM signals WHERE created<?',Date.now()-120000);return {peers,signals:list.map(s=>({...s,payload:JSON.parse(s.payload)}))}}
}
