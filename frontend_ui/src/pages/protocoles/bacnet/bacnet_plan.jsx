import React from 'react';

const BacnetPlan = ({ equipment }) => {
  return (
    <div className="bacnet-tab-content">
      <h3>Localisation sur Plan</h3>
      <p>Niveau : {equipment.NIVEAU || 'Inconnu'}</p>
      <div className="empty-state-tab">Plan non chargé.</div>
    </div>
  );
};

export default BacnetPlan;