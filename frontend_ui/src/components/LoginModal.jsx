import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './LoginModal.css';

const LoginModal = ({ onClose }) => {
  const { login, register } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  // Champs du formulaire
  const [email, setEmail] = useState('');     // Sert d'Email pur pour l'inscription
  const [username, setUsername] = useState(''); // Nouvel identifiant pour l'inscription
  const [loginInput, setLoginInput] = useState(''); // Email OU Username pour la connexion
  const [password, setPassword] = useState('');
  
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    
    if (isLoginMode) {
      // CONNEXION : On envoie loginInput (qui peut être email ou pseudo)
      const result = await login(loginInput, password);
      if (result.success) onClose();
      else setMessage({ text: result.message, type: 'error' });
    } else {
      // INSCRIPTION : On envoie les 3 champs
      const result = await register(email, username, password);
      if (result.success) {
        setMessage({ text: result.message, type: 'success' });
        setTimeout(() => setIsLoginMode(true), 2000);
      } else {
        setMessage({ text: result.message, type: 'error' });
      }
    }
  };

  // Reset des messages quand on change de mode
  const switchMode = (mode) => {
    setMessage({});
    setIsLoginMode(mode);
    // Petit nettoyage des champs pour faire propre
    setLoginInput(''); setEmail(''); setUsername(''); setPassword('');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button onClick={onClose} className="close-btn"><X size={24} /></button>
        
        <h2 style={{ margin: 0, textAlign: 'center' }}>
          {isLoginMode ? 'Connexion' : 'Créer un compte'}
        </h2>
        
        {message.text && (
          <div style={{ color: message.type === 'error' ? '#e74c3c' : '#2ecc71', marginTop: 15, textAlign: 'center', fontWeight: 'bold' }}>
            {message.text}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="auth-form">
          
          {isLoginMode ? (
            /* MODE CONNEXION : Un seul champ pour Email ou ID */
            <input 
              type="text" 
              placeholder="Email ou Identifiant" 
              className="auth-input"
              value={loginInput} 
              onChange={(e) => setLoginInput(e.target.value)}
              required
            />
          ) : (
            /* MODE INSCRIPTION : Champs séparés */
            <>
              <input 
                type="text" 
                placeholder="Choisir un Identifiant" 
                className="auth-input"
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <input 
                type="email" 
                placeholder="Votre Email" 
                className="auth-input"
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </>
          )}

          <input 
            type="password" 
            placeholder="Mot de passe" 
            className="auth-input"
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          
          <button type="submit" className="login-btn" style={{ width: '100%', padding: '12px' }}>
            {isLoginMode ? 'Se connecter' : "S'inscrire"}
          </button>
        </form>

        <div className="switch-mode">
          {isLoginMode ? (
            <> Pas encore de compte ? <button className="link-btn" onClick={() => switchMode(false)}>Créer un compte</button> </>
          ) : (
            <> Déjà un compte ? <button className="link-btn" onClick={() => switchMode(true)}>Se connecter</button> </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginModal;