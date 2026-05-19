import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { verifyResetCode, confirmNewPassword } from '../services/authService';
import { useSfx } from '../hooks/useSfx';

export default function AuthAction() {
  const navigate = useNavigate();
  const location = useLocation();
  const { playClick, playKeyTap } = useSfx();
  
  const [mode, setMode] = useState('');
  const [oobCode, setOobCode] = useState('');
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [status, setStatus] = useState('verifying'); // verifying, ready, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const modeParam = params.get('mode');
    const oobCodeParam = params.get('oobCode');
    
    if (!modeParam || !oobCodeParam) {
      setStatus('error');
      setMessage('Invalid or missing action code.');
      return;
    }
    
    setMode(modeParam);
    setOobCode(oobCodeParam);
    
    if (modeParam === 'resetPassword') {
      verifyResetCode(oobCodeParam)
        .then((email) => {
          setStatus('ready');
          setMessage(`Resetting passcode for ${email}`);
        })
        .catch((err) => {
          setStatus('error');
          setMessage(err.message || 'The link is invalid or has expired.');
        });
    } else {
      // Future-proofing for other actions like recoverEmail, verifyEmail
      setStatus('error');
      setMessage('Unsupported action mode.');
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    playClick();
    
    if (newPassword !== confirmPassword) {
      setStatus('error');
      setMessage('Passcodes do not match. Try again.');
      return;
    }
    
    if (newPassword.length < 6) {
      setStatus('error');
      setMessage('Passcode must be at least 6 characters.');
      return;
    }

    setStatus('verifying');
    try {
      await confirmNewPassword(oobCode, newPassword);
      setStatus('success');
      setMessage('Passcode successfully updated. You may now log in.');
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Failed to reset passcode.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-[#1a1208] text-[#e8dcc0] font-['Special_Elite'] relative">
      <div className="absolute inset-0 bg-[url('/mainMenuBg.png')] bg-cover bg-center z-0 opacity-20" />
      
      <div className="relative z-10 w-full max-w-md bg-[#1a1208]/90 border border-[#c9a84c]/40 p-8 shadow-[0_0_40px_rgba(0,0,0,0.8)] backdrop-blur-sm">
        <h2 className="font-['Playfair_Display'] text-3xl font-bold tracking-widest text-[#e8c96a] uppercase text-center mb-6">
          System Override
        </h2>

        {status === 'verifying' && (
          <div className="text-center animate-pulse text-[#c9a84c] tracking-widest">
            {message || 'Verifying secure token...'}
          </div>
        )}

        {status === 'error' && (
          <div className="text-center mb-6">
            <div className="mb-4 p-3 border border-[#8b1a1a]/50 bg-[#2a0808]/80 text-[#ff6b6b] text-xs uppercase tracking-widest">
              {message}
            </div>
            <button 
              onClick={() => { playClick(); navigate('/'); }}
              className="px-6 py-2 border border-[#c9a84c]/60 text-[#c9a84c] hover:bg-[#32230c] hover:text-[#e8c96a] transition-colors"
            >
              Return to Base
            </button>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center mb-6">
            <div className="mb-4 p-3 border border-[#5a9e6f]/50 bg-[#0a1a0f]/80 text-[#5a9e6f] text-xs uppercase tracking-widest">
              {message}
            </div>
            <button 
              onClick={() => { playClick(); navigate('/'); }}
              className="px-6 py-2 border border-[#c9a84c]/60 text-[#c9a84c] hover:bg-[#32230c] hover:text-[#e8c96a] transition-colors"
            >
              Return to Login
            </button>
          </div>
        )}

        {status === 'ready' && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="text-center mb-4 text-[#7a6030] text-xs uppercase tracking-widest">
              {message}
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs tracking-widest text-[#c9a84c] uppercase">New Passcode</label>
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (e.nativeEvent.inputType !== 'deleteContentBackward') playKeyTap();
                  setStatus('ready'); // clear previous errors if typing
                }}
                className="bg-[#2a1e0e]/80 border border-[#7a6030]/50 text-[#e8dcc0] px-4 py-2 focus:outline-none focus:border-[#c9a84c] transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs tracking-widest text-[#c9a84c] uppercase">Confirm Passcode</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (e.nativeEvent.inputType !== 'deleteContentBackward') playKeyTap();
                  setStatus('ready'); // clear previous errors if typing
                }}
                className="bg-[#2a1e0e]/80 border border-[#7a6030]/50 text-[#e8dcc0] px-4 py-2 focus:outline-none focus:border-[#c9a84c] transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            <button 
              type="submit"
              className="mt-4 py-3 bg-[#1a1208]/60 border border-[#c9a84c]/60 text-[#c9a84c] text-sm tracking-[0.2em] uppercase hover:bg-[#32230c] hover:border-[#c9a84c] hover:text-[#e8c96a] transition-all"
            >
              Update Passcode
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
