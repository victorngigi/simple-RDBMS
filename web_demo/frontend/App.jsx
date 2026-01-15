import { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [students, setStudents] = useState([]);
  const [name, setName] = useState('');

  const fetchStudents = async () => {
    const res = await axios.get('http://localhost:8000/students');
    setStudents(res.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:8000/students', {
        id: Math.floor(Math.random() * 1000), // Trivial ID generation
        name,
        major: "Applied Computing"
      });
      setName('');
      fetchStudents();
    } catch (err) {
      alert(err.response.data.detail);
    }
  };

  useEffect(() => { fetchStudents(); }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>PesaDB Student Registry</h1>
      <form onSubmit={handleSubmit}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Student Name" />
        <button type="submit">Add Student</button>
      </form>
      <ul>
        {students.map(s => <li key={s.id}>{s.name} - {s.major}</li>)}
      </ul>
    </div>
  );
}

export default App;