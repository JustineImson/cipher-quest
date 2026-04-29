import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ text = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <Loader2 className="h-10 w-10 animate-spin text-mystery-gold mb-4" />
      <p className="text-mystery-gold font-serif tracking-widest text-sm uppercase">
        {text}
      </p>
    </div>
  );
}
