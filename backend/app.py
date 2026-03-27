from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import os
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
import datetime
import requests
from dotenv import load_dotenv
import json
from flask_bcrypt import generate_password_hash, check_password_hash

app = Flask(__name__)
# CHANGE 1: Added PUT and OPTIONS to allowed methods for profile updates
CORS(app, resources={r"/*": {"origins": "http://localhost:5173", "methods": ["GET", "POST", "PUT", "OPTIONS"]}})

# --- CONFIGURATION ---
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///cvd_database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'cvd-secure-jwt-secret-key-2026-v1-stable-production-final-ultra-secure' 
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

# --- DATABASE MODELS ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    history = db.relationship('HealthHistory', backref='user', lazy=True)

class HealthHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    risk_score = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), nullable=False)
    features_json = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.datetime.utcnow)

# --- ML MODEL LOADING ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
try:
    model_path = os.path.join(BASE_DIR, 'models', 'cvd_model.pkl')
    scaler_path = os.path.join(BASE_DIR, 'models', 'scaler.pkl')
    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    print("✓ CVD ML System: Loaded Successfully.")
except Exception as e:
    print(f"✗ ML Loading Error: {e}")

# --- AUTH ROUTES ---

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')

    if not username or not email or not password:
        return jsonify({"message": "All fields are required"}), 400
    
    if len(password) < 6:
        return jsonify({"message": "Password must be at least 6 characters"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"message": "Username already taken"}), 400
    
    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already registered"}), 400

    hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')
    new_user = User(username=username, email=email, password=hashed_pw)
    
    db.session.add(new_user)
    db.session.commit()
    
    token = create_access_token(identity=str(new_user.id))
    return jsonify({"token": token, "username": username}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(username=data.get('username')).first()
    if user and bcrypt.check_password_hash(user.password, data.get('password')):
        return jsonify({"token": create_access_token(identity=str(user.id)), "username": user.username}), 200
    return jsonify({"message": "Invalid credentials"}), 401

# --- PREDICTION LOGIC ---

@app.route('/predict', methods=['POST'])
@jwt_required()  
def predict():
    try:
        user_id = get_jwt_identity()
        data = request.json.get('features')
        features_scaled = scaler.transform(np.array([data]))
        probabilities = model.predict_proba(features_scaled)[0]
        risk_score = round(float(probabilities[0] * 100), 2)
        status = "High Risk" if risk_score > 50 else "Low Risk"
        
        new_entry = HealthHistory(
            user_id=int(user_id), 
            risk_score=risk_score, 
            status=status,
            features_json=json.dumps(data) 
        )
        db.session.add(new_entry)
        db.session.commit()
        
        return jsonify({"status": status, "risk_score": risk_score})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/history', methods=['GET'])
@jwt_required()
def get_history():
    user_id = get_jwt_identity()
    history = HealthHistory.query.filter_by(user_id=int(user_id)).order_by(HealthHistory.id.desc()).all()
    return jsonify([{
        "risk_score": h.risk_score,
        "status": h.status,
        "timestamp": h.timestamp.strftime("%Y-%m-%d %H:%M") if h.timestamp else "N/A",
        "features_json": h.features_json  
    } for h in history])
    
# --- CHANGE 2: Unified Update Profile Route (supports name and email) ---
@app.route('/api/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    data = request.json
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    
    if not user:
        return jsonify({"error": "User not found"}), 404

    if 'name' in data: # Matches frontend 'name' field
        user.username = data['name']
    if 'email' in data:
        user.email = data['email']
        
    db.session.commit()
    return jsonify({"message": "Profile updated successfully", "username": user.username}), 200

@app.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    data = request.json
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    
    if bcrypt.check_password_hash(user.password, data['current_password']):
        user.password = bcrypt.generate_password_hash(data['new_password']).decode('utf-8')
        db.session.commit()
        return jsonify({"msg": "Password updated"}), 200
    return jsonify({"msg": "Current password incorrect"}), 400


# --- THE CHATBOT ---

@app.route('/api/chatbot', methods=['POST'])
@jwt_required()
def chatbot():
    user_msg = request.json.get('message', '')
    user_id = get_jwt_identity()

    last = HealthHistory.query.filter_by(user_id=int(user_id)).order_by(HealthHistory.timestamp.desc()).first()
    
    # CHANGE 3: Professional Guardrail - Stop if no history exists
    if not last or not last.features_json:
        return jsonify({"response": "I cannot provide a clinical analysis yet. Please complete a cardiovascular assessment first so I can review your biometrics."})

    try:
        f = json.loads(last.features_json)
        context = (
            f"User's Risk: {last.risk_score}% ({last.status}). "
            f"Data: BP={f[3]}/{f[4]}, Chol={f[7]}, Glucose={f[8]}, Smoke={f[9]}, Alcohol={f[10]}."
        )
    except:
        context = f"User Risk: {last.risk_score}%. Factors unavailable."

    load_dotenv()
    hf_token = os.getenv("HUGGINGFACE_TOKEN")
    if not hf_token:
        return jsonify({"response": "API Key is missing."})

    API_URL = "https://router.huggingface.co/v1/chat/completions"
    headers = {"Authorization": f"Bearer {hf_token.strip()}", "Content-Type": "application/json"}

    try:
        payload = {
            "model": "meta-llama/Meta-Llama-3-8B-Instruct",
            "messages": [
                {
                    "role": "system", 
                    "content": (
                        "You are a Clinical Cardiovascular Assistant. "
                        "1. Use '###' for headers and '---' for dividers.\n"
                        "2. Identify the most concerning factor in the context (BP, Glucose, or Chol).\n"
                        "3. Explain why that factor impacts the score.\n"
                        "4. Use 🔴 for High Risk (>50%) and 🟢 for Low Risk.\n"
                        "5. Keep response under 150 words."
                    )
                },
                {"role": "user", "content": f"Context: {context}\n\nUser Question: {user_msg}"}
            ],
            "max_tokens": 300
        }
        
        response = requests.post(API_URL, headers=headers, json=payload, timeout=15)
        output = response.json()

        if "choices" in output:
            bot_text = output['choices'][0]['message']['content'].strip()
            return jsonify({"response": bot_text})
        
        return jsonify({"response": f"System error. Last score was {last.risk_score if last else 'N/A'}%."})

    except Exception as e:
        return jsonify({"response": "I'm having trouble analyzing the data. Please try again later."})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5001)