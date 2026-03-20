from fastapi import FastAPI
from pydantic import BaseModel
import pickle
import re
from scipy.sparse import hstack
import datetime

# ----------------------
# Load model
# ----------------------
model = pickle.load(open("model.pkl", "rb"))
word_vectorizer = pickle.load(open("word_vectorizer.pkl", "rb"))
char_vectorizer = pickle.load(open("char_vectorizer.pkl", "rb"))

app = FastAPI()


from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------
# Schema
# ----------------------
class EmailRequest(BaseModel):
    email: str

# ----------------------
# Cleaning
# ----------------------
def clean_text(text):
    text = text.lower()
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"[^a-zA-Z ]", "", text)
    return text

# ----------------------
# Keyword severity
# ----------------------
keyword_weights = {
    "verify": 0.15,
    "account": 0.1,
    "password": 0.2,
    "urgent": 0.15,
    "click": 0.1,
    "login": 0.15,
    "bank": 0.1,
    "suspend": 0.2
}

def rule_engine(text):
    score = 0
    found = []

    for word, weight in keyword_weights.items():
        if word in text:
            score += weight
            found.append(word)

    return score, found

# ----------------------
# URL Analyzer
# ----------------------
def detect_urls(text):
    urls = re.findall(r'http\S+|www\S+', text)

    suspicious = []
    all_urls = urls

    for url in urls:
        if any(x in url.lower() for x in ["login", "verify", "secure", "update"]):
            suspicious.append(url)

    return {
        "all_urls": all_urls,
        "suspicious_urls": suspicious
    }

# ----------------------
# Risk Engine
# ----------------------
def calculate_risk(ml_conf, rule_score, url_count):

    # weaken low-confidence predictions
    ml_component = (ml_conf ** 1.5) * 0.5

    rule_component = min(rule_score, 1.0) * 0.3
    url_component = min(url_count * 0.2, 0.4)

    final_score = ml_component + rule_component + url_component

    # remove noise
    if final_score < 0.2:
        final_score = 0

    return min(final_score, 1.0)

# ----------------------
# Prediction
# ----------------------
def predict_email(email):
    original_email = email
    cleaned = clean_text(email)

    # ML
    X_word = word_vectorizer.transform([cleaned])
    X_char = char_vectorizer.transform([cleaned])
    X = hstack([X_word, X_char])

    pred = model.predict(X)[0]
    prob = model.predict_proba(X)[0]
    ml_conf = abs(prob[1] - prob[0])

    # Rules
    rule_score, keywords = rule_engine(cleaned)

    url_data = detect_urls(original_email)

    url_count = len(url_data["all_urls"])
    suspicious_urls = url_data["suspicious_urls"]
    all_urls = url_data["all_urls"]

    # Risk
    final_score = calculate_risk(ml_conf, rule_score, url_count)

    final_prediction = "phishing" if final_score > 0.5 else "safe"

    # Explanation
    reasons = []
    if keywords:
        reasons.append(f"Suspicious keywords: {keywords}")
    if suspicious_urls:
        reasons.append(f"Suspicious URLs detected")
    if ml_conf > 0.8:
        reasons.append("ML model strongly confident")

    
    if len(cleaned.strip()) < 5:
        return {
            "prediction": "safe",
            "confidence": 0.0,
            "reason": ["Input too short / empty"]
        }
    
    word_scores = []

    for word in keywords:
        if word in keyword_weights:
            word_scores.append({
                "word": word,
                "score": keyword_weights[word]
        })

    result = {
        "prediction": final_prediction,
        "confidence": round(final_score, 3),
        "ml_confidence": round(ml_conf, 3),
        "rule_score": round(rule_score, 3),
        "keywords": keywords,
        "reasons": reasons,
        "word_scores": word_scores,
        "url_count": url_count,
        "urls": all_urls,
        "suspicious_urls": suspicious_urls,
    }

    log_request(original_email, result)

    return result

# ----------------------
# Logging
# ----------------------
def log_request(email, result):
    with open("logs.txt", "a") as f:
        f.write(f"{datetime.datetime.now()} | {email} | {result}\n")

# ----------------------
# Routes
# ----------------------
@app.get("/")
def home():
    return {"message": "Phishing Detection API 🚀"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/predict")
def predict(data: EmailRequest):
    return predict_email(data.email)