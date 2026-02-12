import React from 'react';

const BacnetCommandes = ({ equipment }) => {
  return (
    <div className="bacnet-tab-content">
      <h3>Commandes & Forçages</h3>
      <p>Liste des points écrivables (Output / Value) pour {equipment.NOM_EQUIPEMENT}...</p>
      {/* Ici vous mettrez vos boutons ON/OFF, sliders, etc. */}
      <div className="empty-state-tab">Aucune commande disponible pour le moment.</div>
    </div>
  );
};

export default BacnetCommandes;