import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, addMonths, subMonths, isSameMonth } from 'date-fns';

export default function Dashboard() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [meetings, setMeetings] = useState([]);
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMeetings();
  }, [currentDate]);

  const fetchMeetings = async () => {
    const from = startOfWeek(startOfMonth(currentDate)).toISOString();
    const to = endOfWeek(endOfMonth(currentDate)).toISOString();
    try {
      const res = await fetch(`/api/calendar?from=${from}&to=${to}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMeetings(data);
      }
    } catch (err) {}
  };

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate)),
    end: endOfWeek(endOfMonth(currentDate))
  });

  const todayMeetings = meetings.filter(m => isSameDay(new Date(m.start_time), currentDate));

  return (
    <div className="flex gap-8">
      <div className="flex-1">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Calendar</h1>
          <div className="flex gap-2">
            <button className="btn btn-outline" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>&lt;</button>
            <span className="text-xl font-bold py-1 px-4 min-w-[200px] text-center">{format(currentDate, 'MMMM yyyy')}</span>
            <button className="btn btn-outline" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>&gt;</button>
          </div>
          <button className="btn" onClick={() => navigate('/create')}>+ New Meeting</button>
        </div>

        <div className="card">
          <div className="grid grid-cols-7 gap-1 mb-2 text-center font-bold text-secondary text-sm tracking-wider uppercase">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map(day => {
              const dayMeetings = meetings.filter(m => isSameDay(new Date(m.start_time), day));
              return (
                <div key={day.toISOString()} className={`calendar-day ${!isSameMonth(day, currentDate) ? 'opacity-50' : ''}`}>
                  <div className="calendar-day-header">{format(day, 'd')}</div>
                  {dayMeetings.map(m => (
                    <div key={m.id} className={`calendar-event ${m.type}`} onClick={() => navigate(`/meeting/${m.id}`)}>
                      {format(new Date(m.start_time), 'HH:mm')} {m.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      <div className="w-80 flex flex-col gap-4">
        <div className="card glass h-full">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent inline-block"></span>
            Schedule for {format(currentDate, 'MMM d')}
          </h2>
          
          {todayMeetings.length === 0 ? (
            <p className="text-secondary text-sm">No meetings scheduled for this day.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {todayMeetings.map(m => (
                <div key={m.id} className="p-3 border border-white border-opacity-10 rounded bg-black bg-opacity-20 hover:bg-opacity-40 transition-all cursor-pointer" onClick={() => navigate(`/meeting/${m.id}`)}>
                  <div className="font-bold text-sm mb-1">{m.title}</div>
                  <div className="text-xs text-secondary mb-2">{format(new Date(m.start_time), 'HH:mm')} - {format(new Date(m.end_time), 'HH:mm')}</div>
                  <span className={`badge badge-${m.type}`}>{m.type}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
