import React, { useState, useEffect } from 'react'; // Ajout de useEffect
import { useAuth } from '../context/AuthContext';
import { 
  User, Shield, Palette, Info, LifeBuoy, LogOut, ChevronRight, ArrowLeft, Mail, Fingerprint, Lock, AlertTriangle 
} from 'lucide-react';
import './Profil.css';

const Profil = () => {
  const { user, logout, updateTheme, changePassword } = useAuth(); // Ajout de changePassword
  const [activeSection, setActiveSection] = useState('main');

  // --- ÉTATS POUR LE MOT DE PASSE ---
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdMessage, setPwdMessage] = useState({ text: '', type: '' });
  const [showConfirmPopup, setShowConfirmPopup] = useState(false); // Pour le popup

  // Reset des champs quand on change de section
  useEffect(() => {
    if (activeSection !== 'security') {
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd(''); setPwdMessage({}); setShowConfirmPopup(false);
    }
  }, [activeSection]);

  // Validation : Bouton actif seulement si conditions remplies
  const isChangeBtnEnabled = currentPwd.length > 0 && newPwd.length > 0 && newPwd === confirmPwd;

  // Action finale (Appel API)
  const handleFinalChange = async () => {
    const result = await changePassword(currentPwd, newPwd);
    
    if (result.success) {
      // Succès : On ferme le popup, on affiche le succès, et on attend 2s avant de revenir au menu
      setShowConfirmPopup(false);
      setPwdMessage({ text: result.message, type: 'success' });
      setTimeout(() => {
        setActiveSection('main');
      }, 2000);
    } else {
      // Erreur : On ferme le popup et on affiche l'erreur
      setShowConfirmPopup(false);
      setPwdMessage({ text: result.message, type: 'error' });
    }
  };

  if (!user) return <div className="profil-container">Veuillez vous connecter.</div>;

  const SubHeader = ({ title }) => (
    <div className="sub-header">
      <button onClick={() => setActiveSection('main')} className="back-btn"><ArrowLeft size={20} /></button>
      <h2>{title}</h2>
    </div>
  );

  // --- CONTENU DU POPUP DE CONFIRMATION ---
  const ConfirmationPopup = () => (
    <div className="popup-overlay">
      <div className="popup-content">
        <div className="popup-icon"><AlertTriangle size={40} color="#e67e22" /></div>
        <h3>Êtes-vous sûr ?</h3>
        <p>Cette action modifiera définitivement votre mot de passe et ne peut pas être annulée.</p>
        <div className="popup-actions">
          <button className="btn-cancel" onClick={() => setShowConfirmPopup(false)}>Retour</button>
          <button className="btn-confirm" onClick={handleFinalChange}>Changer</button>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'main':
        return (
          <>
            <div className="profil-header-card">
              <div className="avatar-circle">{user.username.charAt(0).toUpperCase()}</div>
              <div className="user-info">
                <h3>{user.username}</h3>
                <span className="user-email">{user.email}</span>
                <span className="user-role-badge">{user.role}</span>
              </div>
            </div>

            <div className="settings-group">
              <div className="group-title">COMPTE</div>
              <button className="settings-item" onClick={() => setActiveSection('perso')}>
                <div className="item-icon"><User size={20} /></div>
                <div className="item-text">Informations personnelles</div>
                <ChevronRight size={18} className="chevron" />
              </button>
              <button className="settings-item" onClick={() => setActiveSection('security')}>
                <div className="item-icon"><Shield size={20} /></div>
                <div className="item-text">Mot de passe & Sécurité</div>
                <ChevronRight size={18} className="chevron" />
              </button>
            </div>

            <div className="settings-group">
              <div className="group-title">PRÉFÉRENCES</div>
              <button className="settings-item" onClick={() => setActiveSection('about')}>
                <div className="item-icon"><Info size={20} /></div>
                <div className="item-text">A propos de nous</div>
                <ChevronRight size={18} className="chevron" />
              </button>
              <button className="settings-item" onClick={() => setActiveSection('theme')}>
                <div className="item-icon"><Palette size={20} /></div>
                <div className="item-text">Thème</div>
                <div className="item-value">{user.theme || 'Défaut'}</div>
                <ChevronRight size={18} className="chevron" />
              </button>
            </div>

            <div className="settings-group">
              <div className="group-title">SUPPORT</div>
              <button className="settings-item" onClick={() => setActiveSection('support')}>
                <div className="item-icon"><LifeBuoy size={20} /></div>
                <div className="item-text">Assistance</div>
                <ChevronRight size={18} className="chevron" />
              </button>
            </div>

            <button className="logout-button" onClick={logout}><LogOut size={20} /> Déconnexion</button>
          </>
        );

      case 'perso':
        // (Code existant pour perso...)
        return (
           <div className="sub-page">
            <SubHeader title="Informations Personnelles" />
            <div className="info-card">
               {/* ... contenu perso inchangé ... */}
               <div className="info-row"><Fingerprint size={18} className="text-muted"/><div><label>Identifiant</label><p>{user.username}</p></div></div>
               <hr/>
               <div className="info-row"><Mail size={18} className="text-muted"/><div><label>Email</label><p>{user.email}</p></div></div>
            </div>
           </div>
        );

      // --- SECTION SÉCURITÉ MISE À JOUR ---
      case 'security':
        return (
          <div className="sub-page">
            <SubHeader title="Sécurité" />
            
            <div className="info-card">
              <div style={{marginBottom: 20}}>
                <h3>Changer le mot de passe</h3>
                <p style={{fontSize: '0.9rem', opacity: 0.7}}>Veuillez entrer votre mot de passe actuel pour confirmer votre identité.</p>
              </div>

              {/* Message Feedback */}
              {pwdMessage.text && (
                <div style={{
                  padding: 10, borderRadius: 6, marginBottom: 15, fontWeight: 'bold',
                  backgroundColor: pwdMessage.type === 'error' ? 'rgba(231,76,60,0.1)' : 'rgba(46,204,113,0.1)',
                  color: pwdMessage.type === 'error' ? '#e74c3c' : '#2ecc71'
                }}>
                  {pwdMessage.text}
                </div>
              )}

              <div className="form-group">
                <label>Mot de passe actuel</label>
                <div className="input-with-icon">
                  <Lock size={18} />
                  <input type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} placeholder="••••••••" />
                </div>
              </div>

              <div className="form-group">
                <label>Nouveau mot de passe</label>
                <div className="input-with-icon">
                  <Lock size={18} />
                  <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="Nouveau mot de passe" />
                </div>
              </div>

              <div className="form-group">
                <label>Confirmer le nouveau mot de passe</label>
                <div className="input-with-icon">
                  <Lock size={18} />
                  <input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} placeholder="Répétez le nouveau mot de passe" />
                </div>
              </div>

              <button 
                className="btn-primary" 
                disabled={!isChangeBtnEnabled} 
                onClick={() => setShowConfirmPopup(true)} // Déclenche le popup
                style={{ width: '100%', marginTop: 10, opacity: isChangeBtnEnabled ? 1 : 0.5, cursor: isChangeBtnEnabled ? 'pointer' : 'not-allowed' }}
              >
                Changer le mot de passe
              </button>
            </div>
          </div>
        );

      // (Autres cases inchangés: theme, about, support...)
      case 'theme': return <div className="sub-page"><SubHeader title="Thème" /><div className="theme-grid">{['Spie Batignolles', 'Clair', 'Sombre'].map(t=><button key={t} className={`theme-option ${user.theme===t?'active':''}`} onClick={()=>updateTheme(t)}>{t}{user.theme===t&&<div className="dot"></div>}</button>)}</div></div>;
      case 'about': return <div className="sub-page"><SubHeader title="A propos"/><div className="info-card"><h3>Mon App v1.0</h3><p>App Dockerisée.</p></div></div>;
      case 'support': return <div className="sub-page"><SubHeader title="Assistance"/><div className="info-card"><p>Contactez: support@spie.com</p></div></div>;
      default: return null;
    }
  };

  return (
    <div className="profil-container">
      {renderContent()}
      {/* Affichage conditionnel du popup par dessus tout */}
      {showConfirmPopup && <ConfirmationPopup />}
    </div>
  );
};

export default Profil;