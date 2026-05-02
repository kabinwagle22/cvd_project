from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import os
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from sqlalchemy import text
import datetime
import requests
from dotenv import load_dotenv
import json
from flask_bcrypt import generate_password_hash, check_password_hash

app = Flask(__name__)

CORS(app, supports_credentials=True, resources={r"/*": {"origins": "*"}})

#CORS(app, resources={r"/*": {"origins": "http://localhost:5173", "methods": ["GET", "POST", "PUT", "OPTIONS"]}})

# --- RATE LIMITING ---
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

# --- CONFIGURATION ---
load_dotenv()  # Load environment variables from .env file
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///cvd_database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'dev-secret-key-change-in-production') 
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

# --- DATABASE MODELS ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    last_password_change = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    history = db.relationship('HealthHistory', backref='user', lazy=True)

class HealthHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    risk_score = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), nullable=False)
    features_json = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.datetime.utcnow)


def ensure_password_change_column():
    inspector = db.inspect(db.engine)
    if 'user' not in inspector.get_table_names():
        return
    with db.engine.connect() as conn:
        result = conn.execute(text("PRAGMA table_info('user')"))
        columns = [row[1] for row in result.fetchall()]
        if 'last_password_change' not in columns:
            conn.execute(text("ALTER TABLE user ADD COLUMN last_password_change TIMESTAMP"))
            db.session.commit()

with app.app_context():
    ensure_password_change_column()

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
@limiter.limit("5 per minute")
def register():
    data = request.json
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')

    if not username or not email or not password:
        return jsonify({"success": False, "error": "All fields are required"}), 400
    
    if len(username) < 3:
        return jsonify({"success": False, "error": "Username must be at least 3 characters"}), 400
    
    if len(password) < 6:
        return jsonify({"success": False, "error": "Password must be at least 6 characters"}), 400
    
    # Email validation
    if '@' not in email or '.' not in email:
        return jsonify({"success": False, "error": "Invalid email format"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"success": False, "error": "Username already taken"}), 400
    
    if User.query.filter_by(email=email).first():
        return jsonify({"success": False, "error": "Email already registered"}), 400

    hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')
    new_user = User(
        username=username,
        email=email,
        password=hashed_pw,
        last_password_change=datetime.datetime.utcnow()
    )
    
    db.session.add(new_user)
    db.session.commit()
    
    token = create_access_token(identity=str(new_user.id))
    return jsonify({"success": True, "data": {"token": token, "username": username}}), 201

@app.route('/login', methods=['POST'])
@limiter.limit("10 per minute")
def login():
    data = request.json
    username = data.get('username', '')
    password = data.get('password', '')
    
    if not username or not password:
        return jsonify({"success": False, "error": "Username and password required"}), 400
    
    user = User.query.filter_by(username=username).first()
    if user and bcrypt.check_password_hash(user.password, password):
        token = create_access_token(identity=str(user.id))
        return jsonify({"success": True, "data": {"token": token, "username": user.username}}), 200
    return jsonify({"success": False, "error": "Invalid credentials"}), 401

# --- PREDICTION LOGIC ---

