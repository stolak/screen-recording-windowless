import React, { useState, useEffect } from 'react';

const Home: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState<number | null>(null);
  const [durationMessage, setDurationMessage] = useState('');

  useEffect(() => {
    // Set up recording event listeners
    window.electronAPI.onStartRecording((_event, options) => {
      console.log('Start recording triggered with options:', options);
      setIsRecording(true);
      setRecordingDuration(null);
      setDurationMessage('');
    });

    window.electronAPI.onStopRecording(() => {
      console.log('Stop recording triggered');
      setIsRecording(false);
    });

    // Check if user is already logged in
    const checkLoginStatus = async () => {
      try {
        const token = await window.electronAPI.getStoreValue('authToken');
        if (token) {
          setIsLoggedIn(true);
        }
      } catch (error) {
        console.error('Error checking login status:', error);
      }
    };

    checkLoginStatus();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const loginUrl = await window.electronAPI.getLoginUrl();
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: username, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      if (data.token) {
        await window.electronAPI.setToken(data.token);
        setIsLoggedIn(true);
        setDurationMessage('Login successful!');
      } else {
        throw new Error('Token not found in response');
      }
    } catch (error) {
      alert('Login error: ' + (error as Error).message);
    }
  };

  const handleStartRecording = async () => {
    try {
      const response = await fetch('http://localhost:4571/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: `recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`,
          path: '',
        }),
      });

      if (response.ok) {
        console.log('Recording started');
      } else {
        console.error('Failed to start recording');
      }
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const handleStopRecording = async () => {
    try {
      const setting = await window.electronAPI.getStoreValue('setting');
      const videoUrl = setting?.videourl || 'http://localhost:3004';
      const response = await fetch('http://localhost:4571/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interactionId: `recording-${Date.now()}`,
          token: await window.electronAPI.getStoreValue('authToken'),
          url: videoUrl,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Recording stopped:', result);
        
        // Get the duration and display it
        if (recordingDuration) {
          setDurationMessage(`Your last screen recording is ${recordingDuration} seconds`);
        }
      } else {
        console.error('Failed to stop recording');
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  if (isLoggedIn) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Screen Recording Dashboard
          </h2>
          
          <div className="space-y-4">
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleStartRecording}
                disabled={isRecording}
                className={`btn-primary ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isRecording ? 'Recording...' : 'Start Recording'}
              </button>
              
              <button
                onClick={handleStopRecording}
                disabled={!isRecording}
                className={`btn-danger ${!isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Stop Recording
              </button>
            </div>

            {durationMessage && (
              <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800">{durationMessage}</p>
              </div>
            )}

            {isRecording && (
              <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800">Recording in progress...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Screen Recording Login
        </h2>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full btn-primary"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Home;
