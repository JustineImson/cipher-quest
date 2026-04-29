export default function Button({ children, onClick, variant = 'primary', className = '', ...props }) {
  const baseStyles = "font-serif tracking-widest uppercase transition-all duration-300 border backdrop-blur-sm shadow-md hover:shadow-[0_0_15px_rgba(203,161,83,0.3)] active:scale-95 flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-mystery-dark/80 border-mystery-gold text-mystery-gold hover:bg-mystery-gold hover:text-mystery-dark hover:border-mystery-dark",
    secondary: "bg-black/40 border-mystery-gold/50 text-gray-300 hover:bg-mystery-gold/10 hover:border-mystery-gold hover:text-mystery-gold",
    danger: "bg-victorian-red/20 border-victorian-red text-victorian-red hover:bg-victorian-red hover:text-white"
  };

  return (
    <button 
      onClick={onClick} 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
