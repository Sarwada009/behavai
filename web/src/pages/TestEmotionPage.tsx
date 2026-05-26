import React, { useRef, useState, useEffect } from "react";
import client from "../api/client";

export function TestEmotionPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [emotion, setEmotion] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError("Could not access camera");
      }
    };
    startCamera();

    return () => {
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
      if (ctx) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);

        canvas.toBlob(async (blob) => {
          if (!blob) return;

          const formData = new FormData();
          formData.append("file", blob, "test.jpg");

          const response = await client.post("/stream/test-emotion", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          setEmotion(response.data.emotion);
          setScores(response.data.all_scores);
        }, "image/jpeg");
      }
    } catch (err) {
      setError("Failed to test emotion");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <h1>Emotion Detection Test</h1>

      <div style={styles.container}>
        <div style={styles.videoSection}>
          <video
            ref={videoRef}
            autoPlay
            style={styles.video}
          />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          <button
            onClick={captureAndTest}
            disabled={loading}
            style={styles.testBtn}
          >
            {loading ? "Testing..." : "Test Emotion"}
          </button>
        </div>

        <div style={styles.resultsSection}>
          {error && <p style={{ color: "#e53935" }}>{error}</p>}

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
        </div>
      </div>

      <div style={styles.instructions}>
        <h3>Instructions:</h3>
        <ul>
          <li>Click "Test Emotion" to capture your current facial expression</li>
          <li><strong>Happy:</strong> Smile widely</li>
          <li><strong>Angry:</strong> Frown, furrow eyebrows, intense look</li>
          <li><strong>Sad:</strong> Frown, drooping features</li>
          <li><strong>Fear:</strong> Wide eyes, raised eyebrows, open mouth</li>
          <li><strong>Surprise:</strong> Wide eyes, raised eyebrows</li>
          <li><strong>Disgust:</strong> Wrinkled nose, curled lip</li>
          <li><strong>Neutral:</strong> Resting face, no expression</li>
        </ul>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: "24px 32px", maxWidth: 1000, margin: "0 auto" },
  container: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 },
  videoSection: { display: "flex", flexDirection: "column", alignItems: "center", gap: 16 },
  video: { width: "100%", borderRadius: 8, background: "#000" },
  testBtn: {
    background: "#4A90D9",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 24px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
  },
  resultsSection: { padding: 16, background: "#f5f5f5", borderRadius: 8 },
  emotion: { color: "#4A90D9", fontSize: 20 },
  scoresGrid: { display: "flex", flexDirection: "column", gap: 12 },
  scoreItem: { display: "flex", alignItems: "center", gap: 12 },
  scoreLabel: { minWidth: 80, fontSize: 12, fontWeight: 700, textTransform: "uppercase" },
  scoreBar: { height: 20, background: "#4A90D9", borderRadius: 4 },
  scoreValue: { minWidth: 50, textAlign: "right", fontSize: 12, fontWeight: 700 },
  instructions: {
    background: "#f0f7ff",
    padding: 20,
    borderRadius: 8,
    borderLeft: "4px solid #4A90D9",
  },
};
