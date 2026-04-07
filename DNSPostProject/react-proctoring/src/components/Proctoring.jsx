import { useRef, useState, useEffect } from "react";

export default function Proctoring() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [status, setStatus] = useState("INIT");
  const [error, setError] = useState("");

  const startMonitoring = async () => {
    setStatus("STARTING");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;

      const video = videoRef.current;
      video.srcObject = stream;

      await video.play();

      setStatus("ACTIVE");

    } catch (err) {
      console.error(err);

      if (err.name === "NotAllowedError") {
        setError("Permission denied");
      } else if (err.name === "NotFoundError") {
        setError("No camera found");
      } else {
        setError(err.message);
      }

      setStatus("ERROR");
    }
  };

  // CLEANUP
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="bg-black text-white p-3 rounded-lg">

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={`w-full h-40 rounded-lg border-4 ${status === "ACTIVE" ? "border-green-500" : "border-red-500"
          }`}
      />

      <p className="mt-2 text-sm">
        {status === "INIT" && "Initializing AI..."}
        {status === "STARTING" && "Requesting permissions..."}
        {status === "ACTIVE" && "Monitoring Active ✅"}
        {status === "ERROR" && <span className="text-red-400">{error}</span>}
      </p>

      <button
        onClick={startMonitoring}
        className="mt-3 w-full bg-purple-600 py-2 rounded"
      >
        Start AI Monitoring
      </button>
    </div>
  );
}