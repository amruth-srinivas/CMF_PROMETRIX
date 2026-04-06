import React, { useState, useEffect } from 'react';
import { Bluetooth, Plus, Trash2, Wifi, WifiOff, RefreshCw, Save, X } from 'lucide-react';
import './BluetoothManagement.css';

const BluetoothManagement = () => {
  const [devices, setDevices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanningProgress, setScanningProgress] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deviceForm, setDeviceForm] = useState({
    name: '',
    deviceId: '',
    calibration: ''
  });

  // Scan for Bluetooth devices
  const scanDevices = async () => {
    setIsScanning(true);
    setScanningProgress(0);
    
    const progressInterval = setInterval(() => {
      setScanningProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 18; // Faster progress (5 second scan)
      });
    }, 500); // Update every 500ms

    try {
      const response = await fetch('http://172.18.100.26:8986/api/v1/bluetooth/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });
      
      if (response.ok) {
        const discoveredDevices = await response.json();
        setDevices(discoveredDevices);
        console.log('Discovered devices:', discoveredDevices);
      } else {
        console.error('Scan failed:', response.statusText);
        alert('Scan failed. Please try again.');
      }
    } catch (error) {
      console.error('Error scanning devices:', error);
      if (error.name === 'AbortError') {
        alert('Scan timed out. Please try again.');
      } else {
        alert('Error scanning devices. Please check if the backend is running.');
      }
    } finally {
      clearInterval(progressInterval);
      setScanningProgress(100);
      setIsScanning(false);
      setTimeout(() => setScanningProgress(0), 1000);
    }
  };

  // Save device to database
  const saveDeviceToDatabase = async () => {
    if (!selectedDevice || !deviceForm.name || !deviceForm.deviceId) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('http://172.18.100.26:8986/api/v1/bluetooth/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: deviceForm.name,
          device_id: deviceForm.deviceId,
          mac_address: selectedDevice.address,
          calibration: deviceForm.calibration || '',
          signal_strength: selectedDevice.rssi,
          connected: false
        }),
      });
      
      if (response.ok) {
        const savedDevice = await response.json();
        console.log('Device saved to database:', savedDevice);
        
        // Add to devices list with saved info
        setDevices(prev => 
          prev.map(device => 
            device.address === selectedDevice.address 
              ? { ...device, ...savedDevice, inDatabase: true }
              : device
          )
        );
        
        // Reset form
        setShowAddForm(false);
        setSelectedDevice(null);
        setDeviceForm({ name: '', deviceId: '', calibration: '' });
        alert('Device saved successfully!');
      } else {
        console.error('Save failed:', response.statusText);
        alert('Failed to save device to database');
      }
    } catch (error) {
      console.error('Error saving device:', error);
      alert('Error saving device to database');
    }
  };

  // Connect to device
  const connectDevice = async (address, name) => {
    try {
      const response = await fetch('http://172.18.100.26:8986/api/v1/bluetooth/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address, name }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Connected:', result);
        // Update device status
        setDevices(prev => 
          prev.map(device => 
            device.address === address 
              ? { ...device, connected: true }
              : device
          )
        );
      } else {
        console.error('Connection failed:', response.statusText);
      }
    } catch (error) {
      console.error('Error connecting to device:', error);
    }
  };

  // Disconnect device
  const disconnectDevice = async (address) => {
    try {
      const response = await fetch('http://172.18.100.26:8986/api/v1/bluetooth/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Disconnected:', result);
        // Update device status
        setDevices(prev => 
          prev.map(device => 
            device.address === address 
              ? { ...device, connected: false }
              : device
          )
        );
      } else {
        console.error('Disconnection failed:', response.statusText);
      }
    } catch (error) {
      console.error('Error disconnecting device:', error);
    }
  };

  // Remove device
  const removeDevice = (address) => {
    setDevices(prev => prev.filter(device => device.address !== address));
  };

  // Open add device form
  const openAddForm = (device) => {
    setSelectedDevice(device);
    setDeviceForm({
      name: device.name || '',
      deviceId: '',
      calibration: ''
    });
    setShowAddForm(true);
  };

  // Close form
  const closeForm = () => {
    setShowAddForm(false);
    setSelectedDevice(null);
    setDeviceForm({ name: '', deviceId: '', calibration: '' });
  };

  return (
    <div className="bluetooth-management">
      <div className="page-header">
        <h1>Manage Bluetooth Devices</h1>
        <div className="header-buttons">
          <button 
            className="scan-button"
            onClick={scanDevices}
            disabled={isScanning}
          >
            {isScanning ? (
              <>
                <RefreshCw className="animate-spin" size={20} />
                Scanning... {scanningProgress}%
              </>
            ) : (
              <>
                <RefreshCw size={20} />
                Scan Again
              </>
            )}
          </button>
        </div>
      </div>

      {isScanning && (
        <div className="scanning-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${scanningProgress}%` }}
            ></div>
          </div>
          <p>Scanning for nearby Bluetooth devices...</p>
        </div>
      )}

      <div className="devices-table-container">
        <table className="devices-table">
          <thead>
            <tr>
              <th>Device Name</th>
              <th>Device ID</th>
              <th>MAC Address</th>
              <th>Signal Strength</th>
              <th>Calibration</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 ? (
              <tr>
                <td colSpan="7" className="no-devices">
                  <Bluetooth size={48} />
                  <p>No devices found. Click "Scan Again" to scan for Bluetooth devices.</p>
                </td>
              </tr>
            ) : (
              devices.map((device, index) => (
                <tr key={device.address || index}>
                  <td className="device-name">
                    <Bluetooth size={20} />
                    {device.name || 'Unknown Device'}
                    {device.inDatabase && <span className="db-badge">DB</span>}
                  </td>
                  <td className="device-id">{device.device_id || '-'}</td>
                  <td className="device-address">{device.address}</td>
                  <td className="signal-strength">
                    {device.rssi ? `${device.rssi} dBm` : 'N/A'}
                  </td>
                  <td className="calibration">{device.calibration || '-'}</td>
                  <td className="device-status">
                    <span className={`status-badge ${device.connected ? 'connected' : 'disconnected'}`}>
                      {device.connected ? (
                        <>
                          <Wifi size={16} />
                          Connected
                        </>
                      ) : (
                        <>
                          <WifiOff size={16} />
                          Disconnected
                        </>
                      )}
                    </span>
                  </td>
                  <td className="device-actions">
                    {!device.inDatabase && (
                      <button 
                        className="add-to-db-btn"
                        onClick={() => openAddForm(device)}
                      >
                        Add to DB
                      </button>
                    )}
                    {device.connected ? (
                      <button 
                        className="disconnect-btn"
                        onClick={() => disconnectDevice(device.address)}
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button 
                        className="connect-btn"
                        onClick={() => connectDevice(device.address, device.name)}
                      >
                        Connect
                      </button>
                    )}
                    <button 
                      className="remove-btn"
                      onClick={() => removeDevice(device.address)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Device Modal */}
      {showAddForm && selectedDevice && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add Device to Database</h3>
              <button className="close-btn" onClick={closeForm}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Device Name *</label>
                <input
                  type="text"
                  value={deviceForm.name}
                  onChange={(e) => setDeviceForm({...deviceForm, name: e.target.value})}
                  placeholder="Enter device name"
                />
              </div>
              <div className="form-group">
                <label>Device ID *</label>
                <input
                  type="text"
                  value={deviceForm.deviceId}
                  onChange={(e) => setDeviceForm({...deviceForm, deviceId: e.target.value})}
                  placeholder="Enter unique device ID"
                />
              </div>
              <div className="form-group">
                <label>MAC Address (Auto-filled)</label>
                <input
                  type="text"
                  value={selectedDevice.address}
                  disabled
                  className="disabled-input"
                />
              </div>
              <div className="form-group">
                <label>Calibration Settings</label>
                <textarea
                  value={deviceForm.calibration}
                  onChange={(e) => setDeviceForm({...deviceForm, calibration: e.target.value})}
                  placeholder="Enter calibration parameters (optional)"
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={closeForm}>
                Cancel
              </button>
              <button className="save-btn" onClick={saveDeviceToDatabase}>
                <Save size={16} />
                Save to Database
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BluetoothManagement;
