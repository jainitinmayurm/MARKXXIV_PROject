import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import { format } from 'date-fns';

export default function MeetingDetail() {
  const { id } = useParams();
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMeeting();
  }, [id]);

  const fetchMeeting = async () => {
    const res = await fetch(`/api/meetings/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      setMeeting(await res.json());
    } else {
      setError('Meeting not found');
    }
  };

  const handleCancel = async () => {
    try {
      const res = await fetch(`/api/meetings/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        navigate('/dashboard');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to cancel meeting');
      }
    } catch (err) {
      setError('An error occurred while cancelling');
    }
  };

  if (error) return <div className="text-danger p-4">{error}</div>;
  if (!meeting) return <div>Loading...</div>;

  const isOrganizer = meeting.organizer_id === user.id;
  const canModify = (isOrganizer || user.role === 'admin') && meeting.status !== 'Cancelled';

  return (
    <div className="card max-w-3xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">{meeting.title}</h2>
          <div className="flex gap-2 items-center">
            <span className={`badge badge-${meeting.status}`}>{meeting.status}</span>
            <span className={`badge badge-${meeting.type}`}>{meeting.type}</span>
          </div>
        </div>
        {canModify && (
          <button className="btn btn-danger" onClick={handleCancel}>Cancel Meeting</button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-lg font-bold mb-2">Details</h3>
          <p className="text-secondary mb-1"><strong>When:</strong> {format(new Date(meeting.start_time), 'PPp')} to {format(new Date(meeting.end_time), 'p')}</p>
          <p className="text-secondary mb-1"><strong>Where:</strong> {meeting.type === 'online' ? <a href={meeting.online_link} target="_blank" rel="noreferrer">{meeting.online_link || 'TBD'}</a> : `Room ID: ${meeting.room_id}`}</p>
          <div className="mt-4">
            <strong>Agenda:</strong>
            <p className="mt-1 bg-black bg-opacity-20 p-3 rounded">{meeting.agenda || 'No agenda provided'}</p>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-bold mb-2">Participants</h3>
          <div className="flex flex-col gap-2">
            {meeting.participants && meeting.participants.map(p => (
              <div key={p.user_id} className="flex justify-between items-center p-2 border border-white border-opacity-10 rounded">
                <span>{p.name}</span>
                <span className={`text-sm ${p.response === 'Accepted' ? 'text-success' : p.response === 'Declined' ? 'text-danger' : 'text-secondary'}`} style={{color: p.response === 'Accepted' ? 'var(--success)' : p.response === 'Declined' ? 'var(--danger)' : 'var(--text-secondary)'}}>
                  {p.response}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <button className="btn btn-outline" onClick={() => navigate(-1)}>Back</button>
    </div>
  );
}
