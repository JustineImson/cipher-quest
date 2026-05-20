import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

/**
 * Wraps any route/page that requires internet access.
 * When the device is offline the children are replaced with a
 * themed "No Connection" screen instead of a broken page.
 */
export default function OfflineGate({ children }) {
  const isOnline = useOnlineStatus();

  if (isOnline) return children;

  return (
    <div className="flex flex-col items-center justify-center h-full w-full relative z-10 p-6">
      <div className="bg-black/60 border border-mystery-gold/40 p-10 rounded shadow-xl text-center max-w-sm w-full backdrop-blur-sm">
        <WifiOff
          size={48}
          className="mx-auto mb-6 text-mystery-gold/60 drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]"
        />
        <h2 className="text-2xl text-mystery-gold font-serif uppercase tracking-widest mb-3 drop-shadow-[0_0_6px_rgba(212,175,55,0.4)]">
          No Connection
        </h2>
        <p className="text-gray-400 font-serif text-sm leading-relaxed">
          This section requires an internet connection to access.
          <br />
          Please reconnect and try again.
        </p>
      </div>
    </div>
  );
}
