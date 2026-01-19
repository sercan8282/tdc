import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Shield, ShieldAlert, Ban, CheckCircle, XCircle, Calendar, UserPlus, X, Eye, EyeOff } from 'lucide-react';

interface User {
  id: number;
  email: string;
  nickname: string;
  is_staff: boolean;
  is_superuser: boolean;
  is_active: boolean;
  is_blocked: boolean;
  banned_until: string | null;
  created_at: string;
}

interface BanModalData {
  userId: number;
  nickname: string;
}

interface NewUserForm {
  email: string;
  nickname: string;
  password: string;
  is_staff: boolean;
  is_verified: boolean;
}

export default function UserManagement() {
  const { user: currentUser, token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [banModal, setBanModal] = useState<BanModalData | null>(null);
  const [banDays, setBanDays] = useState('7');
  const [message, setMessage] = useState('');
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newUserForm, setNewUserForm] = useState<NewUserForm>({
    email: '',
    nickname: '',
    password: '',
    is_staff: false,
    is_verified: true,
  });
  const [newUserError, setNewUserError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users/?page_size=100', {
        headers: { 'Authorization': `Token ${token}` },
      });
      const data = await res.json();
      setUsers(data.results || data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const handlePromoteToSuperuser = async (userId: number) => {
    try {
      const res = await fetch(`/api/users/${userId}/promote_to_superuser/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}` },
      });
      
      if (res.ok) {
        showMessage('User promoted to superuser');
        fetchUsers();
      } else {
        const error = await res.json();
        showMessage(error.error || 'Failed to promote user');
      }
    } catch (error) {
      showMessage('Failed to promote user');
    }
  };

  const handleDemoteFromSuperuser = async (userId: number) => {
    try {
      const res = await fetch(`/api/users/${userId}/demote_from_superuser/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}` },
      });
      
      if (res.ok) {
        showMessage('User demoted from superuser');
        fetchUsers();
      } else {
        const error = await res.json();
        showMessage(error.error || 'Failed to demote user');
      }
    } catch (error) {
      showMessage('Failed to demote user');
    }
  };

  const handleBanUser = async () => {
    if (!banModal) return;

    try {
      const res = await fetch(`/api/users/${banModal.userId}/ban_user/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ days: parseInt(banDays) }),
      });
      
      if (res.ok) {
        showMessage(`User banned for ${banDays} days`);
        setBanModal(null);
        setBanDays('7');
        fetchUsers();
      } else {
        const error = await res.json();
        showMessage(error.error || 'Failed to ban user');
      }
    } catch (error) {
      showMessage('Failed to ban user');
    }
  };

  const handleUnbanUser = async (userId: number) => {
    try {
      const res = await fetch(`/api/users/${userId}/unban_user/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}` },
      });
      
      if (res.ok) {
        showMessage('User unbanned');
        fetchUsers();
      } else {
        const error = await res.json();
        showMessage(error.error || 'Failed to unban user');
      }
    } catch (error) {
      showMessage('Failed to unban user');
    }
  };

  const handleDeactivate = async (userId: number) => {
    try {
      const res = await fetch(`/api/users/${userId}/deactivate_user/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}` },
      });
      
      if (res.ok) {
        showMessage('User deactivated');
        fetchUsers();
      } else {
        showMessage('Failed to deactivate user');
      }
    } catch (error) {
      showMessage('Failed to deactivate user');
    }
  };

  const handleActivate = async (userId: number) => {
    try {
      const res = await fetch(`/api/users/${userId}/activate_user/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}` },
      });
      
      if (res.ok) {
        showMessage('User activated');
        fetchUsers();
      } else {
        showMessage('Failed to activate user');
      }
    } catch (error) {
      showMessage('Failed to activate user');
    }
  };

  const handleMakeStaff = async (userId: number) => {
    try {
      const res = await fetch(`/api/users/${userId}/make_staff/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}` },
      });
      
      if (res.ok) {
        showMessage('User promoted to staff');
        fetchUsers();
      } else {
        showMessage('Failed to promote user');
      }
    } catch (error) {
      showMessage('Failed to promote user');
    }
  };

  const handleRemoveStaff = async (userId: number) => {
    try {
      const res = await fetch(`/api/users/${userId}/remove_staff/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}` },
      });
      
      if (res.ok) {
        showMessage('Staff privileges removed');
        fetchUsers();
      } else {
        showMessage('Failed to remove staff privileges');
      }
    } catch (error) {
      showMessage('Failed to remove staff privileges');
    }
  };

  const handleCreateUser = async () => {
    setNewUserError('');
    
    // Validation
    if (!newUserForm.email) {
      setNewUserError('Email is required');
      return;
    }
    if (!newUserForm.nickname) {
      setNewUserError('Nickname is required');
      return;
    }
    if (!newUserForm.password) {
      setNewUserError('Password is required');
      return;
    }
    if (newUserForm.password.length < 8) {
      setNewUserError('Password must be at least 8 characters');
      return;
    }

    try {
      const res = await fetch('/api/users/create_user/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUserForm),
      });

      const data = await res.json();

      if (res.ok) {
        showMessage(`User "${newUserForm.nickname}" created successfully`);
        setShowNewUserModal(false);
        setNewUserForm({
          email: '',
          nickname: '',
          password: '',
          is_staff: false,
          is_verified: true,
        });
        fetchUsers();
      } else {
        setNewUserError(data.error || 'Failed to create user');
      }
    } catch (error) {
      setNewUserError('Failed to create user');
    }
  };

  const isBanned = (user: User) => {
    if (!user.banned_until) return false;
    return new Date(user.banned_until) > new Date();
  };

  const canManageUser = (targetUser: User) => {
    // Superusers can't be managed by non-superusers
    if (targetUser.is_superuser && !currentUser?.is_superuser) {
      return false;
    }
    return true;
  };

  if (!currentUser?.is_staff) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-red-400 mb-2">Access Denied</h2>
            <p className="text-slate-300">Only staff members can access user management.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-slate-400">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 px-4 pb-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-8 h-8 text-blue-400" />
              <h1 className="text-3xl font-bold text-white">User Management</h1>
            </div>
            <p className="text-slate-400">Manage user roles, permissions, and bans</p>
          </div>
          <button
            onClick={() => setShowNewUserModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition"
          >
            <UserPlus className="w-5 h-5" />
            New User
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-300">
            {message}
          </div>
        )}

        {/* Users Table */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">User</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Status</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-700/30 transition">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-white">{user.nickname}</div>
                        <div className="text-sm text-slate-400">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {user.is_superuser && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 border border-red-500/30 rounded text-xs text-red-300">
                            <ShieldAlert className="w-3 h-3" />
                            Superuser
                          </span>
                        )}
                        {user.is_staff && !user.is_superuser && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-xs text-blue-300">
                            <Shield className="w-3 h-3" />
                            Staff
                          </span>
                        )}
                        {!user.is_staff && !user.is_superuser && (
                          <span className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-400">
                            User
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {!user.is_active && (
                          <span className="inline-flex items-center gap-1 text-xs text-red-400">
                            <XCircle className="w-3 h-3" />
                            Deactivated
                          </span>
                        )}
                        {isBanned(user) && (
                          <span className="inline-flex items-center gap-1 text-xs text-orange-400">
                            <Ban className="w-3 h-3" />
                            Banned until {new Date(user.banned_until!).toLocaleDateString()}
                          </span>
                        )}
                        {user.is_active && !isBanned(user) && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-400">
                            <CheckCircle className="w-3 h-3" />
                            Active
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.id !== currentUser?.id && canManageUser(user) && (
                        <div className="flex gap-2 justify-end">
                          {/* Promote/Demote Superuser (only for superusers) */}
                          {currentUser?.is_superuser && (
                            <>
                              {!user.is_superuser ? (
                                <button
                                  onClick={() => handlePromoteToSuperuser(user.id)}
                                  className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 text-xs rounded transition"
                                  title="Promote to Superuser"
                                >
                                  Make Superuser
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleDemoteFromSuperuser(user.id)}
                                  className="px-3 py-1 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 text-orange-300 text-xs rounded transition"
                                  title="Demote from Superuser"
                                >
                                  Remove Superuser
                                </button>
                              )}
                            </>
                          )}

                          {/* Make/Remove Staff */}
                          {!user.is_superuser && (
                            <>
                              {!user.is_staff ? (
                                <button
                                  onClick={() => handleMakeStaff(user.id)}
                                  className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs rounded transition"
                                  title="Make Staff"
                                >
                                  Make Staff
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleRemoveStaff(user.id)}
                                  className="px-3 py-1 bg-slate-600/20 hover:bg-slate-600/30 border border-slate-500/30 text-slate-300 text-xs rounded transition"
                                  title="Remove Staff"
                                >
                                  Remove Staff
                                </button>
                              )}
                            </>
                          )}

                          {/* Ban/Unban */}
                          {isBanned(user) ? (
                            <button
                              onClick={() => handleUnbanUser(user.id)}
                              className="px-3 py-1 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-300 text-xs rounded transition"
                              title="Unban User"
                            >
                              Unban
                            </button>
                          ) : (
                            <button
                              onClick={() => setBanModal({ userId: user.id, nickname: user.nickname })}
                              className="px-3 py-1 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 text-orange-300 text-xs rounded transition"
                              title="Ban User"
                            >
                              Ban
                            </button>
                          )}

                          {/* Activate/Deactivate */}
                          {user.is_active ? (
                            <button
                              onClick={() => handleDeactivate(user.id)}
                              className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 text-xs rounded transition"
                              title="Deactivate User"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivate(user.id)}
                              className="px-3 py-1 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-300 text-xs rounded transition"
                              title="Activate User"
                            >
                              Activate
                            </button>
                          )}
                        </div>
                      )}
                      {user.id === currentUser?.id && (
                        <span className="text-xs text-slate-500 text-right block">You</span>
                      )}
                      {!canManageUser(user) && user.id !== currentUser?.id && (
                        <span className="text-xs text-slate-500 text-right block">Protected</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ban Modal */}
        {banModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-6 h-6 text-orange-400" />
                <h3 className="text-xl font-bold text-white">Ban User</h3>
              </div>
              
              <p className="text-slate-300 mb-4">
                How many days should <span className="font-semibold text-white">{banModal.nickname}</span> be banned?
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Number of days
                </label>
                <input
                  type="number"
                  min="1"
                  value={banDays}
                  onChange={(e) => setBanDays(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleBanUser}
                  className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition"
                >
                  Ban User
                </button>
                <button
                  onClick={() => {
                    setBanModal(null);
                    setBanDays('7');
                  }}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* New User Modal */}
        {showNewUserModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <UserPlus className="w-6 h-6 text-green-400" />
                  <h3 className="text-xl font-bold text-white">Create New User</h3>
                </div>
                <button
                  onClick={() => {
                    setShowNewUserModal(false);
                    setNewUserError('');
                    setNewUserForm({
                      email: '',
                      nickname: '',
                      password: '',
                      is_staff: false,
                      is_verified: true,
                    });
                  }}
                  className="text-slate-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {newUserError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
                  {newUserError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-green-500"
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nickname *
                  </label>
                  <input
                    type="text"
                    value={newUserForm.nickname}
                    onChange={(e) => setNewUserForm({ ...newUserForm, nickname: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-green-500"
                    placeholder="Enter nickname"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newUserForm.password}
                      onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                      className="w-full px-4 py-2 pr-10 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-green-500"
                      placeholder="Min. 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newUserForm.is_verified}
                      onChange={(e) => setNewUserForm({ ...newUserForm, is_verified: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-green-500 focus:ring-green-500"
                    />
                    <span className="text-sm text-slate-300">Verified</span>
                  </label>

                  {currentUser?.is_superuser && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newUserForm.is_staff}
                        onChange={(e) => setNewUserForm({ ...newUserForm, is_staff: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-300">Staff</span>
                    </label>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCreateUser}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition"
                >
                  Create User
                </button>
                <button
                  onClick={() => {
                    setShowNewUserModal(false);
                    setNewUserError('');
                    setNewUserForm({
                      email: '',
                      nickname: '',
                      password: '',
                      is_staff: false,
                      is_verified: true,
                    });
                  }}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
