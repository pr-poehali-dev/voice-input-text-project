import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

export default function Index() {
  const [isRecording, setIsRecording] = useState(false);
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const recognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const playStopSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
  };

  useEffect(() => {
    // Keyboard event handler for F12
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F12') {
        event.preventDefault();
        toggleRecording();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Check if browser supports speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'ru-RU';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
      };

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setText(prev => prev + finalTranscript + ' ');
          
          // Кратковременная остановка для вывода результата и автопродолжение
          if (autoMode && isRecording) {
            recognitionRef.current.stop();
            restartTimeoutRef.current = setTimeout(() => {
              if (autoMode && recognitionRef.current && isRecording) {
                recognitionRef.current.start();
              }
            }, 500); // Короткая пауза для вывода текста
          }
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (!autoMode) {
          setIsRecording(false);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setIsRecording(false);
      };
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Ваш браузер не поддерживает голосовой ввод');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setAutoMode(false);
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      playStopSound();
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
      setAutoMode(true); // Включаем авторежим с кратковременными остановками
    }
  };

  const clearText = () => {
    setText('');
  };

  const copyText = () => {
    navigator.clipboard.writeText(text);
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setAutoMode(false);
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      playStopSound();
    }
  };

  const copyAndRestart = () => {
    if (!text) return;
    
    // Останавливаем текущую запись если активна
    if (isRecording) {
      stopRecording();
    }
    
    // Копируем текст
    navigator.clipboard.writeText(text);
    
    // Очищаем текст
    setText('');
    
    // Автоматически начинаем новую запись через короткий таймаут
    setTimeout(() => {
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsRecording(true);
        setAutoMode(true);
      }
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">
            Голосовой ввод
          </h1>
          <p className="text-lg text-gray-600">
            Нажмите на микрофон и говорите
          </p>
        </div>

        {/* Main recording interface */}
        <div className="flex flex-col items-center space-y-8">
          {/* Recording controls */}
          <div className="flex items-center space-x-4">
            {/* Start Recording button */}
            <div className="relative">
              <Button
                onClick={toggleRecording}
                size="lg"
                className={`
                  w-24 h-24 rounded-full text-white font-semibold text-lg shadow-lg transition-all duration-300
                  ${isRecording 
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                    : 'bg-primary hover:bg-primary/90'
                  }
                `}
              >
                <Icon 
                  name={isRecording ? "MicOff" : "Mic"} 
                  size={32}
                />
              </Button>
              
              {/* Pulse effect while listening */}
              {isListening && (
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping"></div>
              )}
            </div>

            {/* Stop Recording button */}
            {isRecording && (
              <Button
                onClick={stopRecording}
                size="lg"
                variant="outline"
                className="w-16 h-16 rounded-full border-2 border-red-500 text-red-500 hover:bg-red-50 shadow-lg transition-all duration-300"
              >
                <Icon name="Square" size={24} />
              </Button>
            )}
          </div>

          {/* Status indicator */}
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`}></div>
            <span className="text-sm font-medium text-gray-600">
              {isRecording ? 'Непрерывная запись... (нажмите ⏹ для остановки)' : isListening ? 'Обработка...' : 'Готов к записи'}
            </span>
          </div>
        </div>

        {/* Text display area */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Распознанный текст
              </h3>
              <div className="flex space-x-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={copyAndRestart}
                  disabled={!text}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Icon name="RotateCcw" size={16} className="mr-1" />
                  Копировать и заново
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyText}
                  disabled={!text}
                >
                  <Icon name="Copy" size={16} className="mr-1" />
                  Копировать
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearText}
                  disabled={!text}
                >
                  <Icon name="Trash2" size={16} className="mr-1" />
                  Очистить
                </Button>
              </div>
            </div>
            
            <div className="min-h-[120px] p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              {text ? (
                <p className="text-gray-800 leading-relaxed animate-fade-in">
                  {text}
                </p>
              ) : (
                <p className="text-gray-400 italic">
                  Ваш текст появится здесь...
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Instructions */}
        <div className="text-center space-y-2 text-sm text-gray-500">
          <p>🎤 Кнопка микрофона включает непрерывную запись с краткими паузами</p>
          <p>⏸️ Короткие остановки на 0.5 сек для вывода результата</p>
          <p>🔄 "Копировать и заново" - автоматический перезапуск</p>
          <p>⌨️ F12 - быстрое включение/выключение записи</p>
        </div>
      </div>
    </div>
  );
}