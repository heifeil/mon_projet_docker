import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // 1. INITIALIZATION: Check localStorage for existing session
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('monitoring_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      console.error("Error parsing user from localStorage", error);
      return null;
    }
  });

  const [token, setToken] = useState(localStorage.getItem('token') || null);

  // 2. EFFECT: Apply theme on mount if user exists
  useEffect(() => {
    if (user && user.theme) {
      document.documentElement.setAttribute('data-theme', user.theme);
    }
  }, [user]);

  // --- LOGIN (Hybrid: Email or Username) ---
  const login = async (login_input, mot_de_passe) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login_input, mot_de_passe }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Erreur de connexion");

      // Success
      setToken(data.token);
      setUser(data.user);
      
      // Save to LocalStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('monitoring_user', JSON.stringify(data.user)); // <--- PERSISTENCE ADDED
      
      // Apply theme immediately
      if (data.user.theme) {
        document.documentElement.setAttribute('data-theme', data.user.theme);
      }
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  // --- REGISTER (With Username) ---
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

  // --- UPDATE THEME (For Profile page) ---
  const updateTheme = async (newTheme) => {
    // 1. Visual update (CSS)
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // 2. Local state update
    if (user) {
      const updatedUser = { ...user, theme: newTheme };
      setUser(updatedUser);
      // Update LocalStorage to persist the new theme on reload
      localStorage.setItem('monitoring_user', JSON.stringify(updatedUser)); 
    }

    // 3. Database update (Backend API)
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

  // --- CHANGE PASSWORD ---
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
    localStorage.removeItem('monitoring_user'); // <--- CLEAR STORAGE
    document.documentElement.removeAttribute('data-theme');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      register, 
      updateTheme, 
      changePassword, 
      logout, 
      isAuthenticated: !!user 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 