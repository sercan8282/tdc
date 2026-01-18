import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Loader, Shield, Mail, Lock } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password, mfaRequired ? mfaCode : undefined);
      
      // Check if MFA is required
      if (result?.mfa_required) {
        setMfaRequired(true);
        setLoading(false);
        return;
      }
      
      // Check if MFA setup is required
      if (result?.mfa_setup_required) {
        navigate('/mfa-setup');
      } else {
        navigate('/');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Invalid email or password');
      }
      // Reset MFA if error
      if (mfaRequired) {
        setMfaCode('');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {mfaRequired ? 'Two-Factor Authentication' : 'Login'}
          </h1>
          <p className="text-slate-400 mb-8">
            {mfaRequired 
              ? 'Enter the code from your authenticator app'
              : 'Enter your credentials to access TDC'
            }
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!mfaRequired ? (
              <>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label htmlFor="mfaCode" className="block text-sm font-medium text-slate-300 mb-2">
                  Authentication Code
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="mfaCode"
                    type="text"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white text-center text-xl tracking-widest font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={6}
                    required
                    autoFocus
                  />
                </div>
                <p className="text-slate-500 text-xs mt-2">
                  Open your authenticator app to view your code
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (mfaRequired && mfaCode.length !== 6)}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2"
            >
              {loading && <Loader className="w-4 h-4 animate-spin" />}
              {loading ? 'Verifying...' : mfaRequired ? 'Verify Code' : 'Login'}
            </button>

            {mfaRequired && (
              <button
                type="button"
                onClick={() => {
                  setMfaRequired(false);
                  setMfaCode('');
                  setError('');
                }}
                className="w-full text-slate-400 hover:text-slate-300 text-sm py-2 transition"
              >
                ← Back to login
              </button>
            )}
          </form>

          {!mfaRequired && (
            <p className="text-slate-400 text-sm text-center mt-6">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-400 hover:text-blue-300">
                Register
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