@app.route('/predict', methods=['POST'])
@jwt_required()  
def predict():
    try:
        user_id = get_jwt_identity()
        data = request.json.get('features')
        
        # Input validation
        if not isinstance(data, (list, tuple)):
            return jsonify({"success": False, "error": "Features must be an array"}), 400
        
        # Fallback values for indices 6-12 (technical clinical questions)
        fallback_values = {
            6: 0,        # restecg
            7: 150,      # thalach
            8: 0,        # exang
            9: 0.0,      # oldpeak
            10: 2,       # slope
            11: 0,       # ca
            12: 3        # thal
        }
        
        # Ensure data is a list
        if not isinstance(data, list):
            data = []
        
        # Extend list to 13 features if necessary
        while len(data) < 13:
            index = len(data)
            data.append(fallback_values.get(index, 0))
        
        # Replace None/null values with defaults for indices 6-12
        for index in range(6, 13):
            if index < len(data) and (data[index] is None or data[index] == ''):
                data[index] = fallback_values[index]
        
        # Ensure we have exactly 13 features
        data = data[:13]
        
        # Validate feature ranges
        validation_ranges = [
            (0, 1, 120, "Age"),      # age: 1-120
            (1, 0, 1, "Sex"),        # sex: 0-1
            (2, 0, 3, "Chest Pain Type"),  # cp: 0-3
            (3, 60, 250, "Resting BP"),    # trestbps: 60-250
            (4, 100, 600, "Cholesterol"),  # chol: 100-600
            (5, 0, 1, "Fasting Blood Sugar"),  # fbs: 0-1
            (6, 0, 2, "Resting ECG"),  # restecg: 0-2
            (7, 50, 220, "Max Heart Rate"),  # thalach: 50-220
            (8, 0, 1, "Exercise Angina"),  # exang: 0-1
            (9, 0, 10, "ST Depression"),  # oldpeak: 0-10
            (10, 0, 2, "ST Slope"),  # slope: 0-2
            (11, 0, 4, "Major Vessels"),  # ca: 0-4
            (12, 1, 3, "Thalassemia")  # thal: 1-3
        ]
        
        for idx, min_val, max_val, name in validation_ranges:
            try:
                val = float(data[idx])
                if not (min_val <= val <= max_val):
                    return jsonify({"success": False, "error": f"{name} must be between {min_val} and {max_val}"}), 400
            except (ValueError, TypeError):
                return jsonify({"success": False, "error": f"Invalid value for {name}"}), 400
        
        # Scale and predict
        features_scaled = scaler.transform(np.array([data]))
        probabilities = model.predict_proba(features_scaled)[0]
        risk_score = round(float(probabilities[0] * 100), 2)
        status = "High Risk" if risk_score > 50 else "Low Risk"
        
        # Generate recommendation based on risk score
        if risk_score > 70:
            recommendation = "High risk detected. Please consult a cardiologist immediately."
        elif risk_score > 50:
            recommendation = "Moderate risk. Schedule a preventive screening with your doctor."
        else:
            recommendation = "Low risk. Continue maintaining a healthy lifestyle."
        
        new_entry = HealthHistory(
            user_id=int(user_id), 
            risk_score=risk_score, 
            status=status,
            features_json=json.dumps(data) 
        )
        db.session.add(new_entry)
        db.session.commit()
        
        return jsonify({"success": True, "data": {"status": status, "risk_score": risk_score, "recommendation": recommendation}}), 200
    except Exception as e:
        return jsonify({"success": False, "error": f"Prediction failed: {str(e)}"}), 500

