import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { format, isFuture } from 'date-fns';

export default function MyMeetings() {
  const { token } = useContext(AuthContext);
  const [meetings, setMeetings] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMeetings = async () => {
      const res = await fetch('/api/meetings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setMeetings(await res.json());
    };
    fetchMeetings();
  }, [token]);

  const upcoming = meetings.filter(m => isFuture(new Date(m.start_time)) && m.status !== 'Cancelled');
  const past = meetings.filter(m => !isFuture(new Date(m.start_time)) || m.status === 'Cancelled');

  const MeetingList = ({ title, list }) => (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      {list.length === 0 ? <p className="text-secondary">No meetings found.</p> : (
        <div className="flex flex-col gap-3">
          {list.map(m => (
            <div key={m.id} className="card flex justify-between items-center cursor-pointer hover:bg-opacity-80" onClick={() => navigate(`/meeting/${m.id}`)}>
              <div>
                <h3 className="font-bold text-lg">{m.title}</h3>
                <p className="text-sm text-secondary">{format(new Date(m.start_time), 'PPp')} - {format(new Date(m.end_time), 'p')}</p>
              </div>
              <div className="flex gap-2">
                <span className={`badge badge-${m.status}`}>{m.status}</span>
                <span className={`badge badge-${m.type}`}>{m.type}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">My Meetings</h1>
      <MeetingList title="Upcoming Meetings" list={upcoming} />
      <MeetingList title="Past & Cancelled Meetings" list={past} />
    </div>
  );
}
