# Conversa 2 · versão para Render

Aplicativo independente para navegador, com cadastro restrito a convites. Esta edição usa Node.js e PostgreSQL; não depende da hospedagem Sites ou do login ChatGPT. O endereço antigo continua com sua edição anterior. Os dados e contas antigos não são migrados automaticamente.

## O que foi implementado

- Administrador inicial criado uma única vez com um código de configuração.
- Login por e-mail e senha, senhas derivadas com scrypt, sessões com cookies HttpOnly e proteção contra tentativas excessivas.
- Convites de acesso de uso único, validade de até sete dias, vinculação opcional a e-mail e revogação. Somente o administrador do aplicativo gera esses convites.
- Recuperação de senha com link de 30 minutos e uso único, revogando sessões anteriores. Requer um provedor de e-mail configurado (API HTTPS no Render gratuito).
- Lista de sessões e encerramento de outros dispositivos; alteração de senha.
- Comunidades, canais de texto e voz, convites para comunidade separados dos convites de cadastro.
- Atualizações por WebSocket, reconexão automática, consultas periódicas como alternativa e confirmação de envio. Um identificador de envio impede duplicação ao repetir uma solicitação.
- Rascunho local por canal, respostas a mensagens, menções pelo botão @ e central de notificações. Notificações do navegador requerem autorização e a aplicação aberta; não foi implementado push com o navegador fechado.
- Cargos personalizados com permissões de administração, moderação, escrita e voz; canais privados com acesso por membro ou cargo.
- Silenciamento temporário, suspensão da comunidade, bloqueio da conta, denúncias e registro administrativo.
- Enquetes com alteração de voto e encerramento; eventos com confirmação de presença.
- Emojis Unicode e imagens PNG/JPEG/WebP de até 32 KB por comunidade, com atalhos e reações, além de temas escuro, claro e meia-noite.
- Seleção e teste local de microfone, câmera e saída de áudio; modo somente ouvir, voz, vídeo e compartilhamento de tela. Saída de áudio depende do suporte do navegador. Integração TURN por variáveis de ambiente.
- Instalação pelo navegador com manifesto, ícones e página offline. Mensagens e dados privados não são guardados no cache offline.
- Backups criptografados AES-256-GCM, cópia diária com retenção de sete arquivos, download e restauração pelo administrador com senha e confirmação. Uma cópia é feita antes de restaurar; todas as sessões são encerradas na restauração.

## Publicar no Render

O arquivo `render.yaml` configura um serviço web **Free** e um PostgreSQL **Free**, sem disco pago. Anexos e cópias criptografadas ficam no banco de dados, de modo que reiniciar ou adormecer o serviço não apaga esses arquivos.

**Limites importantes do Render gratuito:** o banco expira 30 dias após a criação e pode ser apagado depois do período de tolerância; o serviço adormece após 15 minutos sem tráfego e pode demorar cerca de um minuto para retornar. O banco tem limite de 1 GB. A gratuidade não representa hospedagem permanente nem uso ilimitado. Excedentes de banda e compilação podem ser cobrados se houver um método de pagamento no espaço; confira os limites de gasto do Render. Nunca autorize upgrade automático.

1. Coloque esta pasta em um repositório GitHub privado e autorize o Render a acessá-lo.
2. Em **New → Blueprint**, selecione o repositório e confira que ambos os planos estão marcados **Free** e que não há disco pago.
3. As variáveis DATABASE_URL, BOOTSTRAP_TOKEN e BACKUP_KEY são preenchidas pelo Blueprint. Guarde uma cópia privada da BACKUP_KEY para restaurar os backups.
4. A publicação executa a verificação de código, a compilação e as migrações. A rota de saúde é `/health`.
5. Abra a URL HTTPS atribuída. Na tela de entrada, use **Configurar primeiro administrador**, seu e-mail, uma senha de pelo menos 12 caracteres e o BOOTSTRAP_TOKEN que aparece nas variáveis do serviço. Esse cadastro funciona apenas uma vez.
6. Em **Central de recursos → Administração**, gere convites de uso único. Um convite de comunidade não cria permissão para cadastrar uma conta no aplicativo.
7. Configure FREE_DATABASE_EXPIRES_AT com a data ISO de expiração mostrada no Render. O painel administrativo apresenta o aviso. Baixe backups para fora do banco antes da expiração.

