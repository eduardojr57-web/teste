export type MediaKind = 'microphone' | 'camera' | 'screen';
export function mediaError(error:unknown,kind:MediaKind):string {
 const name=typeof error==='object'&&error!==null&&'name' in error?String(error.name):'';
 const device=kind==='camera'?'câmera':'microfone';
 if(name==='NotFoundError'||name==='DevicesNotFoundError')return kind==='screen'?'Nenhuma tela está disponível para compartilhar.':`Nenhum${kind==='camera'?'a':''} ${device} foi encontrado${kind==='camera'?'a':''}. Conecte um dispositivo e tente novamente.`;
 if(name==='NotAllowedError'||name==='PermissionDeniedError')return kind==='screen'?'O compartilhamento de tela foi cancelado ou não foi permitido.':`O acesso ${kind==='camera'?'à câmera':'ao microfone'} não foi permitido. Libere o acesso nas configurações do navegador e do Windows.`;
 if(name==='NotReadableError'||name==='TrackStartError')return `Não foi possível usar ${kind==='camera'?'a câmera':'o microfone'}. Feche outros aplicativos que estejam usando o dispositivo e tente novamente.`;
 if(name==='OverconstrainedError'||name==='ConstraintNotSatisfiedError')return `O dispositivo não oferece as configurações solicitadas. Selecione outro ${device} nas configurações do navegador.`;
 if(name==='AbortError')return 'A captura foi interrompida. Tente novamente.';
 if(name==='SecurityError')return 'O navegador bloqueou a captura. Abra o Conversa em uma janela própria e confira as permissões.';
 if(error instanceof Error&&error.message.startsWith('Este navegador'))return error.message;
 return kind==='screen'?'Não foi possível compartilhar a tela. Tente novamente.':`Não foi possível acessar ${kind==='camera'?'a câmera':'o microfone'}. Confira a conexão e as permissões do dispositivo.`;
}
export async function acquireMicrophone(devices:Pick<MediaDevices,'getUserMedia'>|undefined,deviceId=''):Promise<MediaStream|null>{
 if(!devices?.getUserMedia)throw new Error('Este navegador não disponibiliza acesso ao microfone. Abra o Conversa em uma janela do Chrome, Edge ou Firefox.');
 try{return await devices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,...(deviceId?{deviceId:{exact:deviceId}}:{})},video:false})}
 catch(error){const name=(error as {name?:string})?.name;if(name==='NotFoundError'||name==='DevicesNotFoundError')return null;
  if(name==='OverconstrainedError'||name==='ConstraintNotSatisfiedError'){
   try{return await devices.getUserMedia({audio:true,video:false})}catch(fallback){if(['NotFoundError','DevicesNotFoundError'].includes((fallback as {name:string}).name))return null;throw fallback}
  }throw error;
 }
}
