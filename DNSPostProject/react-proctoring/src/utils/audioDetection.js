/**
 * Audio Detection Utility
 * Uses AnalyserNode to detect continuous sound levels (voice)
 */
export const initAudioDetection = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyzer = audioCtx.createAnalyser();
      analyzer.fftSize = 512;
      source.connect(analyzer);
  
      return {
        analyzer,
        stream,
        cleanup: () => {
          stream.getTracks().forEach(t => t.stop());
          audioCtx.close();
        }
      };
    } catch (err) {
      console.error('Audio initialization failed:', err);
      return { analyzer: null, stream: null, cleanup: () => {} };
    }
  };
  
  export const startAudioAnalysis = (analyzer, onVoiceDetected) => {
    if (!analyzer) return;
  
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let talkingCounter = 0;
  
    const checkAudio = () => {
      analyzer.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
      const average = sum / bufferLength;
  
      // Threshold for voice (empirical)
      if (average > 25) { 
        talkingCounter++;
        // If sound lasts > 15 frames (~250ms)
        if (talkingCounter > 15) {
          onVoiceDetected(true);
        }
      } else {
        talkingCounter = 0;
        onVoiceDetected(false);
      }
  
      requestAnimationFrame(checkAudio);
    };
  
    checkAudio();
  };
  
