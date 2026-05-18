import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../AuthContext';

export default function MeetingRooms() {
  const { token } = useContext(AuthContext);
  const [rooms, setRooms] = useState([]);
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [equipment, setEquipment] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    const res = await fetch('/api/rooms', { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) setRooms(await res.json());
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name, capacity: parseInt(capacity), equipment, location })
    });
    if (res.ok) {
      setName(''); setCapacity(''); setEquipment(''); setLocation('');
      fetchRooms();
    }
  };

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-2 gap-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Manage Rooms</h2>
        <div className="flex flex-col gap-3">
          {rooms.map(r => (
            <div key={r.id} className="card">
              <h3 className="font-bold text-lg">{r.name} <span className="text-sm font-normal text-secondary ml-2">Cap: {r.capacity}</span></h3>
              <p className="text-sm text-secondary">Loc: {r.location || 'N/A'}</p>
              <p className="text-sm text-secondary">Eq: {r.equipment || 'N/A'}</p>
            </div>
          ))}
          {rooms.length === 0 && <p className="text-secondary">No rooms configured.</p>}
        </div>
      </div>
      
      <div>
        <div className="card">
          <h3 className="text-xl font-bold mb-4">Add New Room</h3>
          <form onSubmit={handleAdd} className="flex flex-col gap-4">
            <div>
              <label>Room Name</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label>Capacity</label>
              <input type="number" required min="1" value={capacity} onChange={e => setCapacity(e.target.value)} />
            </div>
            <div>
              <label>Location</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} />
            </div>
            <div>
              <label>Equipment</label>
              <input type="text" placeholder="Projector, Whiteboard..." value={equipment} onChange={e => setEquipment(e.target.value)} />
            </div>
            <button type="submit" className="btn mt-2">Add Room</button>
          </form>
        </div>
      </div>
    </div>
  );
}
