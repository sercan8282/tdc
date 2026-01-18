import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface SecurityEvent {
  id: number;
  event_type: string;
  event_type_display: string;
  severity: string;
  severity_display: string;
  ip_address: string;
  user_agent: string;
  user_email: string | null;
  endpoint: string;
  method: string;
  details: any;
  timestamp: string;
}

interface DashboardStats {
  total_events_today: number;
  failed_logins_today: number;
  blocked_ips_count: number;
  critical_events_today: number;
  recent_attacks: any[];
  top_blocked_ips: any[];
  event_types_breakdown: Record<string, number>;
}

export default function SecurityDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    fetchDashboard();
    fetchRecentEvents();
  }, [filterSeverity, filterType]);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('http://localhost:8000/api/security-events/dashboard/', {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    }
  };

  const fetchRecentEvents = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams();
      if (filterSeverity) params.append('severity', filterSeverity);
      if (filterType) params.append('event_type', filterType);
      
      const res = await fetch(`http://localhost:8000/api/security-events/?${params}`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setRecentEvents(data.results || data);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return <div className="p-6">Loading security dashboard...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Security Dashboard</h1>
        <button
          onClick={() => navigate('/admin/security/ip-blocks')}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Manage Blocked IPs
        </button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm text-gray-600 mb-2">Events Today</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.total_events_today}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm text-gray-600 mb-2">Failed Logins</h3>
            <p className="text-3xl font-bold text-orange-600">{stats.failed_logins_today}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm text-gray-600 mb-2">Blocked IPs</h3>
            <p className="text-3xl font-bold text-red-600">{stats.blocked_ips_count}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm text-gray-600 mb-2">Critical Events</h3>
            <p className="text-3xl font-bold text-red-700">{stats.critical_events_today}</p>
          </div>
        </div>
      )}

      {/* Recent Attacks */}
      {stats && stats.recent_attacks.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-6">
          <h3 className="text-lg font-bold text-red-800 mb-2">⚠️ Recent Attacks Detected</h3>
          <div className="space-y-2">
            {stats.recent_attacks.map((attack, idx) => (
              <div key={idx} className="text-sm text-red-700">
                <span className="font-semibold">{attack.event_type}</span> from{' '}
                <span className="font-mono">{attack.ip_address}</span> at{' '}
                {new Date(attack.timestamp).toLocaleString()}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Severity</label>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Event Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">All Types</option>
              <option value="login_fail">Failed Login</option>
              <option value="brute_force">Brute Force</option>
              <option value="ddos">DDoS</option>
              <option value="rate_limit">Rate Limit</option>
              <option value="ip_blocked">IP Blocked</option>
            </select>
          </div>
        </div>
      </div>

      {/* Recent Events Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Recent Security Events</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Endpoint</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {new Date(event.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getSeverityColor(event.severity)}`}>
                      {event.severity_display}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {event.event_type_display}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                    {event.ip_address}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {event.endpoint || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {event.user_email && <div>User: {event.user_email}</div>}
                    {event.details && Object.keys(event.details).length > 0 && (
                      <div className="text-xs text-gray-600">
                        {JSON.stringify(event.details)}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
