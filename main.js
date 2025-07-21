const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const si = require('systeminformation');
const path = require('path');

// Requisitos mínimos por produto para desktop (Windows 10 build 19045+)
const requisitosProdutosDesktop = {
  start:    { ramGB: 8, cpuCores: 4, discoGB: 50, buildMin: 19045, osMinVersion: 'Windows 10 22H2' },
  light:    { ramGB: 8, cpuCores: 4, discoGB: 50, buildMin: 19045, osMinVersion: 'Windows 10 22H2' },
  sys:      { ramGB: 8, cpuCores: 8, discoGB: 50, buildMin: 19045, osMinVersion: 'Windows 10 22H2' },
  premium:  { ramGB: 8, cpuCores: 8, discoGB: 50, buildMin: 19045, osMinVersion: 'Windows 10 22H2' }
};

// Requisitos mínimos por produto para servidor (Windows Server 2016 = build 14393)
const requisitosProdutosServidor = {
  start:    { ramGB: 16, cpuCores: 8, discoGB: 100, buildMin: 14393, osMinVersion: 'Windows Server 2016' },
  light:    { ramGB: 16, cpuCores: 8, discoGB: 100, buildMin: 14393, osMinVersion: 'Windows Server 2016' },
  sys:      { ramGB: 16, cpuCores: 8, discoGB: 100, buildMin: 14393, osMinVersion: 'Windows Server 2016' },
  premium:  { ramGB: 16, cpuCores: 8, discoGB: 100, buildMin: 14393, osMinVersion: 'Windows Server 2016' }
};
;

function verificarAderencia(info, produto) {
  const req = requisitosProdutosDesktop[produto];
  if (!req) return false;
  const ramOK = info.ramGB >= req.ramGB;
  const cpuOK = info.cpuCores >= req.cpuCores;
  const discoOK = info.discoGB >= req.discoGB;
  const sistemaOK = info.sistema.includes(req.sistema);
  return ramOK && cpuOK && discoOK && sistemaOK;
}

function verificarAderenciaDetalhada(info, produto, tipo) {
  const reqs = tipo === 'servidor' ? requisitosProdutosServidor : requisitosProdutosDesktop;
  const req = reqs[produto];
  if (!req) return {
    geral: false,
    ram: false,
    cpu: false,
    disco: false,
    sistema: false,
    minimos: req
  };
  const ram = info.ramGB >= req.ramGB;
  const cpu = info.cpuCores >= req.cpuCores;
  const disco = info.discoGB >= req.discoGB;
  // Verifica build mínima do Windows
  const sistema = info.build && info.build >= req.buildMin;
  return {
    geral: ram && cpu && disco && sistema,
    ram,
    cpu,
    disco,
    sistema,
    minimos: req
  };
}

async function coletarInfo() {
  const mem = await si.mem();
  const cpu = await si.cpu();
  const os = await si.osInfo();
  const discos = await si.fsSize();

  // Lista de todos os discos e seus espaços livres
  const discosDetalhados = discos.map(d => ({
    mount: d.mount,
    tipo: d.type,
    totalGB: Math.round(d.size / 1024 / 1024 / 1024),
    livreGB: Math.round(d.available / 1024 / 1024 / 1024)
  }));

  // Seleciona o disco com mais espaço livre
  const discoMaisLivre = discosDetalhados.reduce((maior, atual) =>
    atual.livreGB > maior.livreGB ? atual : maior, { livreGB: 0, mount: 'N/A' });

  return {
    ramGB: Math.round(mem.total / 1024 / 1024 / 1024),
    cpuCores: cpu.cores,
    discoGB: discoMaisLivre.livreGB,
    discoMount: discoMaisLivre.mount,
    sistema: os.distro + ' ' + os.release,
    build: Number(os.build) || 0,
    discosDetalhados // 👈 incluímos aqui
  };
}

function createWindow () {
  const win = new BrowserWindow({
    width: 820,
    height: 800,
    resizable: false, // Impede redimensionamento
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      //devTools: false, // Desativa DevTools
    },
  });

  // // Remove o menu padrão
  // win.setMenu(null);

  // // Bloqueia menu de contexto (botão direito)
  // win.webContents.on('context-menu', (e) => {
  //   e.preventDefault();
  // });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('obter-infos', async (event, produto, tipo) => {
  const info = await coletarInfo();
  const aderencia = verificarAderenciaDetalhada(info, produto, tipo);
  return { ...info, aderencia };
});

