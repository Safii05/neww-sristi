import { useState, useEffect, useRef } from 'react';
import { 
  ScanFace, 
  CalendarCheck, 
  BookOpen, 
  Settings as SettingsIcon,
  UploadCloud,
  Trophy,
  ChevronLeft,
  LogOut,
  Camera,
  Volume2,
  Mic
} from 'lucide-react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  Title, 
  Tooltip, 
  Legend, 
  ArcElement
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useTranslation } from '../hooks/useTranslation';
import DashboardLayout from '../components/DashboardLayout';
import { userAttendanceData as mockAttendanceData, quizQuestions as mockQuizQuestions } from '../services/mockData';
import { getAttendance, scanAttendance, getModules, getSettings, detectCrop, updateSettings } from '../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface Props {
  onLogout: () => void;
}

const UserDashboard = ({ onLogout }: Props) => {
  const { t } = useTranslation();
  const [activePage, setActivePage] = useState('aiDetection');

  const [attendance, setAttendance] = useState<any[]>([]);
  const [attRate, setAttRate] = useState<number>(0);
  const [quiz, setQuiz] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [a, q] = await Promise.all([
          getAttendance(2), // Demo user ID
          getModules()
        ]);
        setAttendance(a.data.records || []);
        setAttRate(a.data.percentage || 0);
        setQuiz(q.data || []);
      } catch (err) {
        console.error("Failed to fetch user data", err);
      }
    };
    fetchData();

    const handleVoiceNav = (e: any) => {
      const target = e.detail;
      const validPages = ['aiDetection', 'attendance', 'modules', 'settings'];
      if (validPages.includes(target)) {
        setActivePage(target);
      }
    };
    window.addEventListener('voice-navigate', handleVoiceNav);
    return () => window.removeEventListener('voice-navigate', handleVoiceNav);
  }, []);

  const menuItems = [
    { id: 'aiDetection', label: t.aiDetection, icon: ScanFace },
    { id: 'attendance', label: t.attendance, icon: CalendarCheck },
    { id: 'modules', label: t.modules, icon: BookOpen },
    { id: 'settings', label: t.settings, icon: SettingsIcon },
    { id: 'collapse', label: t.collapse, icon: ChevronLeft }, // Dynamic icon later
    { id: 'logout', label: t.logout, icon: LogOut },
  ];

  return (
    <DashboardLayout 
      menuItems={menuItems} 
      activePage={activePage} 
      setActivePage={setActivePage} 
      onLogout={onLogout}
      userType="User"
    >
      {activePage === 'aiDetection' && <AIDetectionSection />}
      {activePage === 'attendance' && <AttendanceSection data={attendance.length > 0 ? attendance : mockAttendanceData} rate={attRate || 90} />}
      {activePage === 'modules' && <ModulesSection data={quiz.length > 0 ? quiz : mockQuizQuestions} />}
      {activePage === 'settings' && <SettingsSection />}
    </DashboardLayout>
  );
};

// --- Sub-sections ---

