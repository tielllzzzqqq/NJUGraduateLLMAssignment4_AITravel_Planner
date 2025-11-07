import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface VoiceInputProps {
  onResult: (text: string) => void;
}

export default function VoiceInput({ onResult }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check if browser supports Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'zh-CN';

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(finalTranscript || interimTranscript);
        if (finalTranscript) {
          onResult(finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onResult]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('您的浏览器不支持语音识别功能，请使用Chrome或Edge浏览器');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
      <button
        type="button"
        onClick={toggleListening}
        disabled={!isSupported}
        style={{
          padding: '15px',
          borderRadius: '50%',
          border: 'none',
          background: isListening ? '#e74c3c' : '#667eea',
          color: 'white',
          cursor: isSupported ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s',
        }}
        title={isListening ? '点击停止录音' : '点击开始录音'}
      >
        {isListening ? <MicOff size={24} /> : <Mic size={24} />}
      </button>
      <div style={{ flex: 1 }}>
        {isListening && (
          <div style={{ color: '#667eea', fontSize: '14px', marginBottom: '5px' }}>
            🎤 正在录音...
          </div>
        )}
        {transcript && (
          <div style={{ color: '#333', fontSize: '14px' }}>
            {transcript}
          </div>
        )}
        {!isSupported && (
          <div style={{ color: '#999', fontSize: '12px' }}>
            您的浏览器不支持语音识别，请使用Chrome或Edge浏览器
          </div>
        )}
      </div>
    </div>
  );
}

