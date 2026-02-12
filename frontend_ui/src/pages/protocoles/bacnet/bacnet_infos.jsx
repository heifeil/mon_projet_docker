import React from 'react';
import { Server, Database, Activity } from 'lucide-react';

const BacnetInfos = ({ equipment }) => {
  return (
    <div className="bacnet-tab-content">
      <h3>Informations Générales</h3>
      <div className="info-grid">
        <div className="info-item">
            <label>Nom :</label> <span>{equipment.NOM_EQUIPEMENT}</span>
        </div>
        <div className="info-item">
            <label>IP :</label> <span>{equipment.IP}</span>
        </div>
        <div className="info-item">
            <label>Protocole :</label> <span>{equipment.PROTOCOLE}</span>
        </div>
        <div className="info-item">
            <label>Localisation :</label> <span>{equipment.LOCALISATION || 'N/A'}</span>
        </div>
      </div>
    </div>
  );
};

export default BacnetInfos;