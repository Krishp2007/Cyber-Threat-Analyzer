import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import "./App.css";
import Background3D from "./Background3D";

function App() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const theme =
    result?.prediction === "phishing"
      ? "phishing"
      : result?.prediction === "safe"
        ? "safe"
        : "neutral";

  const analyzeEmail = useCallback(async (emailToAnalyze) => {
    setLoading(true);
    setResult(null);

    try {
      const res = await axios.post("http://127.0.0.1:8000/predict", {
        email: emailToAnalyze,
      });
      setResult(res.data);
      setLoading(false);
    } catch (err) {
      alert("Backend error");
      setLoading(false);
    }
  }, []);

  const escapeRegExp = (value) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const highlightText = () => {
    if (!result || !Array.isArray(result.keywords) || result.keywords.length === 0)
      return email;

    let text = email;

    result.keywords.forEach((word) => {
      const escaped = escapeRegExp(word);
      const regex = new RegExp(`(${escaped})`, "gi");
      text = text.replace(regex, `<span class="highlight">$1</span>`);
    });

    return text;
  };

  const getRiskLevel = () => {
    if (!result) return "";
    const score = result.confidence;
    if (score > 0.75) return "HIGH";
    if (score > 0.4) return "MEDIUM";
    return "LOW";
  };

  const reasons = result?.reasons || result?.reason || [];

  useEffect(() => {
    if (email.length < 5) return;

    const delay = setTimeout(() => {
      analyzeEmail(email);
    }, 800); // wait 800ms after typing

    return () => clearTimeout(delay);
  }, [email, analyzeEmail]);

  const canAnalyze = email.trim().length >= 5 && !loading;

  

  return (
    <>
      <Background3D theme={theme} />
      <div className="overlay" aria-hidden="true" />

      <div className="app" data-theme={theme}>
        <div className="layout">
          <div className="left-panel">
            <h1 className="title">🛡️ Cyber Threat Analyzer</h1>
            <p className="subtitle">AI-powered phishing detection system</p>

            <div className="card input-card">
              <textarea
                placeholder="Paste suspicious email here..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <div className="meta-row">
                <span>
                  Auto-scan after you type ({Math.min(email.length, 9999)} chars)
                </span>
                <span className="muted">Tip: URLs are detected automatically</span>
              </div>

              <div className="buttons">
                <button
                  onClick={() => analyzeEmail(email)}
                  disabled={!canAnalyze}
                >
                  {loading ? "Scanning..." : "Scan Email"}
                </button>

                <button
                  className="clear"
                  onClick={() => setEmail("")}
                  disabled={!email || loading}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div className="right-panel">
            {loading && (
              <div className="loading">
                <div className="spinner"></div>
                <p>AI is analyzing the email...</p>
              </div>
            )}

            {loading && <div className="scan-line"></div>}

            {!loading && !result && (
              <div className="card idle-state">
                <h3>Ready when you are</h3>
                <p>
                  Paste an email on the left. We’ll highlight suspicious keywords,
                  detect URLs, and show a risk score.
                </p>
              </div>
            )}

            {result && (
              <div className="card dashboard">
                <div className={`status ${result.prediction}`}>
                  {result.prediction === "phishing"
                    ? "🚨 THREAT DETECTED"
                    : "✅ SAFE EMAIL"}
                </div>

                <div className="risk-label">
                  Risk Level: <span>{getRiskLevel()}</span>
                </div>

                <div className="progress">
                  <div
                    className="bar"
                    style={{ width: `${result.confidence * 100}%` }}
                  />
                </div>

                <p className="confidence">
                  {(result.confidence * 100).toFixed(1)}% Risk Score
                </p>

                <div
                  className="email-preview"
                  dangerouslySetInnerHTML={{ __html: highlightText() }}
                />

                <div className="grid">
                  <div className="box">
                    <h4>🧠 ML Confidence</h4>
                    <p>{result.ml_confidence}</p>
                  </div>

                  <div className="box">
                    <h4>⚠️ Keywords</h4>
                    <p>{(result.keywords || []).join(", ")}</p>
                  </div>

                  <div className="box">
                    <p>
                      <b>All URLs:</b>{" "}
                      {(result?.urls || []).join(", ") || "None"}
                    </p>
                    <p>
                      <b>Suspicious URLs:</b>{" "}
                      {(result?.suspicious_urls || []).join(", ") || "None"}
                    </p>
                  </div>

                  <div className="box">
                    <h4>📊 URL Count</h4>
                    <p>{result.url_count}</p>
                  </div>
                </div>

                <div className="details">
                  <h3>🔍 Analysis</h3>
                  <ul>
                    {reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {result && Array.isArray(result.word_scores) && (
              <div className="word-analysis">
                <h3>🧠 Threat Contribution</h3>

                {result.word_scores.map((w, i) => (
                  <div key={i} className="word-bar">
                    <span>{w.word}</span>
                    <div className="mini-bar">
                      <div
                        className="mini-fill"
                        style={{ width: `${w.score * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
