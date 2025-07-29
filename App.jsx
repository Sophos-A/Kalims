const { useState } = React;

// Generate a simple unique ID (for simulation)
function generateUniqueId() {
    return 'KBTH-' + Math.random().toString(36).substr(2, 9);
}

function Header() {
    return (
        <header className="header">
            <div className="logo">
                <img src="favicon.png" alt="KBTH Logo" />
                Korle Bu Teaching Hospital
            </div>
        </header>
    );
}

function HomePage({ setPage }) {
    return (
        <div className="container">
            <h1 className="title">Welcome to Korle Bu Teaching Hospital</h1>
            <div className="card">
                <h2 className="text-green-800 mb-6">Are you a new or returning patient?</h2>
                <div>
                    <a
                        href="#new-patient"
                        className="button"
                        onClick={() => setPage('new-patient')}
                    >
                        New Patient
                    </a>
                    <a
                        href="#returning-patient"
                        className="button"
                        onClick={() => setPage('returning-patient')}
                    >
                        Returning Patient
                    </a>
                </div>
            </div>
        </div>
    );
}

function NewPatientForm({ setPage, addToQueue }) {
    const [formData, setFormData] = useState({
        name: '',
        dob: '',
        location: '',
        phone: '',
        reason: '',
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = () => {
        const patientId = generateUniqueId();
        // Simulate database upload
        console.log('Uploading to database:', { ...formData, patientId });
        addToQueue({ ...formData, patientId });
        setPage('dashboard');
    };

    return (
        <div className="container">
            <h1 className="title">New Patient Registration</h1>
            <div className="card">
                <div className="form-group">
                    <label>Full Name</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Enter your full name"
                    />
                </div>
                <div className="form-group">
                    <label>Date of Birth</label>
                    <input
                        type="date"
                        name="dob"
                        value={formData.dob}
                        onChange={handleChange}
                    />
                </div>
                <div className="form-group">
                    <label>Location</label>
                    <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        placeholder="Enter your location"
                    />
                </div>
                <div className="form-group">
                    <label>Phone Number</label>
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="Enter your phone number"
                    />
                </div>
                <div className="form-group">
                    <label>Reason for Visit</label>
                    <input
                        type="text"
                        name="reason"
                        value={formData.reason}
                        onChange={handleChange}
                        placeholder="Describe your reason for visit"
                    />
                </div>
                <a
                    href="#submit"
                    className="button"
                    onClick={handleSubmit}
                >
                    Submit and Join Queue
                </a>
            </div>
        </div>
    );
}

function ReturningPatientForm({ setPage, addToQueue }) {
    const [patientId, setPatientId] = useState('');

    const handleSubmit = () => {
        if (patientId) {
            // Simulate queue addition
            console.log('Validating patient ID and adding to queue:', patientId);
            addToQueue({ patientId, name: 'Returning Patient' });
            setPage('dashboard');
        } else {
            alert('Please enter a valid Patient ID');
        }
    };

    return (
        <div className="container">
            <h1 className="title">Returning Patient</h1>
            <div className="card">
                <div className="form-group">
                    <label>Patient ID</label>
                    <input
                        type="text"
                        value={patientId}
                        onChange={(e) => setPatientId(e.target.value)}
                        placeholder="Enter your Patient ID"
                    />
                </div>
                <a
                    href="#submit"
                    className="button"
                    onClick={handleSubmit}
                >
                    Join Queue
                </a>
            </div>
        </div>
    );
}

function Dashboard({ queue }) {
    // Simulated doctor and queue data
    const doctors = [
        { name: 'Dr. John Mensah', status: 'Available', waitTime: '10 min' },
        { name: 'Dr. Ama Kwarteng', status: 'Busy', waitTime: '20 min' },
        { name: 'Dr. Kofi Asare', status: 'Available', waitTime: '5 min' },
    ];

    return (
        <div className="container">
            <h1 className="title">Patient Queue Dashboard</h1>
            <div className="dashboard">
                <h2 className="text-blue-800">Current Queue</h2>
                <table className="queue-table">
                    <thead>
                        <tr>
                            <th>Patient ID</th>
                            <th>Name</th>
                            <th>Position</th>
                        </tr>
                    </thead>
                    <tbody>
                        {queue.length > 0 ? (
                            queue.map((patient, index) => (
                                <tr key={patient.patientId}>
                                    <td>{patient.patientId}</td>
                                    <td>{patient.name}</td>
                                    <td>{index + 1}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="3">No patients in queue</td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <h2 className="text-blue-800">Doctor Availability</h2>
                <div className="doctor-status">
                    {doctors.map((doctor, index) => (
                        <div key={index} className="status-card">
                            <h3>{doctor.name}</h3>
                            <p>Status: {doctor.status}</p>
                            <p>Estimated Wait Time: {doctor.waitTime}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function App() {
    const [page, setPage] = useState('home');
    const [queue, setQueue] = useState([]);

    const addToQueue = (patient) => {
        setQueue([...queue, patient]);
    };

    return (
        <div className="min-h-screen flex flex-col items-center">
            <Header />
            {page === 'home' && <HomePage setPage={setPage} />}
            {page === 'new-patient' && (
                <NewPatientForm setPage={setPage} addToQueue={addToQueue} />
            )}
            {page === 'returning-patient' && (
                <ReturningPatientForm setPage={setPage} addToQueue={addToQueue} />
            )}
            {page === 'dashboard' && <Dashboard queue={queue} />}
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);