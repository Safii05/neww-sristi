import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';

const VoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
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
        const command = event.results[last][0].transcript.toLowerCase().trim();
        setTranscript(command);
        handleCommand(command);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const handleCommand = (command: string) => {
    if (command.includes('read page')) {
      readPage();
      return;
    }

    const navigationMap: Record<string, string> = {
      'dashboard': 'dashboard',
      'trainee': 'trainees',
      'trainees': 'trainees',
      'task': 'farmTask',
      'tasks': 'farmTask',
      'farm task': 'farmTask',
      'farm tasks': 'farmTask',
      'crop': 'cropMonitoring',
      'crops': 'cropMonitoring',
      'crop monitoring': 'cropMonitoring',
      'attendance': 'attendance', 
      'inventory': 'inventory',
      'report': 'reports',
      'reports': 'reports',
      'setting': 'settings',
      'settings': 'settings',
      'module': 'modules',
      'modules': 'modules',
      'detect': 'aiDetection',
      'detection': 'aiDetection',
      'ai detection': 'aiDetection',
      'home': 'dashboard'
    };

    for (const [key, value] of Object.entries(navigationMap)) {
      if (command === key || command.includes(key)) {
        speak(`Navigating to ${key}`);
        window.dispatchEvent(new CustomEvent('voice-navigate', { detail: value }));
        return;
      }
    }

    speak("Command not recognized. You can say 'dashboard', 'trainees', 'tasks', 'crops', 'attendance', 'reports', 'settings', or 'read page'.");
  };

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  const readPage = () => {
    const mainContent = document.querySelector('.content-scroll');
    if (mainContent) {
      const text = (mainContent as HTMLElement).innerText;
      speak("Reading page content.");
      speak(text);
    } else {
      speak("Could not find page content to read.");
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      try {
        recognitionRef.current?.start();
        setIsListening(true);
        speak("How can I help you?");
      } catch (e) {
        console.error("Recognition already started", e);
      }
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
      {transcript && isListening && (
        <div className="card fade-in" style={{ padding: '0.75rem 1.25rem', marginBottom: '0.5rem', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', border: '2px solid var(--primary)', borderRadius: '1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '8px', height: '8px', background: 'var(--primary)', borderRadius: '50%' }} className="animate-pulse"></div>
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>"{transcript}"</p>
          </div>
        </div>
      )}
      
      <button 
        onClick={toggleListening}
        className={`btn ${isListening ? 'btn-danger' : 'btn-primary'}`}
        style={{ width: '64px', height: '64px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
        title="Voice Assistant"
      >
        {isListening ? <MicOff size={28} className="animate-pulse" /> : <Mic size={28} />}
      </button>
    </div>
  );
};

export default VoiceAssistant;
