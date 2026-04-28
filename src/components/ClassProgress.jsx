import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Trophy, BarChart3, Timer } from 'lucide-react';

const ClassProgress = ({ profile, selectedClass, onCancel }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgress();
  }, [selectedClass]);

  const fetchProgress = async () => {
    setLoading(true);
    try {
      // 1. Get class ID (Scoped to School)
      const { data: classData } = await supabase
        .from('classes')
        .select('id')
        .eq('name', selectedClass)
        .eq('school_id', profile.school_id)
        .single();

      if (!classData) throw new Error('Class not found');

      // 2. Get students
      const { data: studentData } = await supabase
        .from('profiles')
        .select('id, full_name, display_name')
        .eq('role', 'student')
        .eq('class_id', classData.id)
        .eq('school_id', profile.school_id);

      if (!studentData || studentData.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // 3. Calculate stats
      const statsPromises = studentData.map(async (student) => {
        const { data: participation } = await supabase
          .from('game_participants')
          .select('score')
          .eq('profile_id', student.id);

        const gamesPlayed = participation ? participation.length : 0;
        const totalScore = participation ? participation.reduce((acc, curr) => acc + (curr.score || 0), 0) : 0;

        const { data: responses } = await supabase
          .from('student_responses')
          .select('is_correct, time_taken')
          .eq('profile_id', student.id);

        let accuracy = 0;
        let avgSpeed = 0;

        if (responses && responses.length > 0) {
          const correctCount = responses.filter(r => r.is_correct).length;
          accuracy = Math.round((correctCount / responses.length) * 100);
          const totalTime = responses.reduce((acc, curr) => acc + (curr.time_taken || 0), 0);
          avgSpeed = (totalTime / responses.length).toFixed(1);
        }

        return { ...student, gamesPlayed, totalScore, accuracy, avgSpeed };
      });

      const processedStudents = await Promise.all(statsPromises);
      processedStudents.sort((a, b) => b.totalScore - a.totalScore);
      setStudents(processedStudents);
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
    setLoading(false);
  };

  return (
    <div className="screen animate-in" style={{justifyContent: 'flex-start', padding: '2rem'}}>
      <div className="dashboard-header">
        <div className="user-info">
          <h2>Academy Analytics</h2>
          <p>{selectedClass} Performance Leaderboard</p>
        </div>
        <button className="btn btn-outline" style={{width: 'auto'}} onClick={onCancel}><X size={18} /> Back</button>
      </div>

      {loading ? <p>Calculating statistics...</p> : (
        <div style={{width: '100%', maxWidth: '1000px'}}>
          {students.length === 0 ? (
            <div className="auth-card" style={{textAlign: 'center'}}><p>No student data found for {selectedClass}.</p></div>
          ) : (
            <div style={{display: 'grid', gap: '1.5rem'}}>
              {students.map((s, index) => (
                <div key={s.id} className="auth-card" style={{padding: '1.5rem'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                      <span style={{fontSize: '2rem', fontWeight: 900, color: index === 0 ? 'var(--warning)' : 'var(--text-secondary)'}}>#{index + 1}</span>
                      <div>
                        <h3 style={{margin: 0}}>{s.full_name}</h3>
                        {s.display_name && <span style={{fontSize: '0.8rem', opacity: 0.6}}>{s.display_name}</span>}
                      </div>
                    </div>
                    <div style={{fontSize: '2rem', fontWeight: 800, color: 'var(--primary)'}}>{s.totalScore} PTS</div>
                  </div>
                  
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem'}}>
                    <div className="stat-card" style={{background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', textAlign: 'center'}}>
                      <div style={{fontSize: '0.7rem', opacity: 0.6, marginBottom: '0.5rem'}}>GAMES</div>
                      <div style={{fontSize: '1.2rem', fontWeight: 700}}>{s.gamesPlayed}</div>
                    </div>
                    <div className="stat-card" style={{background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', textAlign: 'center'}}>
                      <div style={{fontSize: '0.7rem', opacity: 0.6, marginBottom: '0.5rem'}}>ACCURACY</div>
                      <div style={{fontSize: '1.2rem', fontWeight: 700, color: 'var(--success)'}}>{s.accuracy}%</div>
                    </div>
                    <div className="stat-card" style={{background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', textAlign: 'center'}}>
                      <div style={{fontSize: '0.7rem', opacity: 0.6, marginBottom: '0.5rem'}}>AVG SPEED</div>
                      <div style={{fontSize: '1.2rem', fontWeight: 700}}>{s.avgSpeed}s</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClassProgress;
