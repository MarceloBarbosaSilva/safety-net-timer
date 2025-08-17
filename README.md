# Safety Net Timer ⏰

Um gerenciador de tempo inteligente para pausas e compromissos com lembretes personalizáveis e timer visual por cores.

## 🌟 Características

### ⏱️ Timer Visual por Cores
- **Cores Dinâmicas**: Timer muda cor conforme o lembrete ativo
- **Legenda Inteligente**: Mostra qual lembrete está ativo
- **Transições Suaves**: Entre as cores dos lembretes

### 🔔 Sistema de Lembretes
- **Lembretes Sequenciais**: Calculados automaticamente
- **Sons Personalizados**: Escolha arquivos de áudio do dispositivo
- **Vibração**: Alarmes com vibração
- **Persistente**: Alarme continua até ser dispensado

### 📱 PWA (Progressive Web App)
- **App Nativo**: Instalável na tela inicial
- **Offline**: Funciona sem internet
- **Notificações**: Push notifications
- **Wake Lock**: Mantém tela ligada durante timer

### 🎨 Interface Intuitiva
- **Tela Unificada**: Configure e execute na mesma tela
- **Edição Inline**: Renomeie timers diretamente
- **Layout Responsivo**: Otimizado para mobile
- **Always-On Display**: Brilho baixo durante timer ativo

## 🚀 Tecnologias

- **React 18** - Framework principal
- **Vite** - Build tool
- **PWA** - Progressive Web App
- **Web Audio API** - Sons personalizados
- **Wake Lock API** - Mantém tela ligada
- **Vibration API** - Vibração nos alarmes

## 📦 Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/safety-net-timer.git
cd safety-net-timer

# Instale as dependências
npm install

# Execute em desenvolvimento
npm run dev

# Build para produção
npm run build
```

## 📱 Como Usar

### 1. Configurar Timer
- Digite o nome do timer
- Escolha a hora de início ou use "Agora"
- Selecione a duração (presets ou personalizada)
- Adicione lembretes com nomes e minutos

### 2. Lembretes Sequenciais
- O primeiro lembrete é X minutos antes do fim
- Os próximos são Y minutos antes do lembrete anterior
- Exemplo: Fim 13:00, T20 12:40, T5 12:35

### 3. Timer Visual
- Círculo principal muda cor conforme lembrete ativo
- Cada lembrete tem sua cor na legenda
- Tempo mostrado é até o próximo lembrete

### 4. Alarmes
- Som personalizado do dispositivo
- Vibração persistente
- Modal de alarme até ser dispensado
- Tela sempre ligada durante timer

## 🎯 Casos de Uso

- **Pausas de Almoço**: Controle tempo de descanso
- **Reuniões**: Lembretes para preparação
- **Medicamentos**: Horários de remédios
- **Exercícios**: Intervalos de treino
- **Estudos**: Pausas programadas

## 📱 PWA (Progressive Web App)

O app pode ser instalado como PWA no celular:
1. Acesse a URL do deploy no navegador do celular
2. Toque em "Adicionar à tela inicial"
3. O app aparecerá na lista de aplicativos

### 🎯 Para Gerar APK:
1. Use [PWA Builder](https://www.pwabuilder.com/)
2. Cole a URL do deploy
3. Baixe o APK gerado

## 🌐 Deploy

- **Vercel**: Deploy automático via GitHub
- **Netlify**: Deploy estático
- **GitHub Pages**: Hospedagem gratuita

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 Autor

**Marcelo** - [GitHub](https://github.com/seu-usuario)

---

⭐ Se este projeto te ajudou, deixe uma estrela!
