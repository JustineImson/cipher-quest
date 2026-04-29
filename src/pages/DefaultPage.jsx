import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function DefaultPage({ title }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-mystery-dark px-4 text-center text-gray-200">
      <h1 className="text-4xl font-serif text-mystery-gold mb-8 tracking-widest drop-shadow-md uppercase">
        {title}
      </h1>
      <p className="text-gray-400 mb-12 italic font-serif opacity-80 max-w-lg leading-relaxed">
        This area of the investigation is currently untrodden...
      </p>
      <Button onClick={() => navigate('/')} variant="secondary" className="px-8 py-3">
        Return to Menu
      </Button>
    </div>
  );
}
