import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserPlus, Trash2, X, GraduationCap } from 'lucide-react';

const StudentManager = ({ profile, selectedClass, onCancel }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newStudent, setNewStudent] = useState({ name: '', password: '' });
  const [adding, setAdding] = useState(false);
  const [classId, setClassId] = useState(null);

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
                  <button 
                    onClick={() => handleDeleteStudent(student.id)}
                    style={{background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.5rem'}}
                    title="Remove Student"
                  >
                    <Trash2 size={18} />
                  </button>
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
    </div>
  );
};

export default StudentManager;
