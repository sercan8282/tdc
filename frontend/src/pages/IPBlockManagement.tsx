import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface IPBlock {
  id: number;
  ip_address: string;
  reason: string;
  reason_display: string;
  details: string;
  blocked_at: string;
  blocked_until: string | null;
  is_permanent: boolean;
  blocked_by_email: string | null;
  attempt_count: number;
  last_attempt: string;
  is_currently_blocked: boolean;
}

export default function IPBlockManagement() {
  const navigate = useNavigate();
  const [blocks, setBlocks] = useState<IPBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBlock, setNewBlock] = useState({
    ip_address: '',
    reason: 'manual',
    details: '',
    duration_hours: 24,
    is_permanent: false,
  });

  useEffect(() => {
    fetchBlocks();
  }, []);

  const fetchBlocks = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/ip-blocks/', {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setBlocks(data.results || data);
      }
    } catch (error) {
      console.error('Error fetching IP blocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (id: number, ip: string) => {
    if (!confirm(`Are you sure you want to unblock ${ip}?`)) return;

    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/ip-blocks/${id}/unblock/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (res.ok) {
        alert(`IP ${ip} has been unblocked`);
        fetchBlocks();
      }
    } catch (error) {
      console.error('Error unblocking IP:', error);
      alert('Failed to unblock IP');
    }
  };

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/ip-blocks/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newBlock),
      });

      if (res.ok) {
        alert('IP address blocked successfully');
        setShowAddModal(false);
        setNewBlock({
          ip_address: '',
          reason: 'manual',
          details: '',
          duration_hours: 24,
          is_permanent: false,
        });
        fetchBlocks();
      } else {
        const error = await res.json();
        alert(`Failed to block IP: ${JSON.stringify(error)}`);
      }
    } catch (error) {
      console.error('Error blocking IP:', error);
      alert('Failed to block IP');
    }
  };

  if (loading) {
    return <div className="p-6">Loading IP blocks...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">IP Block Management</h1>
        <div className="space-x-4">
          <button
            onClick={() => navigate('/admin/security')}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            ← Back to Dashboard
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Block IP Address
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg shadow">
          <h3 className="text-sm text-gray-400 mb-2">Total Blocked</h3>
          <p className="text-3xl font-bold text-red-400">{blocks.length}</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg shadow">
          <h3 className="text-sm text-gray-400 mb-2">Active Blocks</h3>
          <p className="text-3xl font-bold text-orange-400">
            {blocks.filter(b => b.is_currently_blocked).length}
          </p>
        </div>
        <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg shadow">
          <h3 className="text-sm text-gray-400 mb-2">Permanent Blocks</h3>
          <p className="text-3xl font-bold text-gray-300">
            {blocks.filter(b => b.is_permanent).length}
          </p>
        </div>
      </div>

      {/* IP Blocks Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Blocked IP Addresses</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">IP Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Blocked At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Expires</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Attempts</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {blocks.map((block) => (
                <tr key={block.id} className="hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-300">
                    {block.ip_address}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    <div>{block.reason_display}</div>
                    {block.details && (
                      <div className="text-xs text-gray-400">{block.details}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {new Date(block.blocked_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {block.is_permanent ? (
                      <span className="text-red-400 font-semibold">Permanent</span>
                    ) : block.blocked_until ? (
                      new Date(block.blocked_until).toLocaleString()
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {block.attempt_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {block.is_currently_blocked ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-600">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-600">
                        Expired
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleUnblock(block.id, block.ip_address)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Unblock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Block Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-white mb-4">Block IP Address</h2>
            <form onSubmit={handleAddBlock} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">IP Address</label>
                <input
                  type="text"
                  value={newBlock.ip_address}
                  onChange={(e) => setNewBlock({ ...newBlock, ip_address: e.target.value })}
                  placeholder="192.168.1.1"
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Reason</label>
                <select
                  value={newBlock.reason}
                  onChange={(e) => setNewBlock({ ...newBlock, reason: e.target.value })}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="manual">Manual - Admin Action</option>
                  <option value="brute_force">Brute Force Attack</option>
                  <option value="ddos">DDoS Attack</option>
                  <option value="suspicious">Suspicious Activity</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Details</label>
                <textarea
                  value={newBlock.details}
                  onChange={(e) => setNewBlock({ ...newBlock, details: e.target.value })}
                  placeholder="Optional description..."
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={newBlock.is_permanent}
                    onChange={(e) => setNewBlock({ ...newBlock, is_permanent: e.target.checked })}
                    className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-300">Permanent Block</span>
                </label>
              </div>
              {!newBlock.is_permanent && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Duration (hours)</label>
                  <input
                    type="number"
                    value={newBlock.duration_hours}
                    onChange={(e) => setNewBlock({ ...newBlock, duration_hours: parseInt(e.target.value) })}
                    min="1"
                    max="8760"
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700"
                >
                  Block IP
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
