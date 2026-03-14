import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';

const VoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState<'idle' | 'listening' | 'success' | 'error'>('idle');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const last = event.results.length - 1;
        const result = event.results[last][0].transcript.toLowerCase().trim();
        setTranscript(result);
        handleCommand(result);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed') {
          speak("Microphone access denied.");
          setIsListening(false);
          setStatus('idle');
        } else {
          setStatus('error');
          // Attempt to restart if it's a recoverable error and we should be listening
          if (isListening) {
             setTimeout(() => recognitionRef.current?.start(), 1000);
          }
        }
      };

      recognitionRef.current.onend = () => {
        if (isListening) {
          recognitionRef.current?.start(); // Auto-restart if we're supposed to be listening
        } else {
          setStatus('idle');
        }
      };
    }
  }, [isListening]);

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => {
       // Optional: do something after speaking
    };
    window.speechSynthesis.speak(utterance);
  };

  const handleCommand = (command: string) => {
    const cmd = command.replace(/^(open|go to|show)\s+/i, '').trim();
    
    if (cmd.includes('read page')) {
      setStatus('success');
      readPage();
      return;
    }

    const navigationMap: Record<string, string> = {
      'dashboard': 'dashboard',
      'trainee': 'trainees',
      'trainees': 'trainees',
      'farm task': 'farmTask',
      'farm tasks': 'farmTask',
      'task': 'farmTask',
      'tasks': 'farmTask',
      'crop monitoring': 'cropMonitoring',
      'crops': 'cropMonitoring',
      'crop': 'cropMonitoring',
      'attendance': 'attendance',
      'production': 'attendanceProduction',
      'modules': 'modules',
      'module': 'modules',
      'inventory': 'inventory',
      'reports': 'reports',
      'report': 'reports',
      'settings': 'settings',
      'setting': 'settings',
      'ai detection': 'aiDetection',
      'detection': 'aiDetection',
      'home': 'dashboard'
    };

    let targetPage = '';
    for (const [key, value] of Object.entries(navigationMap)) {
      if (cmd === key || cmd.includes(key)) {
        targetPage = value;
        break;
      }
    }

    if (targetPage) {
      setStatus('success');
      speak(`Opening ${cmd}`);
      window.dispatchEvent(new CustomEvent('voice-navigate', { detail: targetPage }));
      setTimeout(() => setTranscript(''), 3000);
    } else {
      setStatus('error');
      speak(`Sorry, I didn't understand the command ${command}. You can say open dashboard, trainees, or read page.`);
      setTimeout(() => setTranscript(''), 5000);
    }
  };

  const readPage = () => {
    const mainContent = document.querySelector('.content-scroll');
    if (mainContent) {
      const text = (mainContent as HTMLElement).innerText;
      speak("Reading page content aloud.");
      speak(text);
    } else {
      speak("No content found to read.");
    }
  };

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      recognitionRef.current?.stop();
    } else {
      setIsListening(true);
      setStatus('listening');
      setTranscript('');
      try {
        recognitionRef.current?.start();
        speak("Voice assistant activated. How can I help you?");
      } catch (e) {
        console.error("Recognition start failed", e);
      }
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 10000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
      {isListening && (
        <div className="card fade-in" style={{ padding: '1rem 1.5rem', minWidth: '240px', background: 'white', border: `2px solid ${status === 'error' ? '#ef4444' : status === 'success' ? '#10b981' : '#3b82f6'}`, borderRadius: '1.25rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ width: '10px', height: '10px', background: status === 'error' ? '#ef4444' : status === 'success' ? '#10b981' : '#3b82f6', borderRadius: '50%' }} className={status === 'listening' ? 'animate-pulse' : ''}></div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              {status === 'listening' ? 'Listening...' : status === 'success' ? 'Command Recognized' : status === 'error' ? 'Unknown Command' : 'Awaiting Voice'}
            </span>
          </div>
          <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', minHeight: '1.5rem' }}>
            {transcript ? `"${transcript}"` : 'Say a command...'}
          </p>
        </div>
      )}
      
      <button 
        onClick={toggleListening}
        className={`btn ${isListening ? 'btn-danger' : 'btn-primary'}`}
        style={{ width: '64px', height: '64px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 30px rgba(0,0,0,0.2)', transition: 'all 0.4s var(--transition)' }}
        title={isListening ? 'Stop Assistant' : 'Start Assistant'}
      >
        {isListening ? <MicOff size={32} /> : <Mic size={32} />}
      </button>
    </div>
  );
};

export default VoiceAssistant;
