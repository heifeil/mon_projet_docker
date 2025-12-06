import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);

  // --- LOGIN (Hybride : Email ou Username) ---
  // On attend maintenant 'login_input' qui peut être l'un ou l'autre
  const login = async (login_input, mot_de_passe) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // On envoie la clé 'login_input' pour correspondre au backend
        body: JSON.stringify({ login_input, mot_de_passe }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Erreur de connexion");

      // Si succès
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('token', data.token);
      
      // Appliquer le thème de l'utilisateur
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
        // On inclut 'username' dans l'envoi
        body: JSON.stringify({ email, username, mot_de_passe, role: 'user' }), 
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Erreur d'inscription");

      return { success: true, message: "Compte créé ! Veuillez vous connecter." };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    document.documentElement.removeAttribute('data-theme');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);