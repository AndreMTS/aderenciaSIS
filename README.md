# Verificador de Aderência Sisloc

<img src="/demo/demo.jpg">

Este projeto é um aplicativo desktop desenvolvido em Electron para verificar se o computador ou servidor atende aos requisitos mínimos recomendados para os produtos Sisloc (Start, Light, Sys, Premium).

## Funcionalidades

- **Detecção automática** de informações do sistema (RAM, CPU, Disco, Sistema Operacional e Build do Windows)
- **Comparação** com requisitos mínimos para cada produto e tipo de instalação (Estação/Servidor)
- **Interface moderna** em estilo wizard (passo a passo)
- **Validação de CNPJ** com máscara e opção de continuar mesmo com formato incorreto
- **Geração de relatório em PDF** com todos os detalhes da análise
- **Modal customizado** para mensagens e validações
- **Botão de reinício** para nova verificação
- **Link para mais informações** sobre requisitos no site oficial Sisloc
- **Design responsivo** e profissional (laranja e preto, com logo da empresa)

## Como usar

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Execute o aplicativo:**
   ```bash
   npm start
   ```

## Estrutura do Projeto

- `main.js` — Processo principal do Electron, coleta informações do sistema e gera PDF
- `preload.js` — Comunicação segura entre o processo principal e o front-end
- `index.html` — Interface do usuário (wizard, validações, exibição dos resultados)
- `src/img/` — Imagens dos produtos
- `src/logo/` — Logo da empresa

## Requisitos

- **Node.js** (versão 16 ou superior recomendada)
- **Windows 10/11** (funciona em outras plataformas, mas a verificação de build é específica para Windows)

## Observações

- O aplicativo não coleta nem envia dados para a internet. Toda análise é local.

