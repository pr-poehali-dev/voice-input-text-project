import React, { useState, useRef, useEffect } from 'react';

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

const VoiceToText: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [text, setText] = useState('Нажмите "Начать запись" для преобразования голоса в текст.');
  const [statusText, setStatusText] = useState('Готов к работе. Нажмите "Начать запись"');
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [microphoneAccessGranted, setMicrophoneAccessGranted] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef('');
  const restartTimeoutRef = useRef<NodeJS.Timeout>();

  const updateStats = (currentText: string) => {
    const words = currentText.trim() ? currentText.trim().split(/\s+/).length : 0;
    const chars = currentText.length;
    setWordCount(words);
    setCharCount(chars);
  };

  const initSpeechRecognition = () => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionClass();
      
      recognitionRef.current.lang = 'ru-RU';
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onstart = () => {
        setIsRecording(true);
        setStatusText('Идёт запись... Говорите в микрофон');
        updateStats(finalTranscriptRef.current);
      };

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscriptRef.current += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        const fullText = finalTranscriptRef.current + interimTranscript;
        setText(fullText);
        updateStats(fullText);
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Ошибка распознавания:', event.error);
        
        if (event.error === 'no-speech') {
          setStatusText('Речь не обнаружена. Жду...');
        } else if (event.error === 'audio-capture') {
          setStatusText('Микрофон не найден. Проверьте подключение.');
        } else if (event.error === 'not-allowed') {
          setStatusText('Доступ к микрофону запрещен.');
          setMicrophoneAccessGranted(false);
        } else {
          setStatusText('Ошибка: ' + event.error);
        }
        
        if (event.error !== 'aborted' && isRecording) {
          restartRecognition();
        }
      };

      recognitionRef.current.onend = () => {
        if (isRecording) {
          setStatusText('Перезапуск системы...');
          restartRecognition();
        }
      };
    } else {
      setStatusText('Ваш браузер не поддерживает распознавание речи. Попробуйте Chrome или Edge.');
      setText('Ошибка: браузер не поддерживает функцию распознавания речи.');
    }
  };

  const startRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setStatusText('Запуск системы...');
      } catch (error) {
        setStatusText('Ошибка при запуске: ' + (error as Error).message);
        if (isRecording) {
          restartRecognition();
        }
      }
    }
  };

  const restartRecognition = () => {
    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    restartTimeoutRef.current = setTimeout(() => {
      if (isRecording) {
        setStatusText('Перезапуск системы...');
        startRecognition();
      }
    }, 500);
  };

  const handleStartRecording = () => {
    if (!microphoneAccessGranted) {
      setStatusText('Запрос доступа к микрофону...');
      
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          setMicrophoneAccessGranted(true);
          setStatusText('Доступ к микрофону разрешен. Запуск...');
          
          stream.getTracks().forEach(track => track.stop());
          
          initSpeechRecognition();
          setIsRecording(true);
          startRecognition();
        })
        .catch((err) => {
          setStatusText('Ошибка доступа к микрофону: ' + err.message);
          setText('Не удалось получить доступ к микрофону. Проверьте разрешения браузера.');
          setMicrophoneAccessGranted(false);
        });
    } else {
      setIsRecording(true);
      startRecognition();
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setStatusText('Запись остановлена. Нажмите "Начать запись" для продолжения.');
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Ошибка при остановке:', error);
      }
    }
  };

  const handleCopy = () => {
    if (text && text !== 'Нажмите "Начать запись" для преобразования голоса в текст.') {
      navigator.clipboard.writeText(text)
        .then(() => {
          setStatusText('Текст скопирован в буфер обмена!');
          setTimeout(() => {
            if (isRecording) {
              setStatusText('Идёт запись... Говорите в микрофон');
            } else {
              setStatusText('Запись остановлена. Нажмите "Начать запись" для продолжения.');
            }
          }, 2000);
        })
        .catch(err => {
          setStatusText('Не удалось скопировать текст: ' + err);
        });
    } else {
      setStatusText('Нет текста для копирования');
    }
  };

  const handleClear = () => {
    finalTranscriptRef.current = '';
    setText('Нажмите "Начать запись" для преобразования голоса в текст.');
    setStatusText('Текст очищен');
    updateStats('');
    
    setTimeout(() => {
      if (isRecording) {
        setStatusText('Идёт запись... Говорите в микрофон');
      } else {
        setStatusText('Запись остановлена. Нажмите "Начать запись" для продолжения.');
      }
    }, 2000);
  };

  const handleSave = () => {
    if (text && text !== 'Нажмите "Начать запись" для преобразования голоса в текст.') {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = 'расшифровка_речи.txt';
      a.click();
      
      URL.revokeObjectURL(url);
      
      setStatusText('Текст сохранён в файл!');
      setTimeout(() => {
        if (isRecording) {
          setStatusText('Идёт запись... Говорите в микрофон');
        } else {
          setStatusText('Запись остановлена. Нажмите "Начать запись" для продолжения.');
        }
      }, 2000);
    } else {
      setStatusText('Нет текста для сохранения');
    }
  };

  const hasText = text && text !== 'Нажмите "Начать запись" для преобразования голоса в текст.';

  useEffect(() => {
    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-5">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl p-8 lg:p-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
            Голос в текст
          </h1>
          <p className="text-xl text-blue-800 font-medium mb-4">
            Однократный запрос доступа к микрофону
          </p>
          <p className="text-lg text-gray-600 leading-relaxed">
            Нажмите "Начать запись" и разрешите доступ к микрофону. После этого запрос больше не повторится.
          </p>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 rounded">
          <p className="text-gray-700">
            <strong>Важно:</strong> Запрос на доступ к микрофону появится только один раз при первом запуске записи. 
            После разрешения доступ сохранится для этого сайта.
          </p>
        </div>

        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-6 mb-8">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-blue-800">{wordCount}</span>
              <span className="text-gray-600">слов</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-blue-800">{charCount}</span>
              <span className="text-gray-600">символов</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-3xl">{isRecording ? '🎙️' : '🔴'}</span>
              <span className="text-gray-600">статус</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 justify-center mb-8">
          <button
            onClick={handleStartRecording}
            disabled={isRecording}
            className="flex items-center justify-center gap-3 px-10 py-5 bg-gradient-to-r from-green-500 to-green-400 hover:from-green-600 hover:to-green-500 disabled:from-gray-400 disabled:to-gray-400 text-white text-xl font-semibold rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:transform-none disabled:cursor-not-allowed"
          >
            <span className="text-3xl">●</span>
            Начать запись
          </button>
          
          <button
            onClick={handleStopRecording}
            disabled={!isRecording}
            className="flex items-center justify-center gap-3 px-10 py-5 bg-gradient-to-r from-red-500 to-red-400 hover:from-red-600 hover:to-red-500 disabled:from-gray-400 disabled:to-gray-400 text-white text-xl font-semibold rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:transform-none disabled:cursor-not-allowed"
          >
            <span className="text-3xl">■</span>
            Остановить запись
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <button
            onClick={handleCopy}
            disabled={!hasText}
            className="px-7 py-4 bg-blue-800 hover:bg-blue-900 disabled:bg-gray-400 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-300 disabled:cursor-not-allowed"
          >
            📋 Копировать текст
          </button>
          
          <button
            onClick={handleClear}
            disabled={!hasText}
            className="px-7 py-4 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-300 disabled:cursor-not-allowed"
          >
            🗑️ Очистить всё
          </button>
          
          <button
            onClick={handleSave}
            disabled={!hasText}
            className="px-7 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-300 disabled:cursor-not-allowed"
          >
            💾 Сохранить в файл
          </button>
        </div>

        <div className="bg-gray-50 rounded-2xl p-6 min-h-[300px] max-h-[500px] overflow-y-auto mb-6 border-2 border-dashed border-gray-200">
          <div className="text-xl leading-relaxed text-gray-800 min-h-[250px] text-left whitespace-pre-wrap">
            {text}
          </div>
        </div>

        <div className={`flex items-center justify-center gap-3 p-4 rounded-xl text-lg ${
          isRecording ? 'bg-green-50 text-green-800' : 'bg-blue-50 text-blue-800'
        }`}>
          <span className={`w-4 h-4 rounded-full ${
            isRecording ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
          }`}></span>
          <span>{statusText}</span>
        </div>

        <div className="mt-8 p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl">
          <h3 className="text-2xl font-semibold text-blue-800 mb-4 flex items-center gap-3">
            <span className="text-3xl">🎯</span>
            Особенности работы:
          </h3>
          <ul className="space-y-3 text-gray-700 text-lg">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">•</span>
              Запрос на доступ к микрофону <span className="bg-yellow-200 px-2 py-1 rounded font-medium">только один раз</span> при первом запуске
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">•</span>
              После разрешения доступ сохраняется для этого сайта
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">•</span>
              Запись продолжается автоматически после пауз
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">•</span>
              Остановка записи только по кнопке "Остановить запись"
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">•</span>
              Для лучшего качества говорите четко и в тихом помещении
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VoiceToText;