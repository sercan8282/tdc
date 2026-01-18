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
      const res = await fetch('http://localhost:8000/api/ip-blocks/', {
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
      const res = await fetch(`http://localhost:8000/api/ip-blocks/${id}/unblock/`, {
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
      const res = await fetch('http://localhost:8000/api/ip-blocks/', {
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
        <h1 className="text-3xl font-bold">IP Block Management</h1>
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
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm text-gray-600 mb-2">Total Blocked</h3>
          <p className="text-3xl font-bold text-red-600">{blocks.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm text-gray-600 mb-2">Active Blocks</h3>
          <p className="text-3xl font-bold text-orange-600">
            {blocks.filter(b => b.is_currently_blocked).length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm text-gray-600 mb-2">Permanent Blocks</h3>
          <p className="text-3xl font-bold text-gray-600">
            {blocks.filter(b => b.is_permanent).length}
          </p>
        </div>
      </div>

      {/* IP Blocks Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Blocked IP Addresses</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Blocked At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attempts</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {blocks.map((block) => (
                <tr key={block.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                    {block.ip_address}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div>{block.reason_display}</div>
                    {block.details && (
                      <div className="text-xs text-gray-600">{block.details}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {new Date(block.blocked_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {block.is_permanent ? (
                      <span className="text-red-600 font-semibold">Permanent</span>
                    ) : block.blocked_until ? (
                      new Date(block.blocked_until).toLocaleString()
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Block IP Address</h2>
            <form onSubmit={handleAddBlock} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">IP Address</label>
                <input
                  type="text"
                  value={newBlock.ip_address}
                  onChange={(e) => setNewBlock({ ...newBlock, ip_address: e.target.value })}
                  placeholder="192.168.1.1"
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Reason</label>
                <select
                  value={newBlock.reason}
                  onChange={(e) => setNewBlock({ ...newBlock, reason: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="manual">Manual - Admin Action</option>
                  <option value="brute_force">Brute Force Attack</option>
                  <option value="ddos">DDoS Attack</option>
                  <option value="suspicious">Suspicious Activity</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Details</label>
                <textarea
                  value={newBlock.details}
                  onChange={(e) => setNewBlock({ ...newBlock, details: e.target.value })}
                  placeholder="Optional description..."
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                />
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={newBlock.is_permanent}
                    onChange={(e) => setNewBlock({ ...newBlock, is_permanent: e.target.checked })}
                  />
                  <span className="text-sm font-medium">Permanent Block</span>
                </label>
              </div>
              {!newBlock.is_permanent && (
                <div>
                  <label className="block text-sm font-medium mb-2">Duration (hours)</label>
                  <input
                    type="number"
                    value={newBlock.duration_hours}
                    onChange={(e) => setNewBlock({ ...newBlock, duration_hours: parseInt(e.target.value) })}
                    min="1"
                    max="8760"
                    className="w-full border rounded px-3 py-2"
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
