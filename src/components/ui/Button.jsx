export default function Button({ children, onClick, variant = 'primary', className = '', isActive = false, ...props }) {
  const baseStyles = "font-serif tracking-widest uppercase transition-all duration-300 shadow-md flex items-center justify-center gap-2 active:scale-95 focus:outline-none";
  
  const variants = {
    primary: "bg-[#1e1208]/90 border border-[#7a5c2e] text-[#d4a843] hover:bg-[#2a1a0c] hover:border-[#c9a84c] hover:shadow-[0_0_15px_rgba(203,161,83,0.4)] hover:text-[#f5dfa0]",
    secondary: "bg-[#1e1208]/90 border border-[#7a5c2e] text-[#d4a843] hover:bg-[#2a1a0c] hover:border-[#c9a84c] hover:shadow-[0_0_15px_rgba(203,161,83,0.4)] hover:text-[#f5dfa0]",
    danger: "bg-victorian-red/20 border border-victorian-red text-victorian-red hover:bg-victorian-red hover:text-white focus:ring-1 focus:ring-victorian-red"
  };

  const activeStyles = isActive ? "!border-b-[3px] !border-b-[#c9a84c] bg-[#2a1a0c] text-[#e8c97a]" : "";

  return (
    <button 
      onClick={onClick} 
      className={`${baseStyles} ${variants[variant]} ${activeStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
