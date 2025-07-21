const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sistema', {
  obterInfos: (produto, tipo) => ipcRenderer.invoke('obter-infos', produto, tipo),
  gerarPDF: (dados) => ipcRenderer.invoke('gerar-pdf', dados),
  getHostname: () => {
    try {
      return require('os').hostname();
    } catch (e) {
      return '';
    }
  },
  abrirLinkExterno: (url) => ipcRenderer.invoke('abrir-link-externo', url)
}); 