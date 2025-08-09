import { useState, useEffect } from "react";
import { 
  LogIn, UserPlus, Activity, Users, Loader, AlertTriangle, CheckCircle, 
  XCircle, Clock, Shield, Home, LogOut, ClipboardList, AlertOctagon
} from "lucide-react";

// Base API URL
const API_BASE = "http://localhost:5000/api";

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [patientForm, setPatientForm] = useState({
    name: "",
    dob: "",
    gender: "Male",
    phone: "",
    email: "",
    address: "",
    medicalHistory: "",
    symptoms: "",
  });

  const [queue, setQueue] = useState([]);
  const [triageResult, setTriageResult] = useState(null);

  // Load user from localStorage on startup
  useEffect(() => {
    const savedUser = localStorage.getItem("triage_user");
    const token = localStorage.getItem("triage_token");
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    } else {
      setActiveTab("login");
    }
  }, []);

  // Fetch queue when dashboard or queue tab is active
  useEffect(() => {
    if (user && (activeTab === "dashboard" || activeTab === "queue")) {
      fetchQueue();
    }
  }, [user, activeTab]);

  const fetchQueue = async () => {
    try {
      const res = await fetch(`${API_BASE}/queue`, {
        headers: { 
          "Authorization": `Bearer ${localStorage.getItem("triage_token")}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setQueue(data);
      } else {
        const err = await res.json();
        setError(err.error || "Failed to load queue");
      }
    } catch (err) {
      setError("Connection failed. Is backend running?");
    }
  };

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm)
      });

      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        localStorage.setItem("triage_user", JSON.stringify(data.user));
        localStorage.setItem("triage_token", data.token);
        setActiveTab("dashboard");
        setSuccess("✅ Logged in successfully!");
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("❌ Connection failed. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("triage_user");
    localStorage.removeItem("triage_token");
    setActiveTab("login");
    setSuccess("You've been logged out.");
  };

  // Register Patient & Run AI Triage
  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Step 1: Register Patient
      const patientRes = await fetch(`${API_BASE}/patients`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("triage_token")}`
        },
        body: JSON.stringify({
          name: patientForm.name,
          dob: patientForm.dob,
          gender: patientForm.gender,
          phone: patientForm.phone,
          email: patientForm.email,
          address: patientForm.address,
          medicalHistory: patientForm.medicalHistory
        })
      });

      const patientData = await patientRes.json();
      if (!patientRes.ok) throw new Error(patientData.error);

      // Step 2: Get the real visitId from patient registration response
      // The backend creates a visit automatically and returns visitId
      const visitId = patientData.visitId || patientData.id; // Use visitId if available, fallback to patient ID

      // Step 3: Run AI Triage with real visitId
      const triageRes = await fetch(`${API_BASE}/triage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("triage_token")}`
        },
        body: JSON.stringify({
          visitId: visitId, // Use real visitId from database
          symptoms: patientForm.symptoms,
          vitals: {}
        })
      });

      const triageData = await triageRes.json();
      if (!triageRes.ok) throw new Error(triageData.error);

      // Update state
      setTriageResult(triageData);
      setQueue(prev => [
        ...prev,
        {
          id: patientData.id,
          name: patientForm.name,
          priorityScore: triageData.severityScore,
          status: "waiting",
          queuedAt: new Date().toISOString()
        }
      ].sort((a, b) => b.priorityScore - a.priorityScore));

      setSuccess(`Patient registered. ${triageData.requiresUrgentCare ? '🔴 CRITICAL' : '🟢 Standard'}`);
      setActiveTab("triage-result");
    } catch (err) {
      setError(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Clear notifications
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 5000);
      return () => clearTimeout(timer);
    }
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  // Navigation Tabs
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "register", label: "Register Patient", icon: UserPlus },
    { id: "queue", label: "Live Queue", icon: Users },
    { id: "triage-result", label: "Triage Result", icon: Activity },
  ];

  const NavButton = ({ tab, isActive, onClick }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
        ${isActive 
          ? "bg-blue-600 text-white shadow-md" 
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}
    >
      <tab.icon size={18} />
      {tab.label}
    </button>
  );

  const Alert = ({ type, message, onClose }) => (
    <div className={`p-4 rounded-lg text-sm flex items-center gap-2 mb-4
      ${type === "error" ? "bg-red-50 text-red-700 border-l-4 border-red-500" : ""}
      ${type === "success" ? "bg-green-50 text-green-700 border-l-4 border-green-500" : ""}
    `}>
      {type === "error" && <XCircle size={18} />}
      {type === "success" && <CheckCircle size={18} />}
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} className="ml-auto">
          <XCircle size={14} />
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Activity className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">MedTriage AI</h1>
                <p className="text-xs text-gray-500">Emergency Prioritization System</p>
              </div>
            </div>

            {user && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Notifications */}
        {success && <Alert type="success" message={success} />}
        {error && <Alert type="error" message={error} />}

        {!user ? (
          // Login Screen
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="text-blue-600" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Staff Login</h2>
                <p className="text-gray-600 mt-2">Access the triage system</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="you@hospital.org"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <Loader className="animate-spin" size={20} /> : <LogIn size={20} />}
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>
            </div>
          </div>
        ) : (
          // Dashboard Layout
          <div className="space-y-6">
            {/* Navigation Tabs */}
            <div className="bg-white rounded-lg shadow-sm p-2 flex flex-wrap gap-1">
              {tabs.map(tab => (
                <NavButton
                  key={tab.id}
                  tab={tab}
                  isActive={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                />
              ))}
            </div>

            {/* Dashboard */}
            {activeTab === "dashboard" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Patients</p>
                      <p className="text-2xl font-bold text-gray-900">{queue.length}</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Users size={24} className="text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">High Priority</p>
                      <p className="text-2xl font-bold text-red-600">
                        {queue.filter(p => p.priorityScore >= 0.7).length}
                      </p>
                    </div>
                    <div className="p-3 bg-red-100 rounded-lg">
                      <AlertOctagon size={24} className="text-red-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg Wait Time</p>
                      <p className="text-2xl font-bold text-green-600">22 min</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <Clock size={24} className="text-green-600" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Register Patient */}
            {activeTab === "register" && (
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Register New Patient</h2>
                <form onSubmit={handleRegisterPatient} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={patientForm.name}
                        onChange={(e) => setPatientForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={patientForm.dob}
                        onChange={(e) => setPatientForm(prev => ({ ...prev, dob: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gender
                      </label>
                      <select
                        value={patientForm.gender}
                        onChange={(e) => setPatientForm(prev => ({ ...prev, gender: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={patientForm.phone}
                        onChange={(e) => setPatientForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="+1 234 567 8900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={patientForm.email}
                        onChange={(e) => setPatientForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="john@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <input
                      type="text"
                      value={patientForm.address}
                      onChange={(e) => setPatientForm(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="123 Main St, City, Country"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Medical History (Optional)
                    </label>
                    <textarea
                      value={patientForm.medicalHistory}
                      onChange={(e) => setPatientForm(prev => ({ ...prev, medicalHistory: e.target.value }))}
                      rows="3"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Diabetes, asthma, etc."
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Symptoms (for AI Triage)
                    </label>
                    <textarea
                      value={patientForm.symptoms}
                      onChange={(e) => setPatientForm(prev => ({ ...prev, symptoms: e.target.value }))}
                      rows="4"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Chest pain, fever, shortness of breath..."
                      required
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader className="animate-spin" size={20} /> : <UserPlus size={20} />}
                    {loading ? "Processing with AI..." : "Register & Triage Patient"}
                  </button>
                </form>
              </div>
            )}

            {/* Live Queue */}
            {activeTab === "queue" && (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-6 border-b">
                  <h2 className="text-2xl font-bold text-gray-900">Live Triage Queue</h2>
                  <p className="text-gray-600">Patients ordered by clinical urgency</p>
                </div>
                <div className="divide-y">
                  {queue.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No patients in queue</div>
                  ) : (
                    queue.map((item) => (
                      <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{item.name}</h3>
                            <p className="text-sm text-gray-600">
                              Wait: {Math.round(item.waitMinutes)} min
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium
                              ${item.priorityScore >= 0.7 
                                ? "bg-red-100 text-red-800" 
                                : item.priorityScore >= 0.4 
                                  ? "bg-yellow-100 text-yellow-800" 
                                  : "bg-green-100 text-green-800"}`}
                            >
                              Priority {item.priorityScore.toFixed(3)}
                            </span>
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {item.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Triage Result */}
            {activeTab === "triage-result" && triageResult && (
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="text-center mb-8">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4
                    ${triageResult.severityScore >= 0.7 
                      ? "bg-red-100" 
                      : triageResult.severityScore >= 0.4 
                        ? "bg-yellow-100" 
                        : "bg-green-100"}`}
                  >
                    <AlertTriangle 
                      size={40} 
                      className={`${triageResult.severityScore >= 0.7 
                        ? "text-red-600" 
                        : triageResult.severityScore >= 0.4 
                          ? "text-yellow-600" 
                          : "text-green-600"}`} 
                    />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">AI Triage Result</h2>
                  <p className="text-gray-600">Generated at {new Date().toLocaleTimeString()}</p>
                </div>

                <div className="space-y-6">
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2">Patient</h3>
                    <p className="text-gray-700">{patientForm.name}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-blue-50 p-6 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-2">Severity Score</h3>
                      <p className="text-3xl font-bold text-blue-600">{triageResult.severityScore.toFixed(3)}</p>
                    </div>
                    <div className={`p-6 rounded-lg 
                      ${triageResult.severityScore >= 0.7 
                        ? "bg-red-50" 
                        : triageResult.severityScore >= 0.4 
                          ? "bg-yellow-50" 
                          : "bg-green-50"}`}
                    >
                      <h3 className="font-semibold text-gray-900 mb-2">Recommendation</h3>
                      <p className="text-gray-700">{triageResult.recommendedAction}</p>
                    </div>
                  </div>

                  {triageResult.criticalFlags && triageResult.criticalFlags.length > 0 && (
                    <div className="bg-red-50 p-6 rounded-lg">
                      <h3 className="font-semibold text-red-900 mb-3">Critical Flags Detected</h3>
                      <div className="flex flex-wrap gap-2">
                        {triageResult.criticalFlags.map((flag, i) => (
                          <span key={i} className="px-3 py-1 bg-red-200 text-red-800 rounded-full text-sm font-medium">
                            {flag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 pt-6">
                    <button
                      onClick={() => setActiveTab("queue")}
                      className="flex-1 bg-gray-600 text-white py-3 rounded-lg font-medium hover:bg-gray-700"
                    >
                      View Queue
                    </button>
                    <button
                      onClick={() => setActiveTab("register")}
                      className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700"
                    >
                      Register Another
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}