@app.route('/history', methods=['GET'])
@jwt_required()
def get_history():
    try:
        user_id = get_jwt_identity()
        history = HealthHistory.query.filter_by(user_id=int(user_id)).order_by(HealthHistory.id.desc()).all()
        history_data = [{
            "risk_score": h.risk_score,
            "status": h.status,
            "timestamp": h.timestamp.strftime("%Y-%m-%d %H:%M") if h.timestamp else "N/A",
            "features_json": h.features_json  
        } for h in history]
        return jsonify({"success": True, "data": history_data}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    
# --- Unified Update Profile Route (supports name and email) ---
@app.route('/api/profile', methods=['GET', 'PUT'])
@jwt_required()
def profile():
    try:
        data = request.json if request.method == 'PUT' else {}
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        
        if not user:
            return jsonify({"success": False, "error": "User not found"}), 404

        if request.method == 'GET':
            return jsonify({
                "success": True,
                "data": {
                    "username": user.username,
                    "email": user.email,
                    "last_password_change": user.last_password_change.isoformat() if user.last_password_change else None
                }
            }), 200

        if 'name' in data: # Matches frontend 'name' field
            if len(data['name'].strip()) < 3:
                return jsonify({"success": False, "error": "Name must be at least 3 characters"}), 400
            user.username = data['name']
        if 'email' in data:
            if '@' not in data['email']:
                return jsonify({"success": False, "error": "Invalid email format"}), 400
            user.email = data['email']
            
        db.session.commit()
        return jsonify({"success": True, "data": {"message": "Profile updated successfully", "username": user.username}}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    try:
        data = request.json
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        
        if not user:
            return jsonify({"success": False, "error": "User not found"}), 404
        
        current_password = data.get('current_password', '')
        new_password = data.get('new_password', '')
        
        if not current_password or not new_password:
            return jsonify({"success": False, "error": "Both passwords required"}), 400
        
        if len(new_password) < 6:
            return jsonify({"success": False, "error": "New password must be at least 6 characters"}), 400
        
        if not bcrypt.check_password_hash(user.password, current_password):
            return jsonify({"success": False, "error": "Current password incorrect"}), 400

        last_changed = user.last_password_change
        if last_changed:
            elapsed = datetime.datetime.utcnow() - last_changed
            min_wait = datetime.timedelta(days=15)
            if elapsed < min_wait:
                remaining = min_wait - elapsed
                days = remaining.days
                hours = remaining.seconds // 3600
                minutes = (remaining.seconds % 3600) // 60
                wait_msg = f"{days}d {hours}h {minutes}m"
                return jsonify({"success": False, "error": f"Password was changed recently. Try again in {wait_msg}."}), 400

        user.password = bcrypt.generate_password_hash(new_password).decode('utf-8')
        user.last_password_change = datetime.datetime.utcnow()
        db.session.commit()
        return jsonify({"success": True, "data": {"msg": "Password updated successfully"}}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# --- THE CHATBOT ---

@app.route('/api/chatbot', methods=['POST'])
@jwt_required()
def chatbot():
    try:
        user_msg = request.json.get('message', '')
        user_id = get_jwt_identity()

        last = HealthHistory.query.filter_by(user_id=int(user_id)).order_by(HealthHistory.timestamp.desc()).first()
        
        if not last or not last.features_json:
            return jsonify({"success": True, "data": {"response": "I cannot provide a clinical analysis yet. Please complete a cardiovascular assessment first so I can review your biometrics."}}), 200

        try:
            f = json.loads(last.features_json)
            # Fixed feature indices (0-12 for 13 features total)
            # 0:age, 1:sex, 2:cp, 3:trestbps, 4:chol, 5:fbs, 6:restecg, 7:thalach, 8:exang, 9:oldpeak, 10:slope, 11:ca, 12:thal
            context = (
                f"User's Risk: {last.risk_score}% ({last.status}). "
                f"Age: {f[0]}, Sex: {'M' if f[1]==1 else 'F'}, "
                f"BP: {f[3]}mmHg, Cholesterol: {f[4]}mg/dl, HR: {f[7]}bpm, "
                f"Chest Pain: {f[2]}, ExerciseAngina: {f[8]}, STDepression: {f[9]}."
            )
        except Exception as e:
            context = f"User Risk: {last.risk_score}%. Factors unavailable."

        load_dotenv()
        hf_token = os.getenv("HUGGINGFACE_TOKEN")
        if not hf_token:
            return jsonify({"success": False, "error": "API Key is missing"}), 500

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
                            "2. Identify the most concerning factor in the context (BP, Cholesterol, or Heart Rate).\n"
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
                return jsonify({"success": True, "data": {"response": bot_text}}), 200
            
            return jsonify({"success": True, "data": {"response": f"System error. Last score was {last.risk_score if last else 'N/A'}%."}}), 200

        except requests.Timeout:
            return jsonify({"success": False, "error": "AI service timeout. Please try again."}), 504
        except Exception as e:
            return jsonify({"success": False, "error": "I'm having trouble analyzing the data. Please try again later."}), 500
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5001)