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
    
    // 1. Get class ID
    const { data: classData } = await supabase
      .from('classes')
      .select('id')
      .eq('name', selectedClass)
      .single();

    if (classData) {
      setClassId(classData.id);
      
      // 2. Get Students for this class
      const { data: studentData } = await supabase
        .from('profiles')
        .select('*')
        .eq('class_id', classData.id)
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
    
    // Insert directly into profiles (no Supabase Auth needed for simple login)
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        full_name: newStudent.name,
        password: newStudent.password,
        role: 'student',
        class_id: classId
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
          final_score,
          game_sessions (
            id,
            created_at,
            quizzes (title)
          )
        `)
        .eq('profile_id', student.id)
        .order('created_at', { foreignTable: 'game_sessions', ascending: false });

      const { data: responses } = await supabase
        .from('student_responses')
        .select(`
          *,
          questions (question_text, options, correct_answer)
        `)
        .eq('profile_id', student.id);

      // Group responses by session
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
    if (!window.confirm('Are you sure you want to remove this student?')) return;
    
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', studentId);
      
    if (error) {
      alert('Error deleting student: ' + error.message);
    } else {
      setStudents(students.filter(s => s.id !== studentId));
    }
  };

  return (
    <div className="screen animate-in" style={{justifyContent: 'flex-start', padding: '2rem'}}>
      <div className="dashboard-header">
        <div className="user-info">
          <h2>Manage Students</h2>
          <p>Class: {selectedClass}</p>
        </div>
        <button className="btn btn-outline" style={{width: 'auto'}} onClick={onCancel}>
          <X size={18} /> Back to Dashboard
        </button>
      </div>

      <div style={{display: 'flex', gap: '2rem', marginTop: '2rem', flexWrap: 'wrap'}}>
        
        {/* Add Student Form */}
        <div className="auth-card" style={{flex: '1', minWidth: '300px', height: 'fit-content'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem'}}>
            <UserPlus color="var(--primary)"/>
            <h3>Add New Student</h3>
          </div>
          
          <form onSubmit={handleAddStudent}>
            <div className="form-group">
              <label>Student Full Name</label>
              <input 
                type="text" 
                placeholder="e.g. John Doe"
                value={newStudent.name}
                onChange={(e) => setNewStudent({...newStudent, name: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Login Password</label>
              <input 
                type="text" 
                placeholder="e.g. John123"
                value={newStudent.password}
                onChange={(e) => setNewStudent({...newStudent, password: e.target.value})}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={adding}>
              {adding ? 'Adding...' : 'Add Student'}
            </button>
          </form>
        </div>

        {/* Student List */}
        <div className="auth-card" style={{flex: '2', minWidth: '400px', background: 'rgba(15, 23, 42, 0.4)'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem'}}>
            <GraduationCap color="var(--success)"/>
            <h3>{selectedClass} Roster ({students.length})</h3>
          </div>

          {loading ? (
            <p style={{color: 'var(--text-secondary)'}}>Loading roster...</p>
          ) : students.length > 0 ? (
            <div className="students-list" style={{display: 'grid', gap: '1rem'}}>
              {students.map(student => (
                <div key={student.id} style={{
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.03)',
                  padding: '1rem 1.5rem',
                  borderRadius: '12px',
                  border: '1px solid var(--glass-border)'
                }}>
                  <div>
                    <div style={{fontWeight: 600, color: 'var(--text-primary)'}}>{student.full_name}</div>
                    <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Password: {student.password}</div>
                  </div>
                  <div style={{display: 'flex', gap: '0.5rem'}}>
                    <button 
                      onClick={() => handleViewHistory(student)}
                      style={{background: 'rgba(59, 130, 246, 0.1)', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px'}}
                      title="View Game History"
                    >
                      <History size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteStudent(student.id)}
                      style={{background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.5rem'}}
                      title="Remove Student"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{padding: '2rem 0'}}>
              <p>No students enrolled in {selectedClass} yet.</p>
              <p style={{fontSize: '0.9rem', marginTop: '0.5rem'}}>Use the form to add your first student.</p>
            </div>
          )}
        </div>
      </div>
      {/* History Modal */}
      {viewingHistory && (
        <div className="feedback-screen animate-in" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(2, 6, 23, 0.95)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '2rem', backdropFilter: 'blur(10px)'
        }}>
          <div className="auth-card" style={{width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', textAlign: 'left', border: '1px solid var(--primary)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
              <div>
                <h2 style={{margin: 0}}>Game History: {viewingHistory.full_name}</h2>
                <p style={{color: 'var(--text-secondary)', margin: '0.5rem 0 0 0'}}>Detailed performance logs across all sessions</p>
              </div>
              <button className="btn btn-outline" style={{width: 'auto'}} onClick={() => setViewingHistory(null)}>
                <X size={18} /> Close
              </button>
            </div>

            {loadingHistory ? (
              <div style={{padding: '4rem', textAlign: 'center'}}>
                <div className="animate-pulse" style={{color: 'var(--primary)'}}>Analyzing performance data...</div>
              </div>
            ) : historyData.length > 0 ? (
              <div style={{display: 'grid', gap: '2rem'}}>
                {historyData.map((game, gIdx) => (
                  <div key={gIdx} style={{background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--glass-border)', overflow: 'hidden'}}>
                    <div style={{background: 'rgba(37, 99, 235, 0.1)', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <div>
                        <div style={{fontWeight: 700, fontSize: '1.1rem'}}>{game.game_sessions?.quizzes?.title || 'Unknown Quiz'}</div>
                        <div style={{fontSize: '0.8rem', opacity: 0.7}}>Played on {new Date(game.game_sessions?.created_at).toLocaleDateString()}</div>
                      </div>
                      <div style={{textAlign: 'right'}}>
                        <div style={{fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)'}}>{game.final_score} pts</div>
                        <div style={{fontSize: '0.8rem', color: 'var(--success)'}}>
                          {Math.round((game.responses.filter(r => r.is_correct).length / game.responses.length) * 100) || 0}% Accuracy
                        </div>
                      </div>
                    </div>
                    <div style={{padding: '1rem 1.5rem'}}>
                      <div style={{fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-secondary)'}}>Question Breakdown</div>
                      <div style={{display: 'grid', gap: '0.5rem'}}>
                        {game.responses.map((resp, rIdx) => (
                          <div key={rIdx} style={{display: 'flex', gap: '1rem', alignItems: 'flex-start', background: 'rgba(2, 6, 23, 0.3)', padding: '0.8rem', borderRadius: '10px'}}>
                            {resp.is_correct ? <CheckCircle2 size={18} color="var(--success)" /> : <XCircle size={18} color="var(--danger)" />}
                            <div style={{flex: 1}}>
                              <div style={{fontSize: '0.95rem'}}>{resp.questions?.question_text}</div>
                              <div style={{fontSize: '0.8rem', marginTop: '0.4rem'}}>
                                <span style={{opacity: 0.6}}>Answered:</span> {resp.questions?.options[resp.chosen_option]}
                                {!resp.is_correct && (
                                  <>
                                    <ChevronRight size={12} style={{margin: '0 0.5rem'}} />
                                    <span style={{color: 'var(--success)'}}>Correct: {resp.questions?.options[resp.questions.correct_answer]}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div style={{fontSize: '0.8rem', opacity: 0.6}}>{(resp.time_taken).toFixed(2)}s</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{padding: '4rem', textAlign: 'center', opacity: 0.5}}>
                <BarChart3 size={48} style={{marginBottom: '1rem'}} />
                <p>No game sessions found for this student yet.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManager;
