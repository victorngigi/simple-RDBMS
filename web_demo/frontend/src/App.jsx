import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = "http://localhost:8000";

function App() {
  const [report, setReport] = useState([]);
  const [studentName, setStudentName] = useState('');

  // 1. Fetch the Joined Report
  const fetchReport = async () => {
    try {
      const res = await axios.get(`${API_URL}/enrollment-report`);
      setReport(res.data);
    } catch (err) {
      console.error("Error fetching report:", err);
    }
  };

  // 2. Add a new Student
  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/students`, {
        id: Date.now(), // Unique ID based on timestamp
        name: studentName,
        major: "Applied Computing"
      });
      setStudentName('');
      fetchReport();
      alert("Student added to PesaDB!");
    } catch (err) {
      alert(err.response?.data?.detail || "Error saving to DB");
    }
  };

  useEffect(() => { fetchReport(); }, []);

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>🎓 USIU Enrollment System (Powered by PesaDB)</h1>
      
      <section style={{ marginBottom: '30px', border: '1px solid #ddd', padding: '20px' }}>
        <h3>Register New Student</h3>
        <form onSubmit={handleAddStudent}>
          <input 
            value={studentName} 
            onChange={(e) => setStudentName(e.target.value)} 
            placeholder="Enter Student Name"
            style={{ padding: '10px', marginRight: '10px' }}
          />
          <button type="submit" style={{ padding: '10px' }}>Save to RDBMS</button>
        </form>
      </section>

      <section>
        <h3>Enrollment Report (Relational Join Result)</h3>
        <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f4f4f4' }}>
              <th>Student Name</th>
              <th>Course</th>
              <th>Major</th>
            </tr>
          </thead>
          <tbody>
            {report.map((row, idx) => (
              <tr key={idx}>
                <td>{row.name}</td>
                <td>{row.course_name}</td>
                <td>{row.major}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default App;