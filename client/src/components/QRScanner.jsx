import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button, LoadingSpinner } from './UI';
import { eventsAPI } from '../services/api';

const QRScanner = ({ eventId, onClose, onCheckIn }) => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    fetchStats();
    return () => stopScanner();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await eventsAPI.getCheckInStats(eventId);
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const startScanner = async () => {
    try {
      setError(null);
      setResult(null);
      const html5QrCode = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess,
        () => {}
      );
      setScanning(true);
    } catch (err) {
      setError('Unable to access camera. Please check permissions or use manual entry.');
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (e) {
        // ignore
      }
      html5QrCodeRef.current = null;
    }
    setScanning(false);
  };

  const onScanSuccess = async (decodedText) => {
    await stopScanner();
    await processCheckIn(decodedText);
  };

  const processCheckIn = async (rawData) => {
    setProcessing(true);
    setError(null);
    setResult(null);

    try {
      let checkInCode;
      try {
        const parsed = JSON.parse(rawData);
        if (parsed.type !== 'utm-checkin') {
          setError('Invalid QR code — not a UTMEngage ticket');
          setProcessing(false);
          return;
        }
        checkInCode = parsed.checkInCode;
      } catch {
        checkInCode = rawData.trim();
      }

      const response = await eventsAPI.checkIn(eventId, checkInCode);
      setResult({
        success: true,
        message: response.data.message,
        registration: response.data.registration
      });
      setStats(response.data.stats);
      if (onCheckIn) onCheckIn(response.data);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Check-in failed';
      const reg = err.response?.data?.registration;
      setResult({ success: false, message: errMsg, registration: reg });
    } finally {
      setProcessing(false);
    }
  };

  const handleManualCheckIn = () => {
    if (!manualCode.trim()) return;
    processCheckIn(manualCode.trim());
  };

  const handleScanAgain = () => {
    setResult(null);
    setError(null);
    setManualCode('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#005eb8] to-[#00b5e2] p-4 text-white flex items-center justify-between">
          <h2 className="text-lg font-bold">QR Check-In Scanner</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-[#005eb8]">{stats.total}</p>
                <p className="text-xs text-gray-500">Registered</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{stats.checkedIn}</p>
                <p className="text-xs text-gray-500">Checked In</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                <p className="text-xs text-gray-500">Pending</p>
              </div>
            </div>
          )}

          {/* Processing */}
          {processing && (
            <div className="text-center py-4">
              <LoadingSpinner />
              <p className="text-gray-500 mt-2">Processing check-in...</p>
            </div>
          )}

          {/* Result display */}
          {result && !processing && (
            <div className={`p-4 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                {result.success ? (
                  <CheckCircle size={24} className="text-green-600" />
                ) : (
                  <XCircle size={24} className="text-red-600" />
                )}
                <p className={`font-bold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                  {result.message}
                </p>
              </div>
              {result.registration?.user && (
                <div className="mt-2 pl-8">
                  <p className="text-gray-700 font-medium">{result.registration.user.name}</p>
                  <p className="text-gray-500 text-sm">{result.registration.user.email}</p>
                  {result.registration.user.department && (
                    <p className="text-gray-500 text-sm">{result.registration.user.department}</p>
                  )}
                </div>
              )}
              <Button onClick={handleScanAgain} className="mt-3 w-full">
                Scan Next Attendee
              </Button>
            </div>
          )}

          {/* Scanner area */}
          {!result && !processing && (
            <>
              <div id="qr-reader" className="w-full rounded-lg overflow-hidden"></div>

              {!scanning && (
                <Button onClick={startScanner} className="w-full">
                  <Camera size={16} /> Start Camera Scanner
                </Button>
              )}

              {scanning && (
                <Button variant="outline" onClick={stopScanner} className="w-full">
                  Stop Scanner
                </Button>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Manual entry fallback */}
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-2">Or enter check-in code manually:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Enter check-in code..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#005eb8] focus:border-transparent outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleManualCheckIn()}
                  />
                  <Button onClick={handleManualCheckIn} disabled={!manualCode.trim()}>
                    Check In
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
