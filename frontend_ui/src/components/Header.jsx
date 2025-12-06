import React, { useState } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext'; // On importe le cerveau
import LoginModal from './LoginModal'; // On importe le visage

const Header = () => {
  const { user, logout, isAuthenticated } = useAuth(); // On récupère l'état global
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <header className="header">
        <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>MON APP</div>
        
        {!isAuthenticated ? (
           <button className="login-btn" onClick={() => setShowModal(true)}>
             <LogIn size={16} style={{ marginRight: 5 }} /> Connexion
           </button>
        ) : (
           <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
             <span>Bonjour, <strong>{user?.email}</strong></span>
             <button className="login-btn" onClick={logout} style={{ background: '#7f8c8d' }}>
               <LogOut size={16} />
             </button>
           </div>
        )}
      </header>

      {/* Si showModal est vrai, on affiche la fenêtre */}
      {showModal && <LoginModal onClose={() => setShowModal(false)} />}
    </>
  );
};

export default Header;