### Variáveis

- `DATABASE_URL`: conexão interna com Render Postgres.
- `BOOTSTRAP_TOKEN`: código aleatório para o primeiro cadastro, gerado pelo Render.
- `BACKUP_KEY`: chave aleatória AES-GCM gerada pelo Render. Preserve uma cópia fora do serviço. Backups antigos precisam da chave original.
- `FREE_TIER=true`: identifica a implantação gratuita no painel.
- `FREE_DATABASE_EXPIRES_AT`: data ISO de expiração do banco, opcional no primeiro deploy.
- `STORAGE_LIMIT_MB=40`: limite total inicial de anexos para manter espaço no banco, incluindo sete cópias. Até 10 MB por arquivo; o backup integrado aceita até 50 MB de anexos por cópia.
- `RESEND_API_KEY` e `EMAIL_FROM`: integração de recuperação de senha por HTTPS com Resend. Exige conta e remetente autorizado no provedor. Sem essas configurações, o aplicativo informa que a recuperação por e-mail está pendente. O plano gratuito do Render bloqueia as portas SMTP comuns.
- `TURN_URL`, `TURN_USERNAME`, `TURN_PASSWORD`: provedor de retransmissão opcional. Sem TURN, chamadas podem falhar em redes restritas. A configuração não contrata um provedor automaticamente.
- `APP_URL`: opcional, origem HTTPS sem barra final para domínio próprio. Por padrão usa RENDER_EXTERNAL_URL.

As cópias automáticas são criadas a cada 24 horas de execução e verificadas na inicialização. Como o serviço gratuito pode adormecer, isso não garante um horário fixo diário. Até sete cópias são retidas no próprio banco. Elas não protegem contra exclusão ou expiração desse banco: é necessário fazer download externo.

## Desenvolvimento e testes

Requisito: Node.js 24.22.1 ou compatível e npm.

1. Execute `npm ci`.
2. Copie `.env.example` para `.env`, gere valores aleatórios diferentes para `BOOTSTRAP_TOKEN` e `BACKUP_KEY` e mantenha `APP_URL=http://localhost:3000`.
3. Execute `npm run dev` e abra `http://localhost:3000`.

Sem `DATABASE_URL`, o desenvolvimento usa PostgreSQL embarcado PGlite na pasta `data/`. Em produção, PostgreSQL externo e URL HTTPS são obrigatórios. Contas de teste não são incluídas no pacote nem criadas automaticamente na instalação.

Verificação: `npm run check`, `npm run build`, `npm test`. A suíte usa PostgreSQL embarcado, HTTP real e WebSocket, com contas sintéticas em memória. Inclui acesso por convite, permissões, moderação, sessões, recuperação, notificações, idempotência, anexos, enquetes, eventos e restauração criptografada.

## Limites de operação

Esta configuração é de uma instância e uma comunidade pequena. O broadcast WebSocket em memória não suporta várias instâncias sem mensageria compartilhada; anexos no banco se destinam a um volume pequeno. Chamadas usam malha entre navegadores, até oito participantes, e precisam ser validadas entre os dispositivos e redes usados. Não foi realizado teste de carga nem auditoria independente de segurança.

O backup integrado exige a chave correta. Guarde cópias fora do Render também: backup no mesmo banco não protege contra a expiração ou perda desse banco. A restauração deve ser feita em janela de manutenção, sem outros usuários gravando dados. Não restaure backups de origem desconhecida.

Documentação de hospedagem: https://render.com/docs/blueprint-spec e https://render.com/docs/disks.
