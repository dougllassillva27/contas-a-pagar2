contentScript.js:3 Starting nGrams value 0
app.js?v=9:815 [EnviarLancamento] 🚀 Iniciando submissão. Tipo: CONTA
app.js?v=9:826 [EnviarLancamento] 🔒 Desabilitando botão de submit.
app.js?v=9:834 [EnviarLancamento] 🆔 Lançamento ID: "" (Vazio = Novo Lançamento)
app.js?v=9:854 [EnviarLancamento] 📄 Dados para envio: {descricao: '1', valor: '123', sub_tipo: 'Única', tipo_transacao: 'CONTA', context_month: 5, …}
app.js?v=9:884 [EnviarLancamento] 📡 Enviando requisição HTTP POST para: /api/lancamentos
app.js?v=9:890 [EnviarLancamento] 📥 Resposta recebida. Status: 200
app.js?v=9:896 [EnviarLancamento] ✅ Sucesso no salvamento. Response data: {success: true, criados: 2}
app.js?v=9:41 [SoftRefresh] ⏳ Iniciando atualização do DOM sem reload...
app.js?v=9:56 [SoftRefresh] 🌐 Buscando URL: http://localhost:3000/?\_t=1779576039779
app.js?v=9:136 [SoftRefresh] ❌ Falha catastrófica no Soft Refresh: AbortError: signal is aborted without reason
at app.js?v=9:50:16
softRefresh @ app.js?v=9:136
await in softRefresh
enviarLancamento @ app.js?v=9:899
await in enviarLancamento
onsubmit @ (index):2181
app.js?v=9:912 [EnviarLancamento] 🔓 Reabilitando botão no finally.
