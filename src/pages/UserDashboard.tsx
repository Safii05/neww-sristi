import { useState, useEffect } from 'react';
import { 
  ScanFace, 
  CalendarCheck, 
  BookOpen, 
  Settings as SettingsIcon,
  UploadCloud,
  Trophy,
  ChevronLeft,
  LogOut,
  Camera
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);

      // Upload to backend
      setLoading(true);
      const formData = new FormData();
      formData.append('image', file);
      try {
        const res = await detectCrop(formData);
        setAiResult(res.data);
      } catch (err) {
        console.error("AI analysis failed", err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
      <div className="card">
        <h3 className="text-xl font-bold mb-6">{t.aiDetection}</h3>
        <div 
          className="upload-zone"
          onClick={() => document.getElementById('user-file-input')?.click()}
        >
          <input 
            type="file" 
            id="user-file-input" 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <UploadCloud className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500 font-medium">{t.uploadBox}</p>
        </div>
        {preview && (
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <p className="font-bold mb-4">{t.preview}</p>
            <img src={preview} alt="preview" style={{ maxWidth: '100%', borderRadius: '1rem', border: '4px solid white', boxShadow: 'var(--shadow-md)' }} />
          </div>
        )}
      </div>

      {preview ? (
        <div className="card">
          <h3 className="text-xl font-bold mb-6">{t.results}</h3>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
               <div className="fade-in">Analyzing with Gemini AI...</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: '#f8fafc', borderRadius: '1rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{t.cropType}</span>
                <span style={{ fontWeight: 800 }}>{aiResult?.cropType || 'Cabbage'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: '#f8fafc', borderRadius: '1rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{t.cropHealth}</span>
                <span className="text-primary font-bold">{aiResult?.healthStatus || t.healthGood}</span>
              </div>
              <div style={{ padding: '1.5rem', background: '#ecfdf5', borderRadius: '1.5rem', border: '1px solid #d1fae5' }}>
                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '0.5rem', color: '#065f46' }}>{t.suggestedAction}</p>
                <p style={{ fontWeight: 600, color: '#065f46' }}>{aiResult?.suggestedAction || t.actionNone}</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', background: '#f8fafc', color: 'var(--text-muted)', textAlign: 'center' }}>
          <p className="italic">{t.placeholderResults}</p>
        </div>
      )}
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
        
        try {
          // Stop scanning immediately to prevent duplicate calls
          await scanner.clear();
          setIsScanning(false);
          setScanStatus('loading');
          
          const res = await scanAttendance({ userId: 2, token: cleanToken });
          if (res.data.success) {
            setScanStatus('success');
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

  const handleAnswer = (correct: boolean) => {
    if (correct) setScore(s => s + 1);
    if (step < data.length - 1) {
      setStep(s => s + 1);
    } else {
      setFinished(true);
    }
  };

  const reset = () => {
    setStep(0);
    setScore(0);
    setFinished(false);
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
        <h3 className="text-xl font-bold">{t.quizTitle}</h3>
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
            {opt}
          </button>
        ))}
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
