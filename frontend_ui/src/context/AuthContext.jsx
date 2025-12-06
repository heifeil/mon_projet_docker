import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);

  // --- LOGIN (Hybride : Email ou Username) ---
  const login = async (login_input, mot_de_passe) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login_input, mot_de_passe }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Erreur de connexion");

      // Si succès
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('token', data.token);
      
      // Appliquer le thème de l'utilisateur dès la connexion
      if (data.user.theme) {
        document.documentElement.setAttribute('data-theme', data.user.theme);
      }
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  // --- REGISTER (Avec Username) ---
  const register = async (email, username, mot_de_passe) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, mot_de_passe, role: 'user' }), 
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Erreur d'inscription");

      return { success: true, message: "Compte créé ! Veuillez vous connecter." };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  // --- UPDATE THEME (Pour la page Profil) ---
  const updateTheme = async (newTheme) => {
    // 1. Mise à jour visuelle immédiate (CSS)
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // 2. Mise à jour de l'état local user
    if (user) {
      setUser({ ...user, theme: newTheme });
    }

    // 3. Sauvegarde en BDD (API Backend)
    if (user && user.id) {
      try {
        await fetch('http://localhost:5000/api/auth/update-theme', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: user.id, theme: newTheme }),
        });
      } catch (err) {
        console.error("Erreur lors de la sauvegarde du thème", err);
      }
    }
  };

  // --- CHANGE PASSWORD (NOUVEAU) ---
  const changePassword = async (currentPassword, newPassword) => {
    if (!user || !user.id) return { success: false, message: "Utilisateur non connecté" };

    try {
      const response = await fetch('http://localhost:5000/api/auth/update-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            id: user.id, 
            current_password: currentPassword, 
            new_password: newPassword 
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Erreur lors du changement de mot de passe");

      return { success: true, message: "Mot de passe modifié avec succès !" };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  // --- LOGOUT ---
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    document.documentElement.removeAttribute('data-theme');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      register, 
      updateTheme, 
      changePassword, // <--- Ajouté ici
      logout, 
      isAuthenticated: !!user 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);