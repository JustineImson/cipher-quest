import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useSfx } from '../../hooks/useSfx';
import { loginUser, registerUser, resetPassword } from '../../services/authService';

export default function LoginModal({ onClose }) {
  const navigate = useNavigate();
  const { playClick, playKeyTap } = useSfx();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    playClick();
    setError('');
    setResetMessage('');
    setIsLoading(true);
    try {
      await loginUser(email, password);
      onClose();
      navigate('/profile');
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    playClick();
    setError('');
    setResetMessage('');
    setIsLoading(true);
    try {
      await registerUser(email, password, username);
      onClose();
      navigate('/profile');
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    playClick();
    if (!email) {
      setError('Please enter your Email Dossier first.');
      return;
    }
    setError('');
    setResetMessage('');
    setIsLoading(true);
    try {
      await resetPassword(email);
      setResetMessage('Reset instructions sent. Check your inbox.');
    } catch (err) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dimmed backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={() => { playClick(); onClose(); }}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-[#1a1208] border border-[#c9a84c]/40 p-6 md:p-8 shadow-[0_0_40px_rgba(0,0,0,0.8)]">
        {/* Background textures */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22 opacity=%221%22/%3E%3C/svg%3E')] opacity-5 pointer-events-none mix-blend-screen" />
        
        {/* Close Button */}
        <button 
          onClick={() => { playClick(); onClose(); }}
          className="absolute top-4 right-4 text-[#7a6030] hover:text-[#c9a84c] transition-colors"
        >
          <X size={20} />
        </button>

        {/* Title */}
        <div className="text-center mb-8">
          <p className="font-['Special_Elite'] text-[10px] tracking-[0.2em] text-[#7a6030] uppercase mb-2">
            {isRegisterMode ? '— New Recruitment —' : '— Authorization Required —'}
          </p>
          <h2 className="font-['Playfair_Display'] text-3xl font-bold tracking-widest text-[#e8c96a] uppercase">
            {isRegisterMode ? 'Enlist Operative' : 'Identity Check'}
          </h2>
          <div className="flex items-center gap-3 mt-3 w-3/4 mx-auto">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#7a6030] to-transparent" />
            <div className="w-1.5 h-1.5 bg-[#c9a84c] rotate-45" />
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#7a6030] to-transparent" />
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 border border-[#8b1a1a]/50 bg-[#2a0808]/80 text-[#ff6b6b] font-['Special_Elite'] text-xs text-center tracking-widest uppercase">
            {error}
          </div>
        )}
        
        {resetMessage && (
          <div className="mb-4 p-3 border border-green-700/50 bg-green-900/20 text-green-400 font-['Special_Elite'] text-xs text-center tracking-widest uppercase">
            {resetMessage}
          </div>
        )}

        {/* Form */}
        <form className="relative z-10 flex flex-col gap-5 transition-all duration-300">
          <div key={isRegisterMode ? 'reg' : 'log'} className="flex flex-col gap-5 animate-[fadeIn_0.4s_ease-out]">
          {isRegisterMode && (
            <div className="flex flex-col gap-2">
              <label className="font-['Special_Elite'] text-xs tracking-widest text-[#c9a84c] uppercase">Agent Codename</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (e.nativeEvent.inputType !== 'deleteContentBackward') playKeyTap();
                }}
                className="bg-[#2a1e0e]/80 border border-[#7a6030]/50 text-[#e8dcc0] font-['Special_Elite'] px-4 py-2 focus:outline-none focus:border-[#c9a84c] transition-colors"
                placeholder="Shadow"
                disabled={isLoading}
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="font-['Special_Elite'] text-xs tracking-widest text-[#c9a84c] uppercase">Email Dossier</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (e.nativeEvent.inputType !== 'deleteContentBackward') playKeyTap();
              }}
              className="bg-[#2a1e0e]/80 border border-[#7a6030]/50 text-[#e8dcc0] font-['Special_Elite'] px-4 py-2 focus:outline-none focus:border-[#c9a84c] transition-colors"
              placeholder="agent@agency.com"
              disabled={isLoading}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-['Special_Elite'] text-xs tracking-widest text-[#c9a84c] uppercase">Passcode</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (e.nativeEvent.inputType !== 'deleteContentBackward') playKeyTap();
              }}
              className="bg-[#2a1e0e]/80 border border-[#7a6030]/50 text-[#e8dcc0] font-['Special_Elite'] px-4 py-2 focus:outline-none focus:border-[#c9a84c] transition-colors"
              placeholder="••••••••"
              disabled={isLoading}
            />
            {!isRegisterMode && (
              <div className="flex justify-end mt-1">
                <button 
                  type="button"
                  onClick={handleReset}
                  disabled={isLoading}
                  className="text-[10px] text-[#7a6030] hover:text-[#c9a84c] font-['Special_Elite'] tracking-widest uppercase transition-colors"
                >
                  Forgot Passcode?
                </button>
              </div>
            )}
          </div>
          </div>

          <div className="flex gap-4 mt-4">
            {isRegisterMode ? (
              <>
                <button 
                  type="button"
                  onClick={() => { playClick(); setError(''); setResetMessage(''); setIsRegisterMode(false); }}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-[#1a1208]/60 border border-[#7a6030]/60 text-[#7a6030] font-['Special_Elite'] text-xs md:text-sm tracking-[0.2em] uppercase hover:bg-[#2a1e0e] hover:border-[#c9a84c]/50 hover:text-[#c9a84c] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Back to Login
                </button>
                <button 
                  type="button"
                  onClick={handleRegister}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-[#1a1208]/60 border border-[#c9a84c]/60 text-[#c9a84c] font-['Special_Elite'] text-xs md:text-sm tracking-[0.2em] uppercase hover:bg-[#32230c] hover:border-[#c9a84c] hover:text-[#e8c96a] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Enlisting...' : 'Submit Enlistment'}
                </button>
              </>
            ) : (
              <>
                <button 
                  type="button"
                  onClick={handleLogin}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-[#1a1208]/60 border border-[#c9a84c]/60 text-[#c9a84c] font-['Special_Elite'] text-xs md:text-sm tracking-[0.2em] uppercase hover:bg-[#32230c] hover:border-[#c9a84c] hover:text-[#e8c96a] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Authenticating...' : 'Log In'}
                </button>
                <button 
                  type="button"
                  onClick={() => { playClick(); setError(''); setResetMessage(''); setIsRegisterMode(true); }}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-[#1a1208]/60 border border-[#7a6030]/60 text-[#7a6030] font-['Special_Elite'] text-xs md:text-sm tracking-[0.2em] uppercase hover:bg-[#2a1e0e] hover:border-[#c9a84c]/50 hover:text-[#c9a84c] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Register New
                </button>
              </>
            )}
          </div>
        </form>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
