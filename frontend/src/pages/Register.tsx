import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, User, Lock, RefreshCw, Calculator, Loader, CheckCircle, UserPlus } from 'lucide-react';

interface CaptchaData {
  image: string;
  token: string;
}

export default function Register() {
  const [formData, setFormData] = useState({
    nickname: '',
    email: '',
    password: '',
    password_confirm: '',
    captcha_answer: '',
  });
  const [captcha, setCaptcha] = useState<CaptchaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchCaptcha();
  }, []);

  const fetchCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/auth/captcha/');
      if (response.ok) {
        const data = await response.json();
        setCaptcha(data);
        setFormData(prev => ({ ...prev, captcha_answer: '' }));
      }
    } catch (err) {
      console.error('Failed to fetch captcha:', err);
    } finally {
      setCaptchaLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear field error when typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    try {
      const response = await fetch('http://localhost:8000/api/auth/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          captcha_token: captcha?.token,
          captcha_answer: parseInt(formData.captcha_answer, 10),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        // Handle field-specific errors
        if (typeof data === 'object') {
          const errors: Record<string, string> = {};
          Object.entries(data).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              errors[key] = value[0];
            } else if (typeof value === 'string') {
              errors[key] = value;
            }
          });
          setFieldErrors(errors);
          
          // If captcha error, refresh captcha
          if (errors.captcha_answer) {
            fetchCaptcha();
          }
        } else {
          setError('Registration failed. Please try again.');
        }
      }
    } catch {
      setError('Connection error. Please try again.');
      fetchCaptcha();
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Registration Successful!</h2>
          <p className="text-slate-400 mb-6">
            Your account has been created. Please wait for an administrator to approve your account before you can log in.
          </p>
          <Link
            to="/login"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="text-slate-400 mt-2">Join TDC to access weapon loadouts and settings</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nickname */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Nickname</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                name="nickname"
                value={formData.nickname}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-3 bg-slate-700 border rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  fieldErrors.nickname ? 'border-red-500' : 'border-slate-600'
                }`}
                placeholder="Your nickname"
                required
                minLength={3}
              />
            </div>
            {fieldErrors.nickname && (
              <p className="text-red-400 text-xs mt-1">{fieldErrors.nickname}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-3 bg-slate-700 border rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  fieldErrors.email ? 'border-red-500' : 'border-slate-600'
                }`}
                placeholder="your@email.com"
                required
              />
            </div>
            {fieldErrors.email && (
              <p className="text-red-400 text-xs mt-1">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-3 bg-slate-700 border rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  fieldErrors.password ? 'border-red-500' : 'border-slate-600'
                }`}
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>
            {fieldErrors.password && (
              <p className="text-red-400 text-xs mt-1">{fieldErrors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="password"
                name="password_confirm"
                value={formData.password_confirm}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-3 bg-slate-700 border rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  fieldErrors.password_confirm ? 'border-red-500' : 'border-slate-600'
                }`}
                placeholder="••••••••"
                required
              />
            </div>
            {fieldErrors.password_confirm && (
              <p className="text-red-400 text-xs mt-1">{fieldErrors.password_confirm}</p>
            )}
          </div>

          {/* Captcha */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              <Calculator className="inline w-4 h-4 mr-1" />
              Solve the math puzzle
            </label>
            <div className="flex gap-3 items-center">
              <div className="relative bg-slate-700 rounded-lg overflow-hidden flex-shrink-0">
                {captchaLoading ? (
                  <div className="w-[200px] h-[80px] flex items-center justify-center">
                    <Loader className="w-6 h-6 text-blue-500 animate-spin" />
                  </div>
                ) : captcha ? (
                  <img src={captcha.image} alt="Captcha" className="w-[200px] h-[80px]" />
                ) : (
                  <div className="w-[200px] h-[80px] flex items-center justify-center text-slate-400">
                    Loading...
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={fetchCaptcha}
                className="p-2 text-slate-400 hover:text-blue-400 transition"
                title="Refresh captcha"
              >
                <RefreshCw className={`w-5 h-5 ${captchaLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="mt-2">
              <input
                type="number"
                name="captcha_answer"
                value={formData.captcha_answer}
                onChange={handleChange}
                className={`w-full px-4 py-3 bg-slate-700 border rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  fieldErrors.captcha_answer ? 'border-red-500' : 'border-slate-600'
                }`}
                placeholder="Enter your answer"
                required
              />
            </div>
            {fieldErrors.captcha_answer && (
              <p className="text-red-400 text-xs mt-1">{fieldErrors.captcha_answer}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || captchaLoading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Creating account...
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                Create Account
              </>
            )}
          </button>
        </form>

        {/* Login Link */}
        <p className="text-center text-slate-400 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-400 hover:text-blue-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