const AIDetectionSection = () => {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
       alert("Please upload an image file.");
       return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    setLoading(true);
    setAiResult(null);
    const formData = new FormData();
    formData.append('image', file);

    const speak = (text: string) => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    };

    try {
      const res = await detectCrop(formData);
      const result = res.data;
      setAiResult(result);
      
      const narration = `Analysis complete. Crop: ${result.crop}. Status: ${result.health}. ${result.disease === 'None' ? 'No disease detected.' : `Disease identified: ${result.disease}.`} Confidence: ${result.confidence}. Recommendation: ${result.recommendation}`;
      speak(narration);
    } catch (err) {
      console.error("AI analysis failed", err);
      speak("AI analysis failed. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
      <div className="card">
        <h3 className="text-xl font-bold mb-6">Crop Health Analysis</h3>
        <div style={{ padding: '2rem', textAlign: 'center', border: '2px dashed #e2e8f0', borderRadius: '1rem', background: '#f8fafc' }}>
          <input 
            type="file" 
            id="user-file-input" 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <UploadCloud className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500 mb-6 font-medium">Please upload a crop image to analyze.</p>
          <button 
            className="btn btn-primary" 
            onClick={() => document.getElementById('user-file-input')?.click()}
            style={{ width: '100%', maxWidth: '300px' }}
          >
            Upload Crop Image
          </button>
        </div>
        
        {preview && (
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <p className="font-bold mb-4">{t.preview}</p>
            <img src={preview} alt="preview" style={{ maxWidth: '100%', borderRadius: '1rem', border: '4px solid white', boxShadow: 'var(--shadow-md)' }} />
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="text-xl font-bold mb-6">{t.results}</h3>
        {loading ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
             <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
             <div className="font-bold text-slate-700">Analyzing crop image...</div>
             <p className="text-sm text-slate-500 mt-2">Identifying diseases and farming actions</p>
          </div>
        ) : aiResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span className="text-sm font-bold text-slate-500 uppercase">Crop</span>
                <span className="font-black text-slate-900">{aiResult.crop}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span className="text-sm font-bold text-slate-500 uppercase">Health</span>
                <span className={`font-bold ${aiResult.health.toLowerCase().includes('healthy') ? 'text-emerald-600' : 'text-orange-600'}`}>
                  {aiResult.health}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span className="text-sm font-bold text-slate-500 uppercase">Disease</span>
                <span className={`font-bold ${aiResult.disease === 'None' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {aiResult.disease}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-sm font-bold text-slate-500 uppercase">Confidence</span>
                <span className="font-bold text-primary">{aiResult.confidence}</span>
              </div>
            </div>

            <div style={{ padding: '1.5rem', background: '#ecfdf5', borderRadius: '1.5rem', border: '1px solid #d1fae5' }}>
              <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '0.75rem', color: '#065f46' }}>
                {t.suggestedAction}
              </p>
              <p style={{ fontWeight: 600, color: '#065f46', lineHeight: '1.5' }}>
                {aiResult.recommendation}
              </p>
            </div>
            
            <button className="btn btn-secondary" onClick={() => { setPreview(null); setAiResult(null); }}>
              Analyze New Image
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', borderStyle: 'dashed', border: '2px dashed #f1f5f9', background: '#f8fafc', color: 'var(--text-muted)', textAlign: 'center', borderRadius: '1rem' }}>
            <p className="italic px-6">Results will appear once an image is uploaded</p>
          </div>
        )}
      </div>
    </div>
  );
};

const AttendanceSection = ({ data, rate }: any) => {
  const { t } = useTranslation();
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const startScanner = () => {
    setIsScanning(true);
    setScanStatus('idle');
    setErrorMsg('');
    
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        /* verbose= */ false
      );

      const onScanSuccess = async (decodedText: string) => {
        const cleanToken = decodedText.trim();
        console.log("QR Code Decoded:", cleanToken);
        
        const speak = (text: string) => {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          window.speechSynthesis.speak(utterance);
        };

        try {
          // Stop scanning immediately to prevent duplicate calls
          await scanner.clear();
          setIsScanning(false);
          setScanStatus('loading');
          
          const res = await scanAttendance({ userId: 2, token: cleanToken });
          if (res.data.success) {
            setScanStatus('success');
            speak("Attendance marked successfully. Redirecting to dashboard.");
            setTimeout(() => window.location.reload(), 1500);
          } else {
            throw new Error(res.data.error || "Failed to mark attendance");
          }
        } catch (err: any) {
          console.error("Attendance scan error:", err);
          setScanStatus('error');
          setIsScanning(false);
          const msg = err.response?.data?.error || err.message || "Scanning failed";
          setErrorMsg(msg);
          speak(`Scanning failed: ${msg}`);
          // Try to clear if it wasn't cleared yet
          try { scanner.clear(); } catch(e) {}
        }
      };

      scanner.render(onScanSuccess, (errorMessage) => {
        // Ignore constant scanning failures (normal behavior of library while searching)
        if (errorMessage.includes("No QR code found")) return; // Very common
        console.debug("Scanner info:", errorMessage);
      });
    }, 100);
  };

  const lineData = {
    labels: data.slice(-5).map((d: any) => d.date).reverse(),
    datasets: [{
      label: 'Presence',
      data: data.slice(-5).map((d: any) => d.status === 'Present' ? 1 : 0).reverse(),
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2rem' }}>
        <div>
          <h3 className="text-xl font-black mb-2">Daily Attendance</h3>
          <p className="text-slate-500 mb-6">Scan the QR code displayed on the Admin's screen to mark your attendance for today.</p>
          {!isScanning ? (
            <button 
              className="btn btn-primary" 
              onClick={startScanner}
              style={{ background: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Camera size={20} />
              Open QR Scanner
            </button>
          ) : (
            <button 
              className="btn-outline" 
              onClick={() => setIsScanning(false)}
            >
              Cancel Scan
            </button>
          )}
          {scanStatus === 'loading' && <p className="mt-4 text-blue-500 font-bold">Processing attendance...</p>}
          {scanStatus === 'success' && <p className="mt-4 text-green-500 font-bold">Attendance marked successfully!</p>}
          {scanStatus === 'error' && <p className="mt-4 text-red-500 font-bold">{errorMsg}</p>}
        </div>
        {isScanning && (
          <div id="qr-reader" style={{ width: '300px', borderRadius: '1rem', overflow: 'hidden', border: '4px solid #10b981' }}></div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          <table style={{ width: '100%' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '1.25rem' }}>{t.date}</th>
                <th style={{ padding: '1.25rem' }}>{t.status}</th>
                <th style={{ padding: '1.25rem' }}>Activity</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row: any, idx: number) => (
                <tr key={idx}>
                  <td style={{ padding: '1.25rem' }}>{row.date}</td>
                  <td style={{ padding: '1.25rem' }}>
                    <span className={`badge ${row.status === 'Present' ? 'badge-success' : 'badge-danger'}`}>
                      {row.status}
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem', color: 'var(--text-muted)' }}>{row.activity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <h4 className="font-bold mb-4">{t.attendanceRate}</h4>
            <div style={{ height: '200px' }}>
              <Doughnut 
                data={{
                  labels: ['Present', 'Absent'],
                  datasets: [{
                    data: [rate, 100 - rate],
                    backgroundColor: ['#10b981', '#f1f5f9'],
                    borderWidth: 0
                  }]
                }}
                options={{ cutout: '75%', plugins: { legend: { display: false } } }}
              />
              <div style={{ marginTop: '-120px', marginBottom: '80px' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900 }}>{rate}%</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>STRENGTH</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h4 className="font-bold mb-4">Activity Trend</h4>
            <Line data={lineData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { display: false } } }} />
          </div>
        </div>
      </div>
    </div>
  );
};

const ModulesSection = ({ data }: any) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [quizTranscript, setQuizTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setIsReading(true);
    utterance.onend = () => setIsReading(false);
    window.speechSynthesis.speak(utterance);
  };

  const readCurrentQuestion = (currentQ: any) => {
    if (!currentQ) return;
    let text = `Question: ${currentQ.q}. `;
    currentQ.options.forEach((opt: string, idx: number) => {
      text += `Option ${idx + 1}: ${opt}. `;
    });
    speak(text);
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.maxAlternatives = 1;

      recognitionRef.current.onresult = (event: any) => {
        const last = event.results.length - 1;
        const result = event.results[last][0].transcript.toLowerCase().trim();
        setQuizTranscript(result);
        
        // Strict command matching
        const optionMap: Record<string, number> = {
          'option 1': 0, 'option one': 0,
          'option 2': 1, 'option two': 1,
          'option 3': 2, 'option three': 2,
          'option 4': 3, 'option four': 3
        };

        if (optionMap[result] !== undefined) {
          const idx = optionMap[result];
          const q = data[step];
          if (q && q.options[idx] !== undefined) {
            speak(`Option ${idx + 1} selected.`);
            setTimeout(() => handleAnswer(idx === q.correct), 1000);
          }
        } else {
          // If the recognition caught something but it doesn't match a valid quiz command
          if (result.length > 0) {
            speak("Please say Option 1, Option 2, Option 3, or Option 4.");
          }
        }
      };

      recognitionRef.current.onend = () => {
        if (!finished) recognitionRef.current?.start();
      };

      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Auto-start recognition failed", e);
      }
    }

    return () => recognitionRef.current?.stop();
  }, [step, finished]);

  useEffect(() => {
    if (!finished && data[step]) {
      readCurrentQuestion(data[step]);
    }
  }, [step, finished]);

  const handleAnswer = (correct: boolean) => {
    if (correct) {
      setScore(s => s + 1);
      speak("Correct answer.");
    } else {
      speak("Incorrect answer.");
    }

    setTimeout(() => {
      if (step < data.length - 1) {
        setStep(s => s + 1);
        setQuizTranscript('');
      } else {
        setFinished(true);
      }
    }, 1500);
  };

  const reset = () => {
    setStep(0);
    setScore(0);
    setFinished(false);
    setQuizTranscript('');
  };

  if (finished) {
    return (
      <div className="card" style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center', padding: '4rem 2rem' }}>
        <Trophy size={64} className="text-accent mx-auto mb-6" />
        <h3 className="text-2xl font-black mb-2">{t.finish}</h3>
        <p className="text-lg text-slate-500 mb-8">{t.score}: <span className="text-primary font-bold">{score} / {data.length}</span></p>
        <button onClick={reset} className="btn btn-primary" style={{ width: '100%' }}>Restart Quiz</button>
      </div>
    );
  }

  const q = data[step] || data[0];

  return (
    <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h3 className="text-xl font-bold">{t.quizTitle}</h3>
          <button 
            disabled={isReading}
            onClick={() => readCurrentQuestion(q)}
            className="btn btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          >
            <Volume2 size={16} /> {isReading ? 'Reading question...' : 'Read Question'}
          </button>
        </div>
        <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.25rem 0.75rem', background: '#f1f5f9', borderRadius: '1rem' }}>
          {step + 1} / {data.length}
        </span>
      </div>
      <p style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '2rem' }}>{q.q}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {q.options.map((opt: string, idx: number) => (
          <button 
            key={idx}
            onClick={() => handleAnswer(idx === q.correct)}
            className="btn"
            style={{ textAlign: 'left', border: '2px solid #f1f5f9', background: 'white' }}
          >
            <span style={{ fontWeight: 800, color: 'var(--primary)', marginRight: '1rem' }}>{idx + 1}.</span>
            {opt}
          </button>
        ))}
      </div>
      
      <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#dcfce7', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mic size={20} className="animate-pulse" />
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Voice Active</p>
            <p className="text-xs text-slate-500">Say "Option 1-4" to answer</p>
          </div>
        </div>
        
        <div style={{ padding: '1rem', background: quizTranscript ? '#f0f9ff' : '#f8fafc', borderRadius: '1rem', border: quizTranscript ? '1px solid #bae6fd' : '1px solid transparent' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase' }}>Heard</p>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>
            {quizTranscript ? `"${quizTranscript}"` : 'Listening...'}
          </p>
        </div>
      </div>
    </div>
  );
};

const SettingsSection = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<any>({
    nightMode: false,
    voiceGuidance: true
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await getSettings(2);
        if (Object.keys(res.data).length > 0) {
          setSettings({
            nightMode: res.data.nightMode === 'true',
            voiceGuidance: res.data.voiceGuidance === 'true'
          });
        }
      } catch (err) {
        console.error("Failed to fetch settings", err);
      }
    };
    fetchSettings();
  }, []);

  const toggleSetting = async (key: string) => {
    const newVal = !settings[key];
    const updated = { ...settings, [key]: newVal };
    setSettings(updated);
    try {
      await updateSettings({
        userId: 2,
        settings: { [key]: String(newVal) }
      });
    } catch (err) {
      console.error("Failed to update setting", err);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <SettingsIcon size={48} className="text-slate-200 mx-auto mb-6" />
      <h3 className="text-xl font-bold mb-4">{t.settings}</h3>
      <p className="text-slate-500 mb-8">{t.dummySettings}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
        <div 
          onClick={() => toggleSetting('nightMode')}
          style={{ padding: '1rem', background: '#f8fafc', borderRadius: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        >
          <span style={{ fontWeight: 600 }}>Night Mode</span>
          <div style={{ width: '40px', height: '22px', background: settings.nightMode ? 'var(--primary)' : '#e2e8f0', borderRadius: '11px', position: 'relative', transition: '0.3s' }}>
             <div style={{ width: '18px', height: '18px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: settings.nightMode ? '20px' : '2px', transition: '0.3s' }}></div>
          </div>
        </div>
        <div 
          onClick={() => toggleSetting('voiceGuidance')}
          style={{ padding: '1rem', background: '#f8fafc', borderRadius: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        >
          <span style={{ fontWeight: 600 }}>Enable Voice Guidance</span>
          <div style={{ width: '40px', height: '22px', background: settings.voiceGuidance ? 'var(--primary)' : '#e2e8f0', borderRadius: '11px', position: 'relative', transition: '0.3s' }}>
             <div style={{ width: '18px', height: '18px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: settings.voiceGuidance ? '20px' : '2px', transition: '0.3s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
