# 🛡️ Cyber Threat Analyzer
**A Hybrid ML & Heuristic Phishing Detection Suite**

This project is a full-stack web application designed to identify phishing emails with high precision. It uses a unique "Risk Engine" that combines Machine Learning (Naive Bayes) with manual rule-based scoring and URL inspection.

## 🧠 How it Works
The analyzer calculates a risk score (0.0 to 1.0) based on three pillars:
1. **Machine Learning**: A Multinomial Naive Bayes model trained on 18,000+ emails.
2. **Keyword Heuristics**: Assigns weights to suspicious words like *urgent*, *verify*, and *password*.
3. **URL Inspection**: Scans for deceptive links within the email body.

## 📊 Performance
- **Accuracy**: ~94.7%
- **Vectorization**: Combined Word and Character-level TF-IDF for robust feature extraction.

## 🛠️ Tech Stack
- **Backend**: Python, FastAPI, Scikit-Learn
- **Frontend**: React, Three.js (Background3D)
- **Deployment**: Vercel (Serverless)
