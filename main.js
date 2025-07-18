const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const fs = require('fs');
const P = require('pino');

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');

  const sock = makeWASocket({
    logger: P({ level: 'silent' }),
    printQRInTerminal: true,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, fs)
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // 🔍 Monitora saídas de grupo
  sock.ev.on('group-participants.update', async (update) => {
    const { id: groupId, participants, action } = update;

    for (const participant of participants) {
      const phone = participant.split('@')[0];

      if (action === 'remove' || action === 'leave') {
        console.log(`📤 ${phone} saiu do grupo ${groupId} (ação: ${action})`);

        // Aqui você pode salvar em um arquivo, banco de dados, ou notificar alguém
        fs.appendFileSync('saida_grupo.log', `${new Date().toISOString()} | ${phone} saiu de ${groupId}\n`);
      }
    }
  });

  // Reconexão automática
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('⚠️ Conexão encerrada. Reconnect?', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('✅ Conectado ao WhatsApp');
    }
  });
}

startBot();
