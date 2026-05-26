import React, { useRef, useState, useEffect } from "react";
import client from "../api/client";

export function TestEmotionPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [emotion, setEmotion] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        if (mounted && videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraReady(true);
        }
      } catch (err: any) {
        if (mounted) {
          setError(`Camera error: ${err.message || "Could not access camera"}`);
        }
      }
    };
    startCamera();

    return () => {
      mounted = false;
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((t) => t.stop());
      }
    };
  }, []);

  const captureAndTest = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setLoading(true);
    setError("");
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      const video = videoRef.current;
      if (video.videoWidth === 0) throw new Error("Video not ready");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      canvas.toBlob(
        async (blob) => {
          try {
            if (!blob) throw new Error("Could not capture frame");

            const formData = new FormData();
            formData.append("file", blob, "test.jpg");

            const response = await client.post("/stream/test-emotion", formData);
            setEmotion(response.data.emotion);
            setScores(response.data.all_scores);
          } catch (err: any) {
            setError(`API error: ${err.message}`);
            console.error("Emotion test error:", err);
          } finally {
            setLoading(false);
          }
        },
        "image/jpeg",
        0.9
      );
    } catch (err: any) {
      setError(err.message || "Failed to capture frame");
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <h1>Emotion Detection Test</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>
        Test the emotion detection model by capturing your facial expression
      </p>

      <div style={styles.container}>
        <div style={styles.videoSection}>
          {!cameraReady && !error && (
            <div style={{ ...styles.video, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p>Requesting camera access...</p>
            </div>
          )}
          {cameraReady && <video ref={videoRef} autoPlay playsInline style={styles.video} />}
          {error && (
            <div style={{ ...styles.video, display: "flex", alignItems: "center", justifyContent: "center", background: "#fee" }}>
              <p style={{ color: "#c33" }}>{error}</p>
            </div>
          )}
          <canvas ref={canvasRef} style={{ display: "none" }} />
          <button
            onClick={captureAndTest}
            disabled={loading || !cameraReady}
            style={{ ...styles.testBtn, opacity: loading || !cameraReady ? 0.6 : 1 }}
          >
            {loading ? "Testing..." : "Test Emotion"}
          </button>
        </div>

        <div style={styles.resultsSection}>
          {emotion && (
            <>
              <h2 style={{ margin: "0 0 16px" }}>
                Detected: <span style={styles.emotion}>{emotion}</span>
              </h2>

              {scores && (
                <div style={styles.scoresGrid}>
                  {Object.entries(scores)
                    .sort(([, a], [, b]) => b - a)
                    .map(([label, score]) => (
                      <div key={label} style={styles.scoreItem}>
                        <div style={styles.scoreLabel}>{label}</div>
                        <div
                          style={{
                            ...styles.scoreBar,
                            width: `${Math.round(score * 100)}%`,
                          }}
                        />
                        <div style={styles.scoreValue}>{(score * 100).toFixed(1)}%</div>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
          {!emotion && <p style={{ color: "#999" }}>Test emotion results will appear here</p>}
        </div>
      </div>

      <div style={styles.instructions}>
        <h3>How to trigger each emotion:</h3>
        <ul>
          <li><strong>Angry:</strong> Frown hard, furrow eyebrows (bring them together), squint, tense your face</li>
          <li><strong>Happy:</strong> Smile widely, raise cheeks</li>
          <li><strong>Sad:</strong> Frown, drooping features, sad eyes</li>
          <li><strong>Fear:</strong> Wide eyes, raised eyebrows, open mouth slightly</li>
          <li><strong>Surprise:</strong> Wide eyes, raised eyebrows, open mouth</li>
          <li><strong>Disgust:</strong> Wrinkled nose, curled upper lip</li>
          <li><strong>Neutral:</strong> Relaxed face, no expression</li>
        </ul>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "24px 32px", maxWidth: 1000, margin: "0 auto" },
  container: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 },
  videoSection: { display: "flex", flexDirection: "column", alignItems: "center", gap: 16 },
  video: { width: "100%", height: 360, borderRadius: 8, background: "#000", objectFit: "cover" },
  testBtn: {
    background: "#4A90D9",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "12px 24px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
  },
  resultsSection: { padding: 16, background: "#f5f5f5", borderRadius: 8, minHeight: 200 },
  emotion: { color: "#4A90D9", fontSize: 20 },
  scoresGrid: { display: "flex", flexDirection: "column", gap: 12 },
  scoreItem: { display: "flex", alignItems: "center", gap: 12 },
  scoreLabel: { minWidth: 80, fontSize: 12, fontWeight: 700, textTransform: "uppercase" },
  scoreBar: { flex: 1, height: 20, background: "#4A90D9", borderRadius: 4 },
  scoreValue: { minWidth: 50, textAlign: "right", fontSize: 12, fontWeight: 700 },
  instructions: {
    background: "#f0f7ff",
    padding: 20,
    borderRadius: 8,
    borderLeft: "4px solid #4A90D9",
  },
};
