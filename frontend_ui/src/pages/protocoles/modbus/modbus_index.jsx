import React from 'react';
import ModbusInfos from './modbus_infos';

const ModbusIndex = ({ equipment, onClose }) => {
    if (!equipment) return null;
    return (
        <div style={{ padding: '0', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <ModbusInfos equipment={equipment} onClose={onClose} />
        </div>
    );
};

export default ModbusIndex;