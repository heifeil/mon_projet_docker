import React, { useState, useEffect } from 'react';
import { Play, Activity, Download, Loader } from 'lucide-react';
import '../PIP.css'; 

const Subnet = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isScanning, setIsScanning] = useState(false);
    const [isAmorcing, setIsAmorcing] = useState(false);

    const [toast, setToast] = useState({ visible: false, message: '', type: '' });

    // Remplacement de COM_EQUIP par EQUIPEMENT
    const columns = [
        "NOM_EQUIPEMENT", "EQUIPEMENT", 
        "DALI1", "DALI2", "DALI3", "DALI4", 
        "BLIND1", "BLIND2", "BLIND3", "BLIND4", 
        "MC1", "MC2", "MC3", "MC4", "MC5"
    ];

    const showToast = (message, type = 'success') => {
        setToast({ visible: true, message, type });
        setTimeout(() => {
            setToast({ visible: false, message: '', type: '' });
        }, 3000);
    };

    const fetchSubnetData = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:5000/api/subnet/data');
            const result = await res.json();
            setData(result.rows || []);
        } catch (err) {
            console.error("Erreur de chargement Subnet :", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubnetData();
    }, []);

    const handleAmorce = async () => {
        setIsAmorcing(true);
        try {
            const response = await fetch('http://localhost:5000/api/subnet/amorce', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const result = await response.json();
            
            if (result.success) {
                showToast(`Amorce terminée ! ${result.lignesAjoutees} équipements trouvés.`, "success");
                fetchSubnetData(); 
            } else {
                showToast("Erreur lors de l'amorce : " + result.message, "error");
            }
        } catch (err) {
            console.error("Erreur réseau :", err);
            showToast("Erreur réseau lors de l'amorce.", "error");
        } finally {
            setIsAmorcing(false);
        }
    };

    const handleScan = async () => {
        setIsScanning(true);
        try {
            const response = await fetch('http://localhost:5000/api/subnet/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const result = await response.json();
            
            if (result.success) {
                showToast("Scan terminé avec succès !", "success");
                fetchSubnetData(); 
            } else {
                showToast("Erreur lors du scan : " + result.message, "error");
            }
        } catch (err) {
            console.error("Erreur réseau :", err);
            showToast("Erreur réseau lors du scan.", "error");
        } finally {
            setIsScanning(false);
        }
    };

    const handleExtraction = () => {
        if (!data || data.length === 0) {
            showToast("Il n'y a aucune donnée à extraire.", "error");
            return;
        }

        const header = columns.join(';');
        const csvRows = data.map(row => {
            return columns.map(col => {
                let cellValue = row[col] === null || row[col] === undefined ? '' : row[col];
                let stringValue = String(cellValue).replace(/"/g, '""');
                return `"${stringValue}"`;
            }).join(';');
        });

        const csvString = "\uFEFF" + [header, ...csvRows].join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const dateStr = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `Extraction_Subnet_${dateStr}.csv`);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast("Extraction réussie !", "success");
    };

    const renderCell = (col, value) => {
        if (!value) return '-';

        // La colonne EQUIPEMENT affiche le nom, sauf s'il y a une erreur
        if (col === 'EQUIPEMENT') {
            if (value === 'Erreur REST' || value === 'Inconnu') {
                return <span className="status-badge badge-nok">{value}</span>;
            }
            return value; // Affichage normal du nom de l'équipement
        }

        if (['DALI1', 'DALI2', 'DALI3', 'DALI4', 'BLIND1', 'BLIND2', 'BLIND3', 'BLIND4', 'MC1', 'MC2', 'MC3', 'MC4', 'MC5'].includes(col)) {
            let badgeClass = 'badge-neutral'; 
            if (value === 'Fonctionnel') {
                badgeClass = 'badge-ok'; 
            } else if (value === 'Manque') {
                badgeClass = 'badge-nok'; 
            } else if (value === 'En trop') {
                badgeClass = 'badge-warning'; 
            } 
            return <span className={`status-badge ${badgeClass}`}>{value}</span>;
        }
        return value;
    };

    return (
        <div className="pip-wrapper-flex">
            <div className="pip-container full-width">
                
                <div className="toolbar">
                    <div className="toolbar-group">
                        <span style={{fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--text-main)'}}>
                            Subnet
                        </span>
                    </div>

                    <div className="toolbar-group">
                        <button onClick={handleAmorce} className="btn-tool" disabled={isAmorcing}>
                            {isAmorcing ? <Loader size={18} className="spin" /> : <Play size={18} color="var(--primary-color)" />} 
                            {isAmorcing ? "Amorce en cours..." : "Amorce"}
                        </button>
                        
                        <button onClick={handleScan} className="btn-tool primary-tool" disabled={isScanning}>
                            {isScanning ? <Loader size={18} className="spin" /> : <Activity size={18} />} 
                            {isScanning ? "Scan en cours..." : "Scan"}
                        </button>
                        
                        <button onClick={handleExtraction} className="btn-tool">
                            <Download size={18} /> Extraction
                        </button>
                    </div>
                </div>

                <div className="table-full-wrapper">
                    {loading ? (
                        <div className="loading-state"><Loader size={40} className="spin" /></div>
                    ) : data.length === 0 ? (
                        <div className="empty-state">Aucune donnée Subnet trouvée. Veuillez amorcer le tableau.</div>
                    ) : (
                        <table className="full-width-table">
                            <thead>
                                <tr>
                                    {columns.map(col => (
                                        <th 
                                            key={col} 
                                            style={{ 
                                                width: col === 'NOM_EQUIPEMENT' ? '200px' : 'auto',
                                                minWidth: col === 'NOM_EQUIPEMENT' ? '150px' : 'auto' 
                                            }}
                                        >
                                            <div className="th-label">{col.replace(/_/g, ' ')}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((row, index) => (
                                    <tr key={index}>
                                        {columns.map(col => (
                                            <td key={col} style={{ textAlign: (col === 'NOM_EQUIPEMENT' || col === 'EQUIPEMENT') ? 'left' : 'center' }}>
                                                {renderCell(col, row[col])}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* --- AFFICHAGE DU TOAST --- */}
            {toast.visible && (
                <div className={`toast-notification ${toast.type}`}>
                    {toast.message}
                </div>
            )}
        </div>
    );
};

export default Subnet;