ipcMain.handle('gerar-pdf', async (event, dados) => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return;
  // Montar HTML do PDF (usando os dados recebidos)
  const { produto, tipo, info, empresa, cnpj, hostname } = dados;
  const ad = info.aderencia;
  const iconeCheck = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="green" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 10 18 4 12"/></svg>';
  const iconeX = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  const html = `
  <html><head><meta charset='utf-8'>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8f9fa; margin: 0; padding: 0; }
    .pdf-container { max-width: 600px; margin: 30px auto; background: white; border-radius: 12px; box-shadow: 0 8px 24px #0001; padding: 32px; }
    h2 { color: #667eea; text-align: center; margin-bottom: 10px; }
    .info-pdf { margin-bottom: 10px; }
    .info-pdf span { font-weight: 600; }
    .pdf-table { width: 100%; border-collapse: collapse; margin-top: 18px; }
    .pdf-table th, .pdf-table td { padding: 10px 8px; text-align: left; font-size: 1em; }
    .pdf-table th { background: #f0f0f7; color: #333; }
    .pdf-table td { background: #fafbfc; }
    .pdf-table td.status { text-align: center; }
    .status-aderente { color: #28a745; font-weight: bold; }
    .status-nao-aderente { color: #dc3545; font-weight: bold; }
    .pdf-rodape { margin-top: 30px; text-align: center; color: #888; font-size: 0.95em; }
  </style></head><body>
  <div class='pdf-container'>
    <h2>Relatório de Aderência</h2>
    <div class='info-pdf'><span>Empresa:</span> ${empresa || '-'} &nbsp; | &nbsp; <span>CNPJ:</span> ${cnpj || '-'}</div>
    <div class='info-pdf'><span>Nome do PC:</span> ${hostname || '-'}</div>
    <div class='info-pdf'><span>Produto:</span> ${produto.toUpperCase()} &nbsp; | &nbsp; <span>Tipo:</span> ${tipo === 'servidor' ? 'Servidor' : 'Estação (Desktop)'}</div>
    <div class='info-pdf'><span>Data:</span> ${new Date().toLocaleString('pt-BR')}</div>
    <table class='pdf-table'>
      <tr><th>Quesito</th><th>Seu PC</th><th>Mínimo</th><th>Status</th></tr>
      <tr><td>RAM</td><td>${info.ramGB} GB</td><td>${ad.minimos.ramGB} GB</td><td class='status'>${ad.ram ? iconeCheck : iconeX}</td></tr>
      <tr><td>CPU</td><td>${info.cpuCores} núcleos</td><td>${ad.minimos.cpuCores} núcleos</td><td class='status'>${ad.cpu ? iconeCheck : iconeX}</td></tr>
      <tr><td>Disco</td><td>${info.discoGB} GB livres (${info.discoMount})</td><td>${ad.minimos.discoGB} GB</td><td class='status'>${ad.disco ? iconeCheck : iconeX}</td></tr>
      <tr><td>Sistema</td><td>${info.sistema} (build ${info.build})</td><td>build ${ad.minimos.buildMin}</td><td class='status'>${ad.sistema ? iconeCheck : iconeX}</td></tr>
    </table>
    <table class='pdf-table' style='margin-top: 30px'>
  <tr><th colspan="3">Discos Detectados</th></tr>
  <tr><th>Unidade</th><th>Tamanho Total</th><th>Espaço Livre</th></tr>
  ${
    info.discosDetalhados.map(disco => `
      <tr>
        <td>${disco.mount}</td>
        <td>${disco.totalGB} GB</td>
        <td>${disco.livreGB} GB</td>
      </tr>
    `).join('')
  }
</table>
    <div class='status-geral' style='margin-top:22px; font-size:1.1em; padding:12px; border-radius:8px; background:${ad.geral ? '#28a74522' : '#dc354522'}; color:${ad.geral ? '#28a745' : '#dc3545'};'>
      ${ad.geral ? 'Aderente aos requisitos mínimos!' : 'Não aderente aos requisitos mínimos.'}
    </div>
    <div class='pdf-rodape'>Relatório gerado automaticamente pelo sistema de verificação de aderência.</div>
  </div>
  </body></html>
  `;
  // Criar janela oculta para renderizar o HTML
  let pdfWin = new BrowserWindow({ show: false, width: 700, height: 600 });
  await pdfWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  const pdfBuffer = await pdfWin.webContents.printToPDF({
    printBackground: true,
    pageSize: 'A4',
    margin: { top: 20, bottom: 20, left: 20, right: 20 }
  });
  pdfWin.close();
  // Perguntar onde salvar
  const { filePath } = await dialog.showSaveDialog(win, {
    title: 'Salvar PDF de Aderência',
    defaultPath: `relatorio-aderencia-${produto}-${tipo}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });
  if (filePath) {
    require('fs').writeFileSync(filePath, pdfBuffer);
  }
});

ipcMain.handle('abrir-link-externo', async (event, url) => {
  await shell.openExternal(url);
}); 