import React, { useState, useEffect, useRef } from 'react';
import { Recording } from '../electron/preload';

const Recordings: React.FC = () => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [filteredRecordings, setFilteredRecordings] = useState<Recording[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortDesc, setSortDesc] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const prevRecording = useRef(false);

  const toFileUrl = (p: string) => encodeURI(`file:///${p.replace(/\\/g, '/')}`);

  useEffect(() => {
    loadRecordings();
  }, []);

  useEffect(() => {
    filterAndSortRecordings();
  }, [recordings, searchQuery, sortDesc]);

  // Poll server /status so UI reflects actual recording state regardless of source
  useEffect(() => {
    let isMounted = true;
    const poll = async () => {
      try {
        const res = await fetch('http://localhost:4571/status');
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;
        const current = Boolean(data.recording);
        // Detect transition from recording -> idle and refresh list shortly after
        if (prevRecording.current && !current) {
          setTimeout(loadRecordings, 1500);
        }
        prevRecording.current = current;
        setIsRecording(current);
      } catch (e) {
        // ignore transient errors
      }
    };
    const id = setInterval(poll, 1500);
    poll();
    return () => { isMounted = false; clearInterval(id); };
  }, []);

  const loadRecordings = async () => {
    try {
      const allRecordings = await window.electronAPI.getAllRecordings();
      setRecordings(allRecordings);
    } catch (error) {
      console.error('Error loading recordings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartRecording = async () => {
    try {
      const res = await fetch('http://localhost:4571/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: `recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`,
          path: '',
        }),
      });
      if (!res.ok) throw new Error('Failed to start recording');
      setIsRecording(true);
    } catch (e) {
      console.error(e);
      alert('Could not start recording');
    }
  };

  const handleStopRecording = async () => {
    try {
      const setting = await window.electronAPI.getStoreValue('setting');
      const videoUrl = setting?.videourl || 'http://localhost:3004';
      const token = await window.electronAPI.getStoreValue('authToken');
      const res = await fetch('http://localhost:4571/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interactionId: `recording-${Date.now()}`,
          token,
          url: videoUrl,
        }),
      });
      if (!res.ok) throw new Error('Failed to stop recording');
      setIsRecording(false);
      // Optionally refresh list shortly after stop to ensure new item appears
      setTimeout(loadRecordings, 1500);
    } catch (e) {
      console.error(e);
      alert('Could not stop recording');
    }
  };

  const filterAndSortRecordings = () => {
    let filtered = recordings.filter(rec =>
      rec.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.date.toLowerCase().includes(searchQuery.toLowerCase())
    );

    filtered.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return sortDesc ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
    });

    setFilteredRecordings(filtered);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this recording?')) {
      try {
        await window.electronAPI.deleteRecordingById(id);
        await loadRecordings();
      } catch (error) {
        console.error('Error deleting recording:', error);
        alert('Error deleting recording');
      }
    }
  };

  const handlePlay = (recording: Recording) => {
    setSelectedRecording(recording);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRecording(null);
  };

  const formatDuration = (seconds: number): string => {
    if (!seconds) return "0:00";
  
    // round total seconds to nearest integer
    const totalSeconds = Math.round(seconds);
  
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
  
    return `${m}:${s.toString().padStart(2, "0")}`;
  };
  

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStats = () => {
    const totalDuration = recordings.reduce((sum, r) => sum + (r.duration || 0), 0);
    const longRecordings = recordings.filter(r => (r.duration || 0) >= 60).length;
    
    console.log('Total duration:', totalDuration);
    return {
      total: recordings.length,
      durationFormatted: formatDuration(totalDuration),
      averageDurationFormatted: formatDuration(totalDuration / recordings.length),
    
    };
  };

  const stats = getStats();

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading recordings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Screen Recordings</h1>
        <p className="text-gray-600">Manage and view your recorded content</p>
        <div className="items-center gap-3 w-full sm:w-auto mt-4">
          <button
            onClick={handleStartRecording}
            disabled={isRecording}
            className={`btn-primary ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isRecording ? 'Recording…' : 'Start Recording'}
          </button>
          <button
            onClick={handleStopRecording}
            disabled={!isRecording}
            className={`btn-danger ${!isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Stop Recording
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card text-center">
          <div className="text-3xl font-bold text-primary-600">{stats.total}</div>
          <div className="text-gray-600">Total Recordings</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-primary-600">{stats.durationFormatted}</div>
          <div className="text-gray-600">Total Duration</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-primary-600">{stats.averageDurationFormatted}</div>
          <div className="text-gray-600">Average Duration</div>
        </div>
      </div>

      {/* Recording Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        

        {/* Search and Sort */}
       
          <div className="relative max-w-sm w-full">
            <input
              type="text"
              placeholder="Search recordings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          
          <button
            onClick={() => setSortDesc(!sortDesc)}
            className="btn-secondary flex items-center gap-2"
          >
            <span>Sort by date</span>
            <svg
              className={`h-4 w-4 transition-transform ${sortDesc ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
          </button>
        
      </div>

      {/* Recordings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecordings.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📹</div>
            <p className="text-gray-600 text-lg">No recordings found</p>
            {searchQuery && (
              <p className="text-gray-500 mt-2">Try adjusting your search terms</p>
            )}
          </div>
        ) : (
          filteredRecordings.map((recording) => (
            <div key={recording.id} className="card">
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-800 truncate" title={recording.filename}>
                  {recording.filename}
                </h3>
                
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {formatDate(recording.date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatTime(recording.date)}
                  </span>
                </div>
                
                <div className="inline-block bg-gradient-to-r from-purple-500 to-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  {formatDuration(recording.duration)}
                </div>
                
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handlePlay(recording)}
                    className="flex-1 btn-primary flex items-center justify-center gap-2"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    Play
                  </button>
                  
                  <button
                    onClick={() => handleDelete(recording.id)}
                    className="btn-danger p-2"
                    title="Delete recording"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Play Modal */}
      {showModal && selectedRecording && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-800">
                Play Recording: {selectedRecording.filename}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <video
                controls
                className="w-full h-auto max-h-[60vh] rounded-lg"
                src={`media://${selectedRecording.path}`}
              >
                Your browser does not support the video tag.
              </video>
              
              <div className="mt-4 text-sm text-gray-600">
                <p><strong>Duration:</strong> {formatDuration(selectedRecording.duration)}</p>
                <p><strong>Date:</strong> {new Date(selectedRecording.date).toLocaleString()}</p>
                <p><strong>Path:</strong> {toFileUrl(selectedRecording.path)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recordings;
