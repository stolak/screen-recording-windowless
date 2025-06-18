console.log('[Renderer] Script loaded');

let mediaRecorder;
let recordedChunks = [];
let recordingOptions = {};

window.electronAPI.onStartRecording(async (_event, options) => {
  console.log('[Renderer] Start recording triggered with options:', options);
  recordingOptions = options;

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
