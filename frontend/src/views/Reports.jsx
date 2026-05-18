import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../AuthContext';

export default function Reports() {
  const { token } = useContext(AuthContext);
  const [stats, setStats] = useState({ total: 0, cancelled: 0, online: 0, offline: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const res = await fetch('/api/reports', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setStats(await res.json());
    };
    fetchStats();
  }, [token]);

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">System Reports</h2>
      <div className="grid grid-cols-4 gap-6">
        <div className="card text-center">
          <h3 className="text-secondary text-sm font-bold uppercase tracking-wider mb-2">Total Meetings</h3>
          <div className="text-4xl font-bold">{stats.total}</div>
        </div>
        <div className="card text-center">
          <h3 className="text-secondary text-sm font-bold uppercase tracking-wider mb-2">Cancelled</h3>
          <div className="text-4xl font-bold text-danger" style={{ color: 'var(--danger)' }}>{stats.cancelled}</div>
        </div>
        <div className="card text-center">
          <h3 className="text-secondary text-sm font-bold uppercase tracking-wider mb-2">Online</h3>
          <div className="text-4xl font-bold text-accent" style={{ color: 'var(--accent)' }}>{stats.online}</div>
        </div>
        <div className="card text-center">
          <h3 className="text-secondary text-sm font-bold uppercase tracking-wider mb-2">Offline</h3>
          <div className="text-4xl font-bold" style={{ color: '#8b5cf6' }}>{stats.offline}</div>
        </div>
      </div>
    </div>
  );
}
