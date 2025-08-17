import React, { useState, useEffect, useRef } from 'react';
import { Clock, Play, Pause, Square, Bell, Plus, Trash2, Save, Edit3, ArrowLeft, Settings } from 'lucide-react';

const SafetyNetApp = () => {
  const [currentView, setCurrentView] = useState('list'); // 'list', 'unified'
  const [selectedDuration, setSelectedDuration] = useState(120); // em minutos
  const [startTime, setStartTime] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const [endTime, setEndTime] = useState('');
  const [alerts, setAlerts] = useState([
    { id: 1, label: 'Lembrete 20min', minutes: 20, color: '#ff6b6b' },
    { id: 2, label: 'Lembrete 5min', minutes: 5, color: '#4ecdc4' }
  ]);
  const [triggeredAlerts, setTriggeredAlerts] = useState(new Set());
  const [notification, setNotification] = useState('');
  const [savedTimers, setSavedTimers] = useState([]);
  const [activeTimer, setActiveTimer] = useState(null);
  const [editingTimer, setEditingTimer] = useState(null);
  const [showCustomDurationModal, setShowCustomDurationModal] = useState(false);
  const [isEditingTimerName, setIsEditingTimerName] = useState(false);
  const [tempTimerName, setTempTimerName] = useState('');
  
  const audioRef = useRef(null);
  const intervalRef = useRef(null);
  const [activeAlarm, setActiveAlarm] = useState(null); // Alarme ativo que precisa ser dispensado
  const alarmAudioRef = useRef(null);
  const alarmIntervalRef = useRef(null);
  const wakeLockRef = useRef(null);

  const presets = [
    { label: '15min', value: 15, display: '15 minutos' },
    { label: '30min', value: 30, display: '30 minutos' },
    { label: '45min', value: 45, display: '45 minutos' },
    { label: '1h', value: 60, display: '1 hora' },
    { label: '1h30', value: 90, display: '1 hora e 30 minutos' },
    { label: '2h', value: 120, display: '2 horas' },
    { label: '2h30', value: 150, display: '2 horas e 30 minutos' },
    { label: '3h', value: 180, display: '3 horas' }
  ];

  const daysOfWeek = [
    { key: 'dom', label: 'Dom' },
    { key: 'seg', label: 'Seg' },
    { key: 'ter', label: 'Ter' },
    { key: 'qua', label: 'Qua' },
    { key: 'qui', label: 'Qui' },
    { key: 'sex', label: 'Sex' },
    { key: 'sab', label: 'Sáb' }
  ];

  // Paleta de cores para lembretes
  const alertColors = [
    '#ff6b6b', // Vermelho
    '#4ecdc4', // Turquesa
    '#45b7d1', // Azul
    '#96ceb4', // Verde
    '#feca57', // Amarelo
    '#ff9ff3', // Rosa
    '#54a0ff', // Azul claro
    '#5f27cd', // Roxo
    '#00d2d3', // Ciano
    '#ff9f43'  // Laranja
  ];

  useEffect(() => {
    // Criar elemento de áudio para alarmes
    audioRef.current = new Audio();
    audioRef.current.src = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdBTuL0ey8cyMGLH7K79iROQEZaLzs5KFRFQ1Vqub0t2QdBDqK0/DJgjQFKoHM79eOOAQZabrr4qFOEguIutjxz4E6AReP1+7BdyMGKn/K8diSNwgSYLbh5Z9SFAhAor/4mEASB1ip2O2CQAAWm+v6mFQSChFN1frLjRqNqODotGCbWJSWyy8IFaJZpKGJW6qIkMY8o0EggU2X5qPjy8Q1JmGn8dF9HTOFyeOULTEZajLO6IggJ";
    
    // Solicitar permissão para notificações
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isRunning && remainingTime > 0) {
      intervalRef.current = setInterval(() => {
        setRemainingTime(prev => {
          const newTime = prev - 1;
          
          // Verificar alertas sequenciais cumulativos
          const minutesRemaining = Math.floor(newTime / 60);
          const sequentialAlerts = calculateSequentialAlertTimes();
          
          sequentialAlerts.forEach(alertItem => {
            if (minutesRemaining === alertItem.minutesFromStart && !triggeredAlerts.has(alertItem.id)) {
              triggerAlert(`🔔 ${alertItem.label}: Lembrete ativado!`, alertItem);
              setTriggeredAlerts(prev => new Set([...prev, alertItem.id]));
            }
          });
          
          if (newTime <= 0) {
            triggerAlert('⏰ Tempo esgotado! Hora de voltar!');
            setIsRunning(false);
            // Desativar always-on quando timer termina
            releaseWakeLock();
            resetBrightness();
            return 0;
          }
          
          return newTime;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
      }, [isRunning, alerts, triggeredAlerts]);

  // Verificar timers programados a cada minuto
  useEffect(() => {
    const checkInterval = setInterval(checkScheduledTimers, 60000);
    return () => clearInterval(checkInterval);
  }, [savedTimers]);

  const triggerAlert = (message, alert = null) => {
    // Notificação visual
    setNotification(message);
    setTimeout(() => setNotification(''), 5000);
    
    // Configurar alarme persistente
    if (alert) {
      setActiveAlarm({
        message,
        alert
      });
      startPersistentAlarm(alert);
    } else {
      // Alarme simples para timer final
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.log('Não foi possível tocar o som:', e));
      }
    }
    
    // Notificação do browser
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Safety Net', {
        body: message,
        icon: '/pwa-192x192.png'
      });
    }
  };

  const startPersistentAlarm = (alert) => {
    // Parar alarme anterior se existir
    stopPersistentAlarm();
    
    const soundType = alert.sound || 'default';
    
    // Configurar áudio baseado no tipo de som
    if (soundType === 'vibration') {
      // Apenas vibração, sem som
    } else if (soundType === 'custom' && alert.customSoundUrl) {
      // Som personalizado do usuário
      alarmAudioRef.current = new Audio(alert.customSoundUrl);
      alarmAudioRef.current.loop = true;
      alarmAudioRef.current.volume = 0.8;
      alarmAudioRef.current.play().catch(console.error);
    } else {
      // Som padrão do sistema - usar Web Audio API para tom simples
      playSystemSound();
    }
    
    // Vibração sempre ativa (quando disponível)
    if (navigator.vibrate) {
      // Padrão de vibração: vibra 500ms, pausa 300ms, repete
      const vibratePattern = [500, 300];
      alarmIntervalRef.current = setInterval(() => {
        navigator.vibrate(vibratePattern);
      }, 800);
    }
  };

  const playSystemSound = () => {
    // Usar Web Audio API para criar um som simples
    if (window.AudioContext || window.webkitAudioContext) {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      const playBeep = () => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800; // Frequência em Hz
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      };
      
      // Tocar beep a cada segundo
      playBeep(); // Primeiro beep imediato
      alarmIntervalRef.current = setInterval(playBeep, 1000);
    }
  };

  const stopPersistentAlarm = () => {
    if (alarmAudioRef.current) {
      alarmAudioRef.current.pause();
      alarmAudioRef.current.currentTime = 0;
    }
    
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
    }
    
    if (navigator.vibrate) {
      navigator.vibrate(0); // Para a vibração
    }
  };

  const dismissAlarm = () => {
    stopPersistentAlarm();
    setActiveAlarm(null);
  };

  // Funções para Wake Lock (impedir tela de apagar)
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('Wake Lock ativado - tela não vai apagar');
        
        // Escutar quando o wake lock é liberado
        wakeLockRef.current.addEventListener('release', () => {
          console.log('Wake Lock foi liberado');
        });
      }
    } catch (error) {
      console.log('Não foi possível ativar Wake Lock:', error);
    }
  };

  const releaseWakeLock = async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('Wake Lock desativado');
      }
    } catch (error) {
      console.log('Erro ao desativar Wake Lock:', error);
    }
  };

  // Diminuir brilho quando timer está rodando
  const setLowBrightness = () => {
    document.body.classList.add('low-brightness');
  };

  const resetBrightness = () => {
    document.body.classList.remove('low-brightness');
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  };

  const calculateEndTime = (start, durationMinutes) => {
    const [hours, minutes] = start.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
    return endDate.toTimeString().slice(0, 5);
  };

  const startTimer = (useCurrentTime = false) => {
    const time = useCurrentTime ? getCurrentTime() : startTime;
    if (!time) return;
    
    const calculatedEndTime = calculateEndTime(time, selectedDuration);
    setEndTime(calculatedEndTime);
    setRemainingTime(selectedDuration * 60);
    setIsRunning(true);
    setTriggeredAlerts(new Set());
    
    // Ativar always-on display
    requestWakeLock();
    setLowBrightness();
    
    if (useCurrentTime) {
      setStartTime(time);
    }
  };

  const pauseTimer = () => {
    setIsRunning(false);
    // Manter wake lock ativo durante pausa
  };

  const stopTimer = () => {
    setIsRunning(false);
    setRemainingTime(0);
    setEndTime('');
    setTriggeredAlerts(new Set());
    
    // Desativar always-on display
    releaseWakeLock();
    resetBrightness();
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCircleProgress = () => {
    const totalSeconds = selectedDuration * 60;
    const progress = ((totalSeconds - remainingTime) / totalSeconds) * 360;
    return Math.min(progress, 360);
  };

  const getAlertColor = (index) => alertColors[index % alertColors.length];

  // Opções de sons disponíveis
  const soundOptions = [
    { id: 'default', name: 'Padrão do Sistema', type: 'system' },
    { id: 'vibration', name: 'Apenas Vibração', type: 'vibration' },
    { id: 'custom', name: 'Escolher Arquivo...', type: 'file' }
  ];

  // Função para lidar com seleção de arquivo de áudio
  const handleSoundFileSelection = (alertId, file) => {
    if (file && file.type.startsWith('audio/')) {
      const fileUrl = URL.createObjectURL(file);
      updateAlert(alertId, 'sound', 'custom');
      updateAlert(alertId, 'customSoundUrl', fileUrl);
      updateAlert(alertId, 'customSoundName', file.name);
    }
  };

  const addAlert = () => {
    const newId = Math.max(...alerts.map(a => a.id), 0) + 1;
    const colorIndex = alerts.length % alertColors.length;
    setAlerts(prev => [...prev, { 
      id: newId, 
      label: `Lembrete ${10}min`, 
      minutes: 10,
      color: alertColors[colorIndex],
      sound: 'default' // Som padrão
    }]);
  };

  const removeAlert = (id) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const updateAlert = (id, field, value) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === id ? { ...alert, [field]: value } : alert
    ));
  };

  const getSelectedPreset = () => {
    return presets.find(p => p.value === selectedDuration);
  };

  const formatTimeToHours = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h${mins.toString().padStart(2, '0')}min`;
  };

  // Função removida - agora usamos sempre calculateSequentialAlertTimes para consistência

  const calculateSequentialAlertTimes = () => {
    if (!startTime || !selectedDuration) return [];
    
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = new Date(startDate.getTime() + selectedDuration * 60000);
    
    // Ordenar lembretes por minutos (do maior para o menor) para calcular
    const sortedForCalculation = [...alerts].sort((a, b) => b.minutes - a.minutes);
    
    const calculatedTimes = new Map();
    let currentTime = endDate;
    
    sortedForCalculation.forEach(alert => {
      // Subtrair minutos do tempo atual
      const alertTime = new Date(currentTime.getTime() - alert.minutes * 60000);
      const minutesFromStart = Math.floor((alertTime.getTime() - startDate.getTime()) / 60000);
      
      calculatedTimes.set(alert.id, {
        time: alertTime.toTimeString().slice(0, 5),
        minutesFromStart: minutesFromStart
      });
      
      // Próximo lembrete será baseado neste horário
      currentTime = alertTime;
    });
    
    // Retornar na ordem original dos lembretes (como aparecem na interface)
    return alerts.map(alert => ({
      ...alert,
      time: calculatedTimes.get(alert.id)?.time || '--:--',
      minutesFromStart: calculatedTimes.get(alert.id)?.minutesFromStart || 0
    }));
  };

  // Função para encontrar o próximo lembrete
  const getNextAlert = () => {
    if (!isRunning || remainingTime <= 0) return null;
    
    const sequentialAlerts = calculateSequentialAlertTimes();
    const currentMinutesFromStart = Math.floor((selectedDuration * 60 - remainingTime) / 60);
    
    // Encontrar o próximo lembrete que ainda não aconteceu
    const nextAlert = sequentialAlerts.find(alert => 
      alert.minutesFromStart > currentMinutesFromStart
    );
    
    return nextAlert;
  };

  // Função para calcular tempo até próximo lembrete
  const getTimeToNextAlert = () => {
    const nextAlert = getNextAlert();
    if (!nextAlert) return remainingTime; // Se não há próximo lembrete, mostrar tempo total
    
    // Calcular tempo em segundos até o próximo lembrete
    const totalSecondsFromStart = selectedDuration * 60 - remainingTime;
    const nextAlertTimeInSeconds = nextAlert.minutesFromStart * 60;
    const secondsToNext = nextAlertTimeInSeconds - totalSecondsFromStart;
    
    return Math.max(0, secondsToNext);
  };

  // Função para determinar qual lembrete está ativo (para cores do timer)
  const getActiveAlert = () => {
    if (!isRunning || remainingTime <= 0) return null;
    
    const sequentialAlerts = calculateSequentialAlertTimes();
    const currentMinutesFromStart = Math.floor((selectedDuration * 60 - remainingTime) / 60);
    
    // Encontrar o lembrete ativo (o que já passou mas ainda não chegou no próximo)
    const activeAlert = sequentialAlerts.find(alert => 
      alert.minutesFromStart <= currentMinutesFromStart
    );
    
    return activeAlert;
  };

  // Função para obter a cor do timer baseada no lembrete ativo
  const getTimerColor = () => {
    if (!isRunning) return '#3b82f6'; // Azul padrão quando parado
    
    const activeAlert = getActiveAlert();
    if (!activeAlert) return '#3b82f6'; // Azul se não há lembrete ativo
    
    // Encontrar o índice do lembrete ativo
    const alertIndex = alerts.findIndex(a => a.id === activeAlert.id);
    return getAlertColor(alertIndex);
  };

  const createNewTimer = () => {
    const newTimer = {
      id: Date.now(),
      name: 'Novo Timer',
      duration: selectedDuration,
      alerts: [...alerts],
      scheduledTime: '',
      activeDays: ['seg', 'ter', 'qua', 'qui', 'sex'],
      isActive: true,
      autoStart: false
    };
    setEditingTimer(newTimer);
    setActiveTimer(null);
    setCurrentView('unified');
  };

  const saveTimer = (timer) => {
    if (editingTimer.id && savedTimers.find(t => t.id === editingTimer.id)) {
      setSavedTimers(prev => prev.map(t => t.id === timer.id ? timer : t));
    } else {
      setSavedTimers(prev => [...prev, { ...timer, id: timer.id || Date.now() }]);
    }
    // Não volta para a lista, mantém na tela unificada
    setActiveTimer(timer);
  };

  const deleteTimer = (timerId) => {
    setSavedTimers(prev => prev.filter(t => t.id !== timerId));
    if (activeTimer?.id === timerId) {
      stopTimer();
    }
  };

  const startTimerFromSaved = (timer) => {
    setActiveTimer(timer);
    setSelectedDuration(timer.duration);
    setAlerts(timer.alerts);
    setEditingTimer(timer);
    setCurrentView('unified');
  };

  const checkScheduledTimers = () => {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const currentDay = daysOfWeek[now.getDay()].key;
    
    savedTimers.forEach(timer => {
      if (timer.isActive && 
          timer.autoStart && 
          timer.scheduledTime === currentTime && 
          timer.activeDays.includes(currentDay)) {
        startTimerFromSaved(timer);
      }
    });
  };

  const editTimer = (timer) => {
    setEditingTimer({ ...timer });
    setSelectedDuration(timer.duration);
    setAlerts(timer.alerts);
    setCurrentView('edit');
  };

  // Views renderizadas
  const renderTimersList = () => (
    <>
      <header className="header">
        <h1 className="title">
          <Clock className="inline mr-2" size={28} />
          Safety Net
        </h1>
        <p className="subtitle">Seus timers personalizados</p>
      </header>

      <div className="timers-list">
        {savedTimers.length === 0 ? (
          <div className="empty-state">
            <Clock size={48} className="empty-icon" />
            <h3>Nenhum timer criado</h3>
            <p>Crie seu primeiro timer personalizado</p>
          </div>
        ) : (
          <div className="timers-grid">
            {savedTimers.map(timer => (
              <div key={timer.id} className="timer-card">
                <div className="timer-card-header">
                  <h3 className="timer-name">{timer.name}</h3>
                  <div className="timer-actions">
                    <button 
                      className="btn-icon" 
                      onClick={() => editTimer(timer)}
                      title="Editar"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      className="btn-icon btn-danger" 
                      onClick={() => deleteTimer(timer.id)}
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="timer-info">
                  <div className="timer-duration">
                    <Clock size={16} />
                    <span>{formatTimeToHours(timer.duration)}</span>
                  </div>
                  
                  <div className="timer-alerts">
                    <Bell size={16} />
                    <span>{timer.alerts.length} lembretes</span>
                  </div>
                  
                  {timer.scheduledTime && (
                    <div className="timer-schedule">
                      <span className="schedule-time">{timer.scheduledTime}</span>
                      <span className="schedule-days">
                        {timer.activeDays.map(day => daysOfWeek.find(d => d.key === day)?.label).join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  className="btn btn-primary btn-start-timer"
                  onClick={() => startTimerFromSaved(timer)}
                >
                  <Play size={16} className="inline mr-1" />
                  Iniciar Agora
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="btn btn-primary btn-fab" onClick={createNewTimer}>
        <Plus size={24} />
      </button>
    </>
  );

  const handleSaveTimerName = () => {
    if (activeTimer && tempTimerName.trim()) {
      const updatedTimer = { ...activeTimer, name: tempTimerName.trim() };
      setSavedTimers(prev => prev.map(t => t.id === activeTimer.id ? updatedTimer : t));
      setActiveTimer(updatedTimer);
    }
    setIsEditingTimerName(false);
    setTempTimerName('');
  };

  const renderTimerView = () => (
    <>
      <header className="header">
        <button className="btn-back" onClick={() => setCurrentView('list')}>
          <ArrowLeft size={20} />
        </button>
        <div className="timer-header-content">
          {isEditingTimerName ? (
            <div className="timer-name-edit">
              <input
                type="text"
                className="timer-name-input"
                value={tempTimerName}
                onChange={(e) => setTempTimerName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSaveTimerName()}
                onBlur={handleSaveTimerName}
                autoFocus
              />
            </div>
          ) : (
            <div className="timer-name-display" onClick={() => {
              if (activeTimer) {
                setTempTimerName(activeTimer.name);
                setIsEditingTimerName(true);
              }
            }}>
              <h1 className="title">
                {activeTimer ? activeTimer.name : 'Timer Rápido'}
              </h1>
              {activeTimer && <Edit3 size={16} className="edit-icon" />}
            </div>
          )}
          <p className="subtitle">Timer ativo</p>
        </div>
      </header>

      {/* Configuração Inicial */}
      <div className="config-section">
        {/* Hora de Início */}
        <div className="time-input-section">
          <label className="input-label">⏰ Que horas você começou?</label>
          <div className="time-input-group">
            <input
              type="time"
              className="time-input"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              placeholder="ex: 12:00"
            />
            <button
              className="btn btn-now"
              onClick={() => setStartTime(getCurrentTime())}
            >
              Agora ({getCurrentTime()})
            </button>
          </div>
        </div>

        {/* Informações do Timer */}
        <div className="timer-info-card">
          <div className="timer-duration-info">
            <Clock size={18} />
            <span>Duração: {formatTimeToHours(selectedDuration)}</span>
          </div>
          <div className="timer-alerts-info">
            <Bell size={18} />
            <span>{alerts.length} lembretes configurados</span>
          </div>
        </div>
      </div>

      {/* Cálculos Visuais */}
      {startTime && (
        <div className="calculation-display">
          <div className="calc-item">
            <span className="calc-label">Início:</span>
            <span className="calc-time">{startTime}</span>
          </div>
          <div className="calc-operator">+</div>
          <div className="calc-item">
            <span className="calc-label">Duração:</span>
            <span className="calc-time">{formatTimeToHours(selectedDuration)}</span>
          </div>
          <div className="calc-operator">=</div>
          <div className="calc-item calc-result">
            <span className="calc-label">Fim às:</span>
            <span className="calc-time">{calculateEndTime(startTime, selectedDuration)}</span>
          </div>
        </div>
      )}

      {/* Lembretes */}


      {/* Timer Circular */}
      <div className="timer-section">
        <div className="circular-timer">
          <svg className="timer-svg" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" fill="none" stroke="#e2e8f0" strokeWidth="8" />
            <circle
              cx="100" cy="100" r="90" fill="none" stroke="#3b82f6" strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 90}`}
              strokeDashoffset={`${2 * Math.PI * 90 * (1 - (remainingTime / (selectedDuration * 60)))}`}
              transform="rotate(-90 100 100)" className="timer-progress"
            />
            {calculateSequentialAlertTimes().map((alert, index) => {
              const radius = 75 - (index * 12);
              const minutesRemaining = Math.floor(remainingTime / 60);
              const alertProgress = minutesRemaining <= alert.minutesFromStart ? 1 : 0;
              return (
                <circle
                  key={alert.id} cx="100" cy="100" r={radius} fill="none"
                  stroke={alertProgress ? "#f59e0b" : "#e2e8f0"} strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * radius}`}
                  strokeDashoffset={`${2 * Math.PI * radius * (1 - alertProgress)}`}
                  transform="rotate(-90 100 100)" className="alert-ring"
                />
              );
            })}
          </svg>
          <div className="timer-content">
            <div className="time-display">
              {remainingTime > 0 ? formatTime(remainingTime) : '--:--'}
            </div>
            <div className="time-label">
              {isRunning ? 'Tempo Restante' : remainingTime > 0 ? 'Pausado' : 'Pronto'}
            </div>
          </div>
        </div>
      </div>

      {/* Controles */}
      <div className="action-controls">
        {!isRunning && remainingTime === 0 ? (
          <button
            className="btn btn-primary btn-large"
            onClick={() => startTimer(false)}
            disabled={!startTime}
          >
            <Play size={20} className="inline mr-2" />
            Iniciar Timer
          </button>
        ) : (
          <div className="timer-controls">
            <button
              className="btn btn-secondary"
              onClick={isRunning ? pauseTimer : () => setIsRunning(true)}
            >
              {isRunning ? <><Pause size={16} className="inline mr-1" />Pausar</> : <><Play size={16} className="inline mr-1" />Continuar</>}
            </button>
            <button className="btn btn-danger" onClick={stopTimer}>
              <Square size={16} className="inline mr-1" />Parar
            </button>
          </div>
        )}
      </div>
    </>
  );

  const renderEditView = () => (
    <>
      <header className="header">
        <button className="btn-back" onClick={() => setCurrentView('list')}>
          <ArrowLeft size={20} />
        </button>
        <div className="timer-header-content">
          {isEditingTimerName ? (
            <div className="timer-name-edit">
              <input
                type="text"
                className="timer-name-input"
                value={tempTimerName}
                onChange={(e) => setTempTimerName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    if (tempTimerName.trim()) {
                      setEditingTimer(prev => ({ ...prev, name: tempTimerName.trim() }));
                    }
                    setIsEditingTimerName(false);
                    setTempTimerName('');
                  }
                }}
                onBlur={() => {
                  if (tempTimerName.trim()) {
                    setEditingTimer(prev => ({ ...prev, name: tempTimerName.trim() }));
                  }
                  setIsEditingTimerName(false);
                  setTempTimerName('');
                }}
                autoFocus
              />
            </div>
          ) : (
            <div className="timer-name-display" onClick={() => {
              setTempTimerName(editingTimer?.name || 'Novo Timer');
              setIsEditingTimerName(true);
            }}>
              <h1 className="title">
                {editingTimer?.name || 'Novo Timer'}
              </h1>
              <Edit3 size={16} className="edit-icon" />
            </div>
          )}
          <p className="subtitle">Configuração do timer</p>
        </div>
      </header>

      <div className="edit-form">
        {/* Hora de Início */}
        <div className="form-group">
          <label className="input-label">⏰ Hora de início (opcional)</label>
          <div className="time-input-group">
            <input
              type="time"
              className="time-input"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              placeholder="ex: 12:00"
            />
            <button
              className="btn btn-now"
              onClick={() => setStartTime(getCurrentTime())}
            >
              Agora ({getCurrentTime()})
            </button>
          </div>
          <p className="input-help">Configure agora ou deixe para definir na hora de usar o timer</p>
        </div>

        {/* Duração */}
        <div className="form-group">
          <label className="input-label">Duração</label>
          <div className="preset-buttons">
            {presets.map(preset => (
              <button
                key={preset.value}
                className={`preset-btn ${selectedDuration === preset.value ? 'active' : ''}`}
                onClick={() => {
                  setSelectedDuration(preset.value);
                  setEditingTimer(prev => ({ ...prev, duration: preset.value }));
                }}
              >
                {preset.label}
              </button>
            ))}
            <button
              className="preset-btn preset-btn-custom"
              onClick={() => setShowCustomDurationModal(true)}
            >
              <Plus size={16} className="inline mr-1" />
              Personalizar
            </button>
          </div>
          
          <div className="duration-display">
            {getSelectedPreset()?.display || formatTimeToHours(selectedDuration)}
          </div>
        </div>

        {/* Lembretes */}
        <div className="form-group">
          <div className="alerts-header">
            <label className="input-label">Lembretes Sequenciais</label>
            <button className="btn-add-alert" onClick={addAlert}>
              <Plus size={16} />
            </button>
          </div>
          
          <div className="alerts-explanation">
            <p>💡 <strong>Como funciona:</strong> Os lembretes são cumulativos (somam entre si).</p>
            <p>Exemplo: T20 + T5 = 1º lembrete aos 20min do fim, 2º lembrete 5min antes do 1º</p>
          </div>
          
          <div className="alerts-list">
            {alerts.map((alert, index) => (
              <div key={alert.id} className="alert-config-item">
                <input
                  type="text"
                  className="alert-label-input"
                  value={alert.label}
                  onChange={(e) => updateAlert(alert.id, 'label', e.target.value)}
                  placeholder="Nome"
                />
                <input
                  type="number"
                  className="alert-minutes-input"
                  value={alert.minutes}
                  onChange={(e) => updateAlert(alert.id, 'minutes', parseInt(e.target.value) || 0)}
                  min="1" max="180" placeholder="Min"
                />
                <span className="alert-preview">
                  {startTime ? (() => {
                    const sequentialAlerts = calculateSequentialAlertTimes();
                    const currentAlert = sequentialAlerts.find(a => a.id === alert.id);
                    return currentAlert ? currentAlert.time : '--:--';
                  })() : '--:--'}
                </span>
                {alerts.length > 1 && (
                  <button className="btn-remove-alert" onClick={() => removeAlert(alert.id)}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          
          {/* Preview dos Lembretes */}
          {startTime && alerts.length > 0 && (
            <div className="sequence-preview">
              <h5>Sequência dos lembretes:</h5>
              <div className="sequence-timeline">
                {calculateSequentialAlertTimes().map((alert, index) => (
                  <div key={alert.id} className="sequence-item">
                    <span className="sequence-number">{index + 1}º</span>
                    <span className="sequence-label">{alert.label} ({alert.minutes}min)</span>
                    <span className="sequence-time">{alert.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Programação */}
        <div className="form-group">
          <label className="input-label">
            <input
              type="checkbox"
              checked={editingTimer?.autoStart || false}
              onChange={(e) => setEditingTimer(prev => ({ ...prev, autoStart: e.target.checked }))}
            />
            Iniciar automaticamente
          </label>
          
          {editingTimer?.autoStart && (
            <>
              <div className="schedule-time">
                <label>Horário:</label>
                <input
                  type="time"
                  className="time-input"
                  value={editingTimer?.scheduledTime || ''}
                  onChange={(e) => setEditingTimer(prev => ({ ...prev, scheduledTime: e.target.value }))}
                />
              </div>
              
              <div className="schedule-days">
                <label>Dias da semana:</label>
                <div className="days-selector">
                  {daysOfWeek.map(day => (
                    <button
                      key={day.key}
                      className={`day-btn ${editingTimer?.activeDays?.includes(day.key) ? 'active' : ''}`}
                      onClick={() => {
                        const activeDays = editingTimer?.activeDays || [];
                        const newDays = activeDays.includes(day.key)
                          ? activeDays.filter(d => d !== day.key)
                          : [...activeDays, day.key];
                        setEditingTimer(prev => ({ ...prev, activeDays: newDays }));
                      }}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Ações */}
        <div className="form-actions">
          <div className="form-actions-row">
            <button className="btn btn-secondary" onClick={() => setCurrentView('list')}>
              Cancelar
            </button>
            <button 
              className="btn btn-outline"
              onClick={() => {
                const timerToSave = {
                  ...editingTimer,
                  duration: selectedDuration,
                  alerts: [...alerts]
                };
                saveTimer(timerToSave);
              }}
            >
              <Save size={16} className="inline mr-1" />
              Salvar
            </button>
          </div>
          
          <button 
            className="btn btn-primary btn-large"
            onClick={() => {
              // Salvar o timer se necessário e iniciar
              if (editingTimer && !savedTimers.find(t => t.id === editingTimer.id)) {
                const timerToSave = {
                  ...editingTimer,
                  duration: selectedDuration,
                  alerts: [...alerts]
                };
                setSavedTimers(prev => [...prev, timerToSave]);
                setActiveTimer(timerToSave);
              } else if (editingTimer) {
                // Atualizar timer existente
                const updatedTimer = {
                  ...editingTimer,
                  duration: selectedDuration,
                  alerts: [...alerts]
                };
                setSavedTimers(prev => prev.map(t => t.id === editingTimer.id ? updatedTimer : t));
                setActiveTimer(updatedTimer);
              }
              
              // Ir para a tela do timer ativo
              setCurrentView('timer');
            }}
            disabled={!editingTimer?.name?.trim() || selectedDuration === 0}
          >
            <Play size={20} className="inline mr-2" />
            Iniciar Timer Agora
          </button>
        </div>
      </div>
    </>
  );

  const renderUnifiedView = () => (
    <>
      <header className="header">
        <button className="btn-back" onClick={() => setCurrentView('list')}>
          <ArrowLeft size={20} />
        </button>
        <div className="timer-header-content">
          {isEditingTimerName ? (
            <div className="timer-name-edit">
              <input
                type="text"
                className="timer-name-input"
                value={tempTimerName}
                onChange={(e) => setTempTimerName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    if (tempTimerName.trim()) {
                      setEditingTimer(prev => ({ ...prev, name: tempTimerName.trim() }));
                      if (activeTimer) {
                        const updatedTimer = { ...activeTimer, name: tempTimerName.trim() };
                        setSavedTimers(prev => prev.map(t => t.id === activeTimer.id ? updatedTimer : t));
                        setActiveTimer(updatedTimer);
                      }
                    }
                    setIsEditingTimerName(false);
                    setTempTimerName('');
                  }
                }}
                onBlur={() => {
                  if (tempTimerName.trim()) {
                    setEditingTimer(prev => ({ ...prev, name: tempTimerName.trim() }));
                    if (activeTimer) {
                      const updatedTimer = { ...activeTimer, name: tempTimerName.trim() };
                      setSavedTimers(prev => prev.map(t => t.id === activeTimer.id ? updatedTimer : t));
                      setActiveTimer(updatedTimer);
                    }
                  }
                  setIsEditingTimerName(false);
                  setTempTimerName('');
                }}
                autoFocus
              />
            </div>
          ) : (
            <div className="timer-name-display" onClick={() => {
              setTempTimerName((editingTimer?.name || activeTimer?.name) || 'Novo Timer');
              setIsEditingTimerName(true);
            }}>
              <h1 className="title">
                {(editingTimer?.name || activeTimer?.name) || 'Novo Timer'}
              </h1>
              <Edit3 size={16} className="edit-icon" />
            </div>
          )}
          <p className="subtitle">
            {isRunning ? 'Timer em execução' : 'Configuração do timer'}
          </p>
        </div>
      </header>

      <div className="unified-content">
        {/* Seção de Configuração */}
        <div className="config-panel">
          {/* Hora de Início */}
          <div className="form-group">
            <label className="input-label">⏰ Hora de início</label>
            <div className="time-input-group">
              <input
                type="time"
                className="time-input"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={isRunning}
              />
              <button
                className="btn btn-now"
                onClick={() => setStartTime(getCurrentTime())}
                disabled={isRunning}
              >
                Agora ({getCurrentTime()})
              </button>
            </div>
          </div>

          {/* Duração */}
          <div className="form-group">
            <label className="input-label">Duração</label>
            <div className="preset-buttons">
              {presets.map(preset => (
                <button
                  key={preset.value}
                  className={`preset-btn ${selectedDuration === preset.value ? 'active' : ''}`}
                  onClick={() => {
                    if (!isRunning) {
                      setSelectedDuration(preset.value);
                      setEditingTimer(prev => ({ ...prev, duration: preset.value }));
                    }
                  }}
                  disabled={isRunning}
                >
                  {preset.label}
                </button>
              ))}
              <button
                className="preset-btn preset-btn-custom"
                onClick={() => setShowCustomDurationModal(true)}
                disabled={isRunning}
              >
                <Plus size={16} className="inline mr-1" />
                Personalizar
              </button>
            </div>
            <div className="duration-display">
              {getSelectedPreset()?.display || formatTimeToHours(selectedDuration)}
            </div>
          </div>

          {/* Lembretes */}
          <div className="form-group">
            <div className="alerts-header">
              <label className="input-label">Lembretes</label>
              <button 
                className="btn-add-alert" 
                onClick={addAlert}
                disabled={isRunning}
              >
                <Plus size={16} />
              </button>
            </div>
            
            <div className="form-help">
              💡 <strong>Como funcionam:</strong> Os lembretes tocam em sequência - o primeiro toca X minutos antes do final, e os próximos tocam Y minutos antes do lembrete anterior.
            </div>
            
            <div className="alerts-list">
              {alerts.map(alert => (
                <div key={alert.id} className="alert-config-item">
                  {/* Header do Card - Nome, Minutos, Tempo, Lixeira */}
                  <div className="alert-config-header">
                    <input
                      type="text"
                      className="alert-label-input"
                      value={alert.label}
                      onChange={(e) => updateAlert(alert.id, 'label', e.target.value)}
                      placeholder="Nome do lembrete"
                      disabled={isRunning}
                    />
                    <input
                      type="number"
                      className="alert-minutes-input"
                      value={alert.minutes}
                      onChange={(e) => updateAlert(alert.id, 'minutes', parseInt(e.target.value) || 0)}
                      min="1" max="180" placeholder="Min"
                      disabled={isRunning}
                    />
                    <span className="alert-preview alert-time-display">
                      {startTime ? (() => {
                        const sequentialAlerts = calculateSequentialAlertTimes();
                        const currentAlert = sequentialAlerts.find(a => a.id === alert.id);
                        return currentAlert ? currentAlert.time : '--:--';
                      })() : '--:--'}
                    </span>
                    {alerts.length > 1 && !isRunning && (
                      <button className="btn-remove-alert" onClick={() => removeAlert(alert.id)}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {/* Seção de Som/Toque */}
                  <div className="alert-config-sound">
                    <label className="sound-label">Som/Toque:</label>
                    <div className="sound-selection">
                      <select
                        className="alert-sound-select"
                        value={alert.sound || 'default'}
                        onChange={(e) => {
                          if (e.target.value === 'custom') {
                            // Trigger file input
                            const fileInput = document.createElement('input');
                            fileInput.type = 'file';
                            fileInput.accept = 'audio/*';
                            fileInput.onchange = (event) => {
                              const file = event.target.files[0];
                              handleSoundFileSelection(alert.id, file);
                            };
                            fileInput.click();
                          } else {
                            updateAlert(alert.id, 'sound', e.target.value);
                          }
                        }}
                        disabled={isRunning}
                      >
                        {soundOptions.map(sound => (
                          <option key={sound.id} value={sound.id}>
                            {sound.name}
                          </option>
                        ))}
                      </select>
                      
                      {alert.customSoundName && (
                        <div className="custom-sound-info">
                          <span className="sound-file-name">🎵 {alert.customSoundName}</span>
                          <button 
                            className="btn-remove-sound"
                            onClick={() => {
                              updateAlert(alert.id, 'sound', 'default');
                              updateAlert(alert.id, 'customSoundUrl', null);
                              updateAlert(alert.id, 'customSoundName', null);
                            }}
                            disabled={isRunning}
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Seção do Timer */}
        <div className="timer-panel">
          {/* Cálculos Visuais */}
          {startTime && (
            <div className="calculation-display">
              <div className="calc-item">
                <span className="calc-label">Início:</span>
                <span className="calc-time">{startTime}</span>
              </div>
              <div className="calc-operator">+</div>
              <div className="calc-item">
                <span className="calc-label">Duração:</span>
                <span className="calc-time">{formatTimeToHours(selectedDuration)}</span>
              </div>
              <div className="calc-operator">=</div>
              <div className="calc-item calc-result">
                <span className="calc-label">Fim às:</span>
                <span className="calc-time">{calculateEndTime(startTime, selectedDuration)}</span>
              </div>
            </div>
          )}

          {/* Preview dos Lembretes */}
          {startTime && alerts.length > 0 && (
            <div className="alerts-preview">
              <h4>Sequência dos lembretes:</h4>
              <div className="alerts-preview-list">
                {calculateSequentialAlertTimes().map((alert, index) => (
                  <div key={alert.id} className="alert-preview-item">
                    <span className="alert-label">{index + 1}º - {alert.label}</span>
                    <span className="alert-time">{alert.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timer Circular */}
          <div className="timer-section">
            <div className="circular-timer">
              <svg className="timer-svg" viewBox="0 0 200 200">
                {/* Círculo de fundo principal */}
                <circle cx="100" cy="100" r="90" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                
                {/* Círculos de fundo dos lembretes - SEMPRE VISÍVEIS */}
                {alerts.map((alert, index) => {
                  const radius = 75 - (index * 15);
                  return (
                    <circle
                      key={`bg-${alert.id}`}
                      cx="100" cy="100" 
                      r={radius} 
                      fill="none" 
                      stroke="#f1f5f9" 
                      strokeWidth="4"
                      opacity="0.7"
                    />
                  );
                })}
                
                {/* Progresso principal do timer */}
                <circle
                  cx="100" cy="100" r="90" fill="none" stroke={getTimerColor()} strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 90}`}
                  strokeDashoffset={isRunning && getNextAlert() 
                    ? `${2 * Math.PI * 90 * (getTimeToNextAlert() / (getNextAlert().minutes * 60))}` 
                    : `${2 * Math.PI * 90 * (1 - (remainingTime / (selectedDuration * 60)))}`}
                  transform="rotate(-90 100 100)" className="timer-progress"
                />
                
                {/* Progresso dos lembretes - só quando há cálculo */}
                {startTime && calculateSequentialAlertTimes().map((alert, index) => {
                  const radius = 75 - (index * 15);
                  const minutesRemaining = Math.floor(remainingTime / 60);
                  const alertProgress = minutesRemaining <= alert.minutesFromStart ? 1 : 0;
                  const alertColor = getAlertColor(index);
                  return (
                    <circle
                      key={alert.id} cx="100" cy="100" r={radius} fill="none"
                      stroke={alertProgress ? "#10b981" : alertColor} strokeWidth="5"
                      strokeDasharray={`${2 * Math.PI * radius}`}
                      strokeDashoffset={`${2 * Math.PI * radius * (1 - alertProgress)}`}
                      transform="rotate(-90 100 100)" className="alert-ring"
                    />
                  );
                })}
              </svg>
              <div className="timer-content">
                <div className="time-display">
                  {isRunning && remainingTime > 0 ? formatTime(getTimeToNextAlert()) : remainingTime > 0 ? formatTime(remainingTime) : '--:--'}
                </div>
                <div className="time-label">
                  {isRunning ? (getNextAlert() ? `Até ${getNextAlert().label}` : 'Tempo Final') : remainingTime > 0 ? 'Pausado' : 'Pronto'}
                </div>
                {isRunning && getNextAlert() && (
                  <div className="next-alert-info">
                    {getNextAlert().time}
                  </div>
                )}
              </div>
            </div>
            
            {/* Legenda dos Círculos */}
            {alerts.length > 0 && (
              <div className="timer-legend">
                <div className="legend-item">
                  <div className="legend-circle" style={{backgroundColor: getTimerColor()}}></div>
                  <span>{isRunning && getNextAlert() ? `Até ${getNextAlert().label}` : 'Tempo Total'}</span>
                </div>
                {alerts.map((alert, index) => {
                  const isActive = isRunning && getActiveAlert()?.id === alert.id;
                  return (
                    <div key={`legend-${alert.id}`} className={`legend-item ${isActive ? 'active' : ''}`}>
                      <div className="legend-circle" style={{backgroundColor: getAlertColor(index)}}></div>
                      <span>{alert.label} {isActive && '🟢'}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Controles */}
          <div className="action-controls">
            {!isRunning && remainingTime === 0 ? (
              <div className="start-actions">
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    const timerToSave = {
                      ...editingTimer,
                      duration: selectedDuration,
                      alerts: [...alerts]
                    };
                    saveTimer(timerToSave);
                  }}
                  disabled={!editingTimer?.name?.trim()}
                >
                  <Save size={16} className="inline mr-1" />
                  Salvar
                </button>
                
                <button
                  className="btn btn-primary btn-large"
                  onClick={() => {
                    // Salvar automaticamente se necessário
                    if (editingTimer && !savedTimers.find(t => t.id === editingTimer.id)) {
                      const timerToSave = {
                        ...editingTimer,
                        duration: selectedDuration,
                        alerts: [...alerts]
                      };
                      setSavedTimers(prev => [...prev, timerToSave]);
                      setActiveTimer(timerToSave);
                    }
                    startTimer(false);
                  }}
                  disabled={!startTime || !editingTimer?.name?.trim()}
                >
                  <Play size={20} className="inline mr-2" />
                  Iniciar Timer
                </button>
              </div>
            ) : (
              <div className="timer-controls">
                <button
                  className="btn btn-secondary"
                  onClick={isRunning ? pauseTimer : () => setIsRunning(true)}
                >
                  {isRunning ? <><Pause size={16} className="inline mr-1" />Pausar</> : <><Play size={16} className="inline mr-1" />Continuar</>}
                </button>
                <button className="btn btn-danger" onClick={stopTimer}>
                  <Square size={16} className="inline mr-1" />
                  Parar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  const renderCustomDurationModal = () => (
    <div className="modal-overlay" onClick={() => setShowCustomDurationModal(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Tempo Personalizado</h3>
          <button className="modal-close" onClick={() => setShowCustomDurationModal(false)}>
            ×
          </button>
        </div>
        
        <div className="modal-body">
          <p>Defina a duração do seu timer:</p>
          <div className="custom-duration-inputs">
            <div className="time-input-group">
              <input
                type="number"
                className="time-number-input"
                placeholder="0"
                min="0"
                max="12"
                value={Math.floor(selectedDuration / 60) || ''}
                onChange={(e) => {
                  const hours = parseInt(e.target.value) || 0;
                  const currentMinutes = selectedDuration % 60;
                  const newDuration = hours * 60 + currentMinutes;
                  setSelectedDuration(newDuration);
                  if (editingTimer) {
                    setEditingTimer(prev => ({ ...prev, duration: newDuration }));
                  }
                }}
              />
              <span>horas</span>
            </div>
            <div className="time-input-group">
              <input
                type="number"
                className="time-number-input"
                placeholder="0"
                min="0"
                max="59"
                value={selectedDuration % 60 || ''}
                onChange={(e) => {
                  const minutes = parseInt(e.target.value) || 0;
                  const currentHours = Math.floor(selectedDuration / 60);
                  const newDuration = currentHours * 60 + minutes;
                  setSelectedDuration(newDuration);
                  if (editingTimer) {
                    setEditingTimer(prev => ({ ...prev, duration: newDuration }));
                  }
                }}
              />
              <span>minutos</span>
            </div>
          </div>
          
          <div className="duration-preview">
            Total: {formatTimeToHours(selectedDuration)}
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            className="btn btn-secondary" 
            onClick={() => setShowCustomDurationModal(false)}
          >
            Cancelar
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => setShowCustomDurationModal(false)}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container">
      {notification && (
        <div className="notification-banner">
          {notification}
        </div>
      )}

      {/* Modal de Alarme Ativo */}
      {activeAlarm && (
        <div className="alarm-modal-overlay">
          <div className="alarm-modal">
            <div className="alarm-header">
              <h2>🔔 Alarme Ativo</h2>
            </div>
            <div className="alarm-content">
              <p className="alarm-message">{activeAlarm.message}</p>
              <div className="alarm-alert-info">
                <span className="alarm-label">{activeAlarm.alert.label}</span>
                <span className="alarm-time">{activeAlarm.alert.time}</span>
              </div>
            </div>
            <div className="alarm-actions">
              <button 
                className="btn btn-danger btn-large"
                onClick={dismissAlarm}
              >
                <span style={{fontSize: '1.2rem', marginRight: '0.5rem'}}>✋</span>
                Dispensar Alarme
              </button>
            </div>
          </div>
        </div>
      )}
      
      {currentView === 'list' && renderTimersList()}
      {currentView === 'unified' && renderUnifiedView()}
      
      {showCustomDurationModal && renderCustomDurationModal()}
    </div>
  );
};

export default SafetyNetApp;

