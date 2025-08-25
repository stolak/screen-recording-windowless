import React, { useState, useEffect } from 'react';

interface Settings {
  loginurl?: string;
  videourl?: string;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await window.electronAPI.getStoreValue('setting');
      if (savedSettings) {
        setSettings(savedSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await window.electronAPI.setSetting(settings);
      alert('Settings saved successfully!');
    } catch (error) {
      alert('Error saving settings: ' + (error as Error).message);
    }
  };

  const handleInputChange = (field: keyof Settings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Settings
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="loginurl" className="block text-sm font-medium text-gray-700 mb-2">
              Login API URL
            </label>
            <input
              type="url"
              id="loginurl"
              value={settings.loginurl || ''}
              onChange={(e) => handleInputChange('loginurl', e.target.value)}
              placeholder="https://your-api.com/api/auth/signin"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="mt-1 text-sm text-gray-500">
              The endpoint for user authentication
            </p>
          </div>
          
          <div>
            <label htmlFor="videourl" className="block text-sm font-medium text-gray-700 mb-2">
              Video Upload URL
            </label>
            <input
              type="url"
              id="videourl"
              value={settings.videourl || ''}
              onChange={(e) => handleInputChange('videourl', e.target.value)}
              placeholder="https://your-api.com/api/v1/upload-file"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="mt-1 text-sm text-gray-500">
              The endpoint for uploading recorded videos
            </p>
          </div>
          
          <div className="pt-4">
            <button
              type="submit"
              className="w-full btn-primary"
            >
              Save Settings
            </button>
          </div>
        </form>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium text-gray-800 mb-2">Environment Variables</h3>
          <p className="text-sm text-gray-600 mb-2">
            You can also set these values using environment variables:
          </p>
          <div className="space-y-1 text-sm font-mono text-gray-700">
            <div>LOGIN_URL=https://your-api.com/api/auth/signin</div>
            <div>VIDEO_URL=https://your-api.com/api/v1/upload-file</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
