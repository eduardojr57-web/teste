// Bind senders by the negotiated transceivers, including on the answering peer.
export async function bindCallTracks(pc:RTCPeerConnection,audio:MediaStreamTrack|null,video:MediaStreamTrack|null,create=false){
 for(const [kind,track] of [['audio',audio],['video',video]] as const){
  let transceiver=pc.getTransceivers().find(t=>t.receiver.track.kind===kind);
  if(!transceiver&&create)transceiver=pc.addTransceiver(kind,{direction:'sendrecv'});
  if(transceiver){transceiver.direction='sendrecv';await transceiver.sender.replaceTrack(track)}
 }
}
export function setMicrophoneMuted(stream:MediaStream|null,muted:boolean){stream?.getAudioTracks().forEach(t=>{t.enabled=!muted});}

