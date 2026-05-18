import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { format, addMinutes, setHours, setMinutes, isBefore } from 'date-fns';

export default function CreateMeeting() {
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  
  const [title, setTitle] = useState('');
  const [agenda, setAgenda] = useState('');
  const [type, setType] = useState('online');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [duration, setDuration] = useState(30);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [onlineLink, setOnlineLink] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchRooms();
  }, []);

  const fetchUsers = async () => {
    const res = await fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) setUsers((await res.json()).filter(u => u.id !== user.id));
  };

  const fetchRooms = async () => {
    const res = await fetch('/api/rooms', { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) setRooms(await res.json());
  };

  const toggleParticipant = (id) => {
    if (selectedParticipants.includes(id)) {
      setSelectedParticipants(selectedParticipants.filter(p => p !== id));
    } else {
      setSelectedParticipants([...selectedParticipants, id]);
    }
  };

  const findSlots = async () => {
    setError('');
    if (selectedParticipants.length === 0) {
      setError('Select at least one participant');
      return;
    }
    const partQuery = [user.id, ...selectedParticipants].join(',');
    const res = await fetch(`/api/availability?participants=${partQuery}&date=${date}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return;
    const existingMeetings = await res.json();

    const possibleSlots = [];
    let curr = setMinutes(setHours(new Date(date), 9), 0);
    const endOfDay = setMinutes(setHours(new Date(date), 18), 0);
    const now = new Date();

    while (isBefore(curr, endOfDay)) {
      const slotEnd = addMinutes(curr, duration);
      if (isBefore(curr, now)) {
        curr = addMinutes(curr, 30);
        continue;
      }
      const isConflict = existingMeetings.some(m => {
        const mStart = new Date(m.start_time);
        const mEnd = new Date(m.end_time);
        return (curr < mEnd && slotEnd > mStart);
      });
      if (!isConflict) {
        possibleSlots.push({ start: curr, end: slotEnd });
      }
      curr = addMinutes(curr, 30);
    }
    setSlots(possibleSlots);
    setSelectedSlot(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSlot) return setError('Please select a time slot');
    if (type === 'offline' && !selectedRoom) return setError('Please select a room');

    const body = {
      title, agenda, type,
      start_time: selectedSlot.start.toISOString(),
      end_time: selectedSlot.end.toISOString(),
      room_id: type === 'offline' ? selectedRoom : null,
      online_link: type === 'online' ? onlineLink : null,
      participants: selectedParticipants
    };

    const res = await fetch('/api/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (res.ok) {
      navigate('/dashboard');
    } else {
      setError(data.error);
    }
  };

  return (
    <div className="card max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Create New Meeting</h2>
      {error && <div className="mb-4 text-danger" style={{ color: 'var(--danger)' }}>{error}</div>}
      
      <div className="grid grid-cols-2 gap-6">
        <div>
          <form className="flex flex-col gap-4">
            <div>
              <label>Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} required minLength={3} />
            </div>
            <div>
              <label>Agenda</label>
              <textarea value={agenda} onChange={e => setAgenda(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label>Type</label>
                <select value={type} onChange={e => setType(e.target.value)}>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                </select>
              </div>
              {type === 'online' ? (
                <div>
                  <label>Meeting Link</label>
                  <input type="url" value={onlineLink} onChange={e => setOnlineLink(e.target.value)} />
                </div>
              ) : (
                <div>
                  <label>Room</label>
                  <select value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)}>
                    <option value="">Select Room</option>
                    {rooms.filter(r => r.capacity >= selectedParticipants.length + 1).map(r => (
                      <option key={r.id} value={r.id}>{r.name} (Cap: {r.capacity})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label>Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} min={format(new Date(), 'yyyy-MM-dd')} />
              </div>
              <div>
                <label>Duration (minutes)</label>
                <select value={duration} onChange={e => setDuration(Number(e.target.value))}>
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                  <option value={45}>45</option>
                  <option value={60}>60</option>
                  <option value={90}>90</option>
                  <option value={120}>120</option>
                </select>
              </div>
            </div>
            <div>
              <label>Participants</label>
              <div className="participant-list mt-2">
                {users.map(u => (
                  <label key={u.id} className="participant-item">
                    <input type="checkbox" checked={selectedParticipants.includes(u.id)} onChange={() => toggleParticipant(u.id)} />
                    {u.name} ({u.email})
                  </label>
                ))}
              </div>
            </div>
          </form>
        </div>
        
        <div>
          <button className="btn w-full mb-4" onClick={findSlots}>Find Available Slots</button>
          <div className="grid grid-cols-3 gap-2">
            {slots.map((s, idx) => (
              <div 
                key={idx} 
                className={`slot ${selectedSlot === s ? 'selected' : ''}`}
                onClick={() => setSelectedSlot(s)}
              >
                {format(s.start, 'HH:mm')} - {format(s.end, 'HH:mm')}
              </div>
            ))}
            {slots.length === 0 && <div className="col-span-3 text-center text-secondary py-4">No slots found or not searched yet.</div>}
          </div>

          <button className="btn mt-8 w-full" onClick={handleSubmit}>Schedule Meeting</button>
        </div>
      </div>
    </div>
  );
}
