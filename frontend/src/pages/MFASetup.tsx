import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Smartphone, CheckCircle, Loader, Copy, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function MFASetup() {
  const navigate = useNavigate();
  const { token, user, refreshUser } = useAuth();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    // If MFA is already enabled, redirect
    if (user?.mfa_enabled) {
      navigate('/');
      return;
    }

    fetchMFASetup();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user, navigate]);

  const fetchMFASetup = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/mfa/setup/', {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setQrCode(data.qr_code);
        setSecret(data.secret);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to setup MFA');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/api/auth/mfa/verify/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: verificationCode }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // Refresh user data
        if (refreshUser) {
          await refreshUser();
        }
        // Redirect after a short delay
        setTimeout(() => navigate('/'), 2000);
      } else {
        setError(data.error || 'Invalid verification code');
        setVerificationCode('');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const copySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSkip = () => {
    // Allow skipping for now, but show warning
    if (confirm('MFA adds an extra layer of security to your account. Are you sure you want to skip?')) {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">MFA Enabled!</h2>
          <p className="text-slate-400 mb-4">
            Your account is now protected with two-factor authentication.
          </p>
          <p className="text-slate-500 text-sm">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Setup Two-Factor Authentication</h1>
          <p className="text-slate-400 mt-2">
            Secure your account with an authenticator app
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="space-y-6">
          {/* Step 1: Install App */}
          <div className="flex gap-4">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">1</span>
            </div>
            <div>
              <h3 className="text-white font-medium">Install an Authenticator App</h3>
              <p className="text-slate-400 text-sm mt-1">
                Download Google Authenticator, Microsoft Authenticator, or Authy on your phone.
              </p>
            </div>
          </div>

          {/* Step 2: Scan QR Code */}
          <div className="flex gap-4">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">2</span>
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium">Scan this QR Code</h3>
              <p className="text-slate-400 text-sm mt-1 mb-4">
                Open your authenticator app and scan the code below.
              </p>
              
              {qrCode && (
                <div className="bg-white p-4 rounded-lg inline-block">
                  <img src={qrCode} alt="MFA QR Code" className="w-48 h-48" />
                </div>
              )}

              {/* Manual Entry */}
              <div className="mt-4">
                <p className="text-slate-400 text-xs mb-2">Can't scan? Enter this code manually:</p>
                <div className="flex items-center gap-2">
                  <code className="bg-slate-700 px-3 py-2 rounded text-sm text-blue-400 font-mono flex-1 overflow-x-auto">
                    {secret}
                  </code>
                  <button
                    onClick={copySecret}
                    className="p-2 text-slate-400 hover:text-blue-400 transition"
                    title="Copy code"
                  >
                    {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Enter Code */}
          <div className="flex gap-4">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">3</span>
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium">Enter Verification Code</h3>
              <p className="text-slate-400 text-sm mt-1 mb-4">
                Enter the 6-digit code from your authenticator app.
              </p>
              
              <form onSubmit={handleVerify}>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white text-center text-xl tracking-widest font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="000000"
                      maxLength={6}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={verifying || verificationCode.length !== 6}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg font-medium transition flex items-center gap-2"
                  >
                    {verifying ? (
                      <Loader className="w-5 h-5 animate-spin" />
                    ) : (
                      'Verify'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Skip Button */}
        <div className="mt-8 text-center">
          <button
            onClick={handleSkip}
            className="text-slate-500 hover:text-slate-400 text-sm transition"
          >
            Skip for now (not recommended)
          </button>
        </div>
      </div>
    </div>
  );
}
