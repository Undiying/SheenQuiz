import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserPlus, Trash2, X, GraduationCap, History, CheckCircle2, XCircle, ChevronRight, BarChart3 } from 'lucide-react';

const StudentManager = ({ profile, selectedClass, onCancel }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newStudent, setNewStudent] = useState({ name: '', password: '' });
  const [adding, setAdding] = useState(false);
  const [classId, setClassId] = useState(null);
  const [viewingHistory, setViewingHistory] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchClassAndStudents();
  }, [selectedClass]);

  const fetchClassAndStudents = async () => {
    setLoading(true);
    
    // 1. Get class ID (Scoped to School)
    const { data: classData } = await supabase
      .from('classes')
      .select('id')
      .eq('name', selectedClass)
      .eq('school_id', profile.school_id)
      .single();

    if (classData) {
      setClassId(classData.id);
      
      // 2. Get Students for this class
      const { data: studentData } = await supabase
        .from('profiles')
        .select('*')
        .eq('class_id', classData.id)
        .eq('school_id', profile.school_id)
        .eq('role', 'student')
        .order('full_name', { ascending: true });
        
      if (studentData) setStudents(studentData);
    }
    setLoading(false);
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.password) return;
    
    setAdding(true);
    
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        full_name: newStudent.name.trim(),
        password: newStudent.password.trim(),
        role: 'student',
        class_id: classId,
        school_id: profile.school_id
      })
      .select()
      .single();

    if (error) {
      alert('Error adding student: ' + error.message);
    } else {
      setStudents([...students, data].sort((a, b) => a.full_name.localeCompare(b.full_name)));
      setNewStudent({ name: '', password: '' });
    }
    
    setAdding(false);
  };

  const handleViewHistory = async (student) => {
    setViewingHistory(student);
    setLoadingHistory(true);
    
    try {
      const { data: sessions } = await supabase
        .from('game_participants')
        .select(`
          session_id,
          score,
          game_sessions (
            id,
            created_at,
            quizzes (title)
          )
        `)
        .eq('profile_id', student.id);

      const { data: responses } = await supabase
        .from('student_responses')
        .select(`
          *,
          questions (question_text, options, correct_answer)
        `)
        .eq('profile_id', student.id);

      const history = sessions.map(s => ({
        ...s,
        responses: responses.filter(r => r.session_id === s.session_id)
      }));

      setHistoryData(history);
    } catch (err) {
      console.error(err);
    }
    setLoadingHistory(false);
  };

  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm('Are you sure you want to remove this student? All their game history will be permanently deleted.')) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', studentId);
        
      if (error) throw error;
      setStudents(students.filter(s => s.id !== studentId));
    } catch (err) {
      alert('Error removing student: ' + err.message);
    }
  };

  return (
    <div className="screen animate-in" style={{justifyContent: 'flex-start', padding: '2rem'}}>
      <div className="dashboard-header">
        <div className="user-info">
          <h2>Manage Students</h2>
          <p>Class: {selectedClass}</p>
        </div>
        <button className="btn btn-outline" style={{width: 'auto'}} onClick={onCancel}><X size={18} /> Back</button>
      </div>

      <div style={{display: 'flex', gap: '2rem', marginTop: '2rem', flexWrap: 'wrap'}}>
        <div className="auth-card" style={{flex: '1', minWidth: '300px', height: 'fit-content'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem'}}>
            <UserPlus color="var(--primary)"/><h3>Add Student</h3>
          </div>
          <form onSubmit={handleAddStudent}>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" placeholder="John Doe" value={newStudent.name} onChange={(e) => setNewStudent({...newStudent, name: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="text" placeholder="Password123" value={newStudent.password} onChange={(e) => setNewStudent({...newStudent, password: e.target.value})} required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={adding}>{adding ? 'Adding...' : 'Add Student'}</button>
          </form>
        </div>

        <div className="auth-card" style={{flex: '2', minWidth: '400px', background: 'rgba(15, 23, 42, 0.4)'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem'}}>
            <GraduationCap color="var(--success)"/><h3>{selectedClass} Roster ({students.length})</h3>
          </div>
          {loading ? <p>Loading gear...</p> : (
            <div className="students-list" style={{display: 'grid', gap: '1rem'}}>
              {students.map(student => (
                <div key={student.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '1rem 1.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)'}}>
                  <div><div style={{fontWeight: 600}}>{student.full_name}</div><div style={{fontSize: '0.85rem', opacity: 0.6}}>Password: {student.password}</div></div>
                  <div style={{display: 'flex', gap: '0.5rem'}}>
                    <button onClick={() => handleViewHistory(student)} className="btn-icon"><History size={18} /></button>
                    <button onClick={() => handleDeleteStudent(student.id)} className="btn-icon" style={{color: 'var(--danger)'}}><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
              {students.length === 0 && <div className="empty-state"><p>No students enrolled yet.</p></div>}
            </div>
          )}
        </div>
      </div>

      {viewingHistory && (
        <div className="feedback-screen animate-in" style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(2, 6, 23, 0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem', backdropFilter: 'blur(10px)'}}>
          <div className="auth-card" style={{width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', textAlign: 'left', border: '1px solid var(--primary)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '2rem'}}>
              <div><h2>History: {viewingHistory.full_name}</h2><p style={{opacity: 0.7}}>Detailed performance logs</p></div>
              <button className="btn btn-outline" style={{width: 'auto'}} onClick={() => setViewingHistory(null)}><X size={18} /> Close</button>
            </div>
            {loadingHistory ? <p>Analyzing data...</p> : historyData.map((game, gIdx) => (
              <div key={gIdx} style={{background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--glass-border)', overflow: 'hidden', marginBottom: '1.5rem'}}>
                <div style={{background: 'rgba(37, 99, 235, 0.1)', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between'}}>
                  <div><div style={{fontWeight: 700}}>{game.game_sessions?.quizzes?.title || 'Quiz'}</div><div style={{fontSize: '0.8rem', opacity: 0.7}}>{new Date(game.game_sessions?.created_at).toLocaleDateString()}</div></div>
                  <div style={{textAlign: 'right'}}><div style={{fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)'}}>{game.score || 0} pts</div></div>
                </div>
                <div style={{padding: '1rem 1.5rem'}}>
                  {game.responses.map((resp, rIdx) => (
                    <div key={rIdx} style={{display: 'flex', gap: '1rem', padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                      {resp.is_correct ? <CheckCircle2 size={16} color="var(--success)" /> : <XCircle size={16} color="var(--danger)" />}
                      <span style={{fontSize: '0.9rem'}}>{resp.questions?.question_text}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManager;
