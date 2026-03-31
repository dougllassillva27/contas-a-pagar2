/**
 * Script de Automação: Cópia Mensal de Contas
 * 
 * Este script é destinado a ser executado via Cron Job (ex: Render).
 * Ele identifica o mês atual e executa a cópia das contas para o próximo mês
 * para todos os usuários cadastrados no sistema.
 * 
 * Agendamento Sugerido (Render): 0 2 1 * * (UTC)
 * Isso corresponde a 23:00 do último dia do mês em Brasília (UTC-3).
 */

require('dotenv').config();
const db = require('../config/db');
const repo = require('../repositories/LancamentoRepository');
const TelegramBot = require('node-telegram-bot-api');

async function run() {
  console.log('--- [AUTO-COPY] Iniciando processo de cópia mensal ---');
  
  try {
    // 1. Calcular o mês e ano de referência (Brasília Time)
    // Se rodar às 02:00 UTC do dia 01/04, em Brasília é 23:00 do dia 31/03.
    // Pegamos a data atual e subtraímos 3 horas para garantir o contexto de Brasília.
    const agora = new Date();
    const dataBrasilia = new Date(agora.getTime() - (3 * 60 * 60 * 1000));
    
    const mesReferencia = dataBrasilia.getMonth() + 1; // 1-12
    const anoReferencia = dataBrasilia.getFullYear();
    
    console.log(`[AUTO-COPY] Contexto: ${mesReferencia}/${anoReferencia} (Brasília)`);

    // 2. Buscar todos os usuários
    const resUsuarios = await db.query('SELECT id, nome FROM Usuarios');
    const usuarios = resUsuarios.rows;
    
    if (usuarios.length === 0) {
      console.log('[AUTO-COPY] Nenhum usuário encontrado no sistema.');
      await db.end();
      return;
    }

    let sucessos = 0;
    let erros = 0;
    const detalhes = [];

    // 3. Executar cópia para cada usuário
    for (const user of usuarios) {
      try {
        console.log(`[AUTO-COPY] Processando usuário: ${user.nome} (ID: ${user.id})...`);
        await repo.copyMonth(user.id, mesReferencia, anoReferencia);
        sucessos++;
        detalhes.push(`✅ ${user.nome}: Sucesso`);
      } catch (err) {
        console.error(`[AUTO-COPY] ❌ Erro ao copiar mês para ${user.nome}:`, err.message);
        erros++;
        detalhes.push(`❌ ${user.nome}: Erro (${err.message})`);
      }
    }

    const resumo = `📊 Automação concluída!\nSucessos: ${sucessos}\nErros: ${erros}\n\n${detalhes.join('\n')}`;
    console.log(`[AUTO-COPY] ${resumo}`);

    // 4. Notificar via Telegram (opcional)
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      try {
        const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
        const mensagemBot = `🤖 *Automação de Contas*\n\nProcesso de cópia realizado para o mês de *${mesReferencia}/${anoReferencia}*\\.\n\n${resumo.replace(/!/g, '\\!').replace(/-/g, '\\-').replace(/\./g, '\\.')}`;
        
        await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, mensagemBot, { parse_mode: 'MarkdownV2' });
        console.log('[AUTO-COPY] Notificação enviada via Telegram.');
      } catch (botErr) {
        console.error('[AUTO-COPY] ⚠️ Erro ao enviar para o Telegram:', botErr.message);
      }
    }

  } catch (error) {
    console.error('[AUTO-COPY] 💥 Erro crítico no script:', error);
  } finally {
    await db.end();
    console.log('--- [AUTO-COPY] Script finalizado ---');
    // Forçamos a saída para garantir que o processo termine em ambientes de serverless/cron
    process.exit(0);
  }
}

run();
