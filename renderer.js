console.log('[Renderer] Script loaded');

let mediaRecorder;
let recordedChunks = [];
let recordingOptions = {};
let recordingStartTime = null;
let recordingDuration = null;

let Store;
let storePromise = (async () => {
  Store = (await import('electron-store')).default;
  return new Store();
})();

window.electronAPI.onStartRecording(async (_event, options) => {
  // Set defaults for filename and path if not provided
  let filename = options.filename;
  let savePath = options.path;
  if (!filename) {
    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    filename = `recording-${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.webm`;
  }
  if (!savePath) {
    // Use Electron's API to get Desktop path if available, else fallback
    if (window.electronAPI && window.electronAPI.getDesktopPath) {
      let desktopPath = await window.electronAPI.getDesktopPath();
      savePath = `${desktopPath}${desktopPath.endsWith('/') || desktopPath.endsWith('\\') ? '' : (desktopPath.includes('\\') ? '\\' : '/') }screen-recorder`;
    } else {
      savePath = '';
    }
  }
  recordingOptions = { ...options, filename, path: savePath };
  recordingStartTime = Date.now();

  try {
    const sources = await window.electronAPI.getDesktopSources();
    console.log("Debugging 0", sources);

    if (!sources || sources.length === 0) {
      console.error("No desktop sources found.");
      return;
    }

    // Get video and audio streams separately, then combine them
    const videoStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sources[0].id,
        },
      },
    });

    let combinedStream;
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      const audioTrack = audioStream.getAudioTracks()[0];
      const videoTrack = videoStream.getVideoTracks()[0];
      combinedStream = new MediaStream([videoTrack, audioTrack]);
      console.log('Successfully combined video and audio streams.');
    } catch (audioError) {
      console.warn('Could not get audio stream, proceeding with video only.', audioError);
      combinedStream = videoStream; // Fallback to video-only
    }

    const stream = combinedStream;

    recordedChunks = [];
    console.log("Debugging 1");
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
    console.log("Debugging 2");
    mediaRecorder.ondataavailable = (e) => recordedChunks.push(e.data);
    console.log("Debugging 3");
    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const arrayBuffer = await blob.arrayBuffer();

      if (recordingStartTime) {
        recordingDuration = Math.floor((Date.now() - recordingStartTime) / 1000);
        console.log('Recording duration (seconds):', recordingDuration);
        window.electronAPI.sendRecordingStopped({ duration: recordingDuration });
      }

      // Wait a tick to ensure main process receives duration before saving
      setTimeout(async () => {
        const filePath = await window.electronAPI.saveRecording({
          arrayBuffer,
          ...recordingOptions,
        });

        if (filePath) {
          console.log('[Recorder] Saved to:', filePath);
          window.electronAPI.sendSavedPath(filePath);
        } else {
          console.error('[Recorder] Failed to save file.');
        }
        // Display duration on the home page
        let durationMsg = document.getElementById('recording-duration-msg');
        if (durationMsg) {
          durationMsg.textContent = `Your last screen recording is ${recordingDuration} seconds`;
          durationMsg.style.display = 'block';
        }
      }, 50); // 50ms delay to ensure duration is set in main process
    };

    mediaRecorder.start();
  } catch (err) {
    console.error('Error starting recording:', err);
  }
});

window.electronAPI.onStopRecording(() => {
  console.log('[Renderer] Stop recording triggered');
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
});

// Login form handling
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    console.log("Debugging 4");
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginUrl = await window.electronAPI.getLoginUrl();
    console.log("loginUrl",loginUrl)
    try {
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email:username, password }),
      });
      if (!response.ok) {
        throw new Error('Login failed');
      }
      const data = await response.json();
      if (data.token) {
        await window.electronAPI.setToken(data.token);
        // Hide the form and show login message
        loginForm.style.display = 'none';
        const msg = document.createElement('div');
        msg.textContent = 'You are login';
        msg.style.marginTop = '20px';
        loginForm.parentNode.appendChild(msg);
      } else {
        throw new Error('Token not found in response');
      }
    } catch (error) {
      alert('Login error: ' + error.message);
    }finally{
 //
    }
  });
}


