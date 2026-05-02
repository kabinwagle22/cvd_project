import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, ClipboardCheck, CheckCircle2, AlertCircle, CheckCircle } from 'lucide-react';

const AssessmentForm = ({ onComplete, onBack }) => {
    const [errors, setErrors] = useState({});
    const [validFields, setValidFields] = useState({}); // Tracks green checkmarks
    const [isFullData, setIsFullData] = useState(false); // Tracks if all 13 fields filled
    const [formData, setFormData] = useState({
      age: '', sex: '', cp: '0', trestbps: '', chol: '', 
      fbs: '0', restecg: '', thalach: '', exang: '', 
      oldpeak: '', slope: '', ca: '', thal: ''
    });
  
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
      
        // --- REAL-TIME VALIDATION FOR CHECKMARKS ---
        let isValid = false;
        if (name === 'age') isValid = value >= 1 && value <= 110;
        if (name === 'trestbps') isValid = value >= 60 && value <= 250;
        if (name === 'chol') isValid = value >= 100 && value <= 600;
        if (name === 'thalach') isValid = value >= 50 && value <= 220;
        if (name === 'sex' || name === 'cp' || name === 'fbs') isValid = value !== "";
        if (name === 'restecg' || name === 'exang' || name === 'slope' || name === 'ca' || name === 'thal' || name === 'oldpeak') isValid = value !== "";
      
        setValidFields((prev) => ({ ...prev, [name]: isValid }));
      
        if (errors[name]) {
          setErrors((prev) => ({ ...prev, [name]: null }));
        }
    };

    const handleFinalSubmit = () => {
        // Validate required fields first
        let newErrors = {};
        if (!formData.age) newErrors.age = "Age is required";
        else if (formData.age < 1 || formData.age > 110) newErrors.age = "Range: 1-110";
        if (!formData.sex) newErrors.sex = "Required";
        if (!formData.trestbps || formData.trestbps < 60 || formData.trestbps > 250) newErrors.trestbps = "Range: 60-250";
        if (!formData.chol || formData.chol < 100 || formData.chol > 600) newErrors.chol = "Range: 100-600";
        if (!formData.thalach || formData.thalach < 50 || formData.thalach > 220) newErrors.thalach = "Range: 50-220";

        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
          return;
        }

        // Build feature array with 13 elements
        const featureArray = [
            Number(formData.age),           // index 0
            Number(formData.sex),           // index 1
            Number(formData.cp) || 0,       // index 2
            Number(formData.trestbps),      // index 3
            Number(formData.chol),          // index 4
            Number(formData.fbs) || 0,      // index 5
            formData.restecg ? Number(formData.restecg) : null,  // index 6 - optional
            formData.thalach ? Number(formData.thalach) : null,  // index 7 - optional (but might be required for vitals)
            formData.exang ? Number(formData.exang) : null,      // index 8 - optional
            formData.oldpeak ? Number(formData.oldpeak) : null,  // index 9 - optional
            formData.slope ? Number(formData.slope) : null,      // index 10 - optional
            formData.ca ? Number(formData.ca) : null,            // index 11 - optional
            formData.thal ? Number(formData.thal) : null         // index 12 - optional
        ];

        // Check if all 13 fields have actual values (not null)
        const allFilled = featureArray.every(val => val !== null && val !== '');
        setIsFullData(allFilled);
        
        onComplete(featureArray, allFilled);
    };
  
    return (
      <div className="max-w-4xl mx-auto p-8 bg-white rounded-3xl shadow-xl border border-slate-100">
        <button onClick={onBack} className="text-slate-400 mb-6 hover:text-blue-600 transition">← Cancel</button>
        
        <div className="mb-8">
          <h1 className="text-4xl font-black text-slate-900 mb-2">Cardiovascular Assessment</h1>
          <p className="text-slate-500">Complete your health profile. Fields marked * are required.</p>
        </div>

        <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
          
          {/* ========== SECTION 1: BASIC INFO ========== */}
          <div className="border-b border-slate-200 pb-8">
            <h2 className="text-xl font-bold mb-6 text-slate-900 flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
              Personal Information
            </h2>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Age */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Age *</label>
                <div className="relative">
                  <input 
                    name="age" type="number" value={formData.age} onChange={handleChange} 
                    className={`w-full p-3 border rounded-xl transition-all ${errors.age ? 'border-red-500 bg-red-50' : validFields.age ? 'border-green-500 bg-green-50' : 'border-slate-200'}`}
                    placeholder="e.g. 45"
                  />
                  {validFields.age && <CheckCircle2 size={18} className="absolute right-3 top-3.5 text-green-500" />}
                </div>
                {errors.age && <p className="text-red-500 text-xs mt-1 font-bold">⚠ {errors.age}</p>}
              </div>

              {/* Sex */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Sex *</label>
                <div className="relative">
                  <select 
                      name="sex" value={formData.sex} onChange={handleChange} 
                      className={`w-full p-3 border rounded-xl transition-all ${errors.sex ? 'border-red-500 bg-red-50' : validFields.sex ? 'border-green-500 bg-green-50' : 'border-slate-200'}`}
                  >
                      <option value="">Select</option>
                      <option value="1">Male</option>
                      <option value="0">Female</option>
                  </select>
                  {validFields.sex && <CheckCircle2 size={18} className="absolute right-8 top-3.5 text-green-500" />}
                </div>
                {errors.sex && <p className="text-red-500 text-xs mt-1 font-bold">⚠ {errors.sex}</p>}
              </div>

              {/* Chest Pain Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Chest Pain Type *</label>
                <select 
                    name="cp" value={formData.cp} onChange={handleChange} 
                    className={`w-full p-3 border rounded-xl transition-all ${validFields.cp ? 'border-green-500 bg-green-50' : 'border-slate-200'}`}
                >
                    <option value="0">Typical Angina</option>
                    <option value="1">Atypical Angina</option>
                    <option value="2">Non-anginal Pain</option>
                    <option value="3">Asymptomatic</option>
                </select>
              </div>
            </div>
          </div>

          {/* ========== SECTION 2: COMMON VITALS ========== */}
          <div className="border-b border-slate-200 pb-8">
            <h2 className="text-xl font-bold mb-6 text-slate-900 flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
              Common Vitals
            </h2>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Resting BP */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Resting Blood Pressure (mmHg) *</label>
                <div className="relative">
                  <input 
                    name="trestbps" type="number" value={formData.trestbps} onChange={handleChange} 
                    className={`w-full p-3 border rounded-xl transition-all ${errors.trestbps ? 'border-red-500 bg-red-50' : validFields.trestbps ? 'border-green-500 bg-green-50' : 'border-slate-200'}`}
                    placeholder="e.g. 120"
                  />
                  {validFields.trestbps && <CheckCircle2 size={18} className="absolute right-3 top-9 text-green-500" />}
                </div>
                {errors.trestbps && <p className="text-red-500 text-xs mt-1 font-bold">{errors.trestbps}</p>}
              </div>

              {/* Cholesterol */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Serum Cholesterol (mg/dl) *</label>
                <div className="relative">
                  <input 
                    name="chol" type="number" value={formData.chol} onChange={handleChange} 
                    className={`w-full p-3 border rounded-xl transition-all ${errors.chol ? 'border-red-500 bg-red-50' : validFields.chol ? 'border-green-500 bg-green-50' : 'border-slate-200'}`}
                    placeholder="e.g. 240"
                  />
                  {validFields.chol && <CheckCircle2 size={18} className="absolute right-3 top-9 text-green-500" />}
                </div>
                {errors.chol && <p className="text-red-500 text-xs mt-1 font-bold">{errors.chol}</p>}
              </div>

              {/* Max Heart Rate */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Max Heart Rate (bpm) *</label>
                <div className="relative">
                  <input 
                    name="thalach" type="number" value={formData.thalach} onChange={handleChange} 
                    className={`w-full p-3 border rounded-xl transition-all ${errors.thalach ? 'border-red-500 bg-red-50' : validFields.thalach ? 'border-green-500 bg-green-50' : 'border-slate-200'}`}
                    placeholder="e.g. 150"
                  />
                  {validFields.thalach && <CheckCircle2 size={18} className="absolute right-3 top-9 text-green-500" />}
                </div>
                {errors.thalach && <p className="text-red-500 text-xs mt-1 font-bold">{errors.thalach}</p>}
              </div>

              {/* Fasting Blood Sugar */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Fasting Blood Sugar {'>'} 120 mg/dl *</label>
                <select 
                    name="fbs" value={formData.fbs} onChange={handleChange} 
                    className={`w-full p-3 border rounded-xl transition-all ${validFields.fbs ? 'border-green-500 bg-green-50' : 'border-slate-200'}`}
                >
                    <option value="0">No (fbs ≤ 120)</option>
                    <option value="1">Yes (fbs {'>'} 120)</option>
                </select>
              </div>
            </div>
          </div>

          {/* ========== SECTION 3: CLINICAL DATA (OPTIONAL) ========== */}
          <div className="border-2 border-amber-200 bg-amber-50 rounded-2xl p-6 pb-8">
            <h2 className="text-xl font-bold mb-2 text-slate-900 flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
              Clinical Data (Optional)
            </h2>
            <p className="text-amber-700 text-sm mb-6">These fields are optional. Leave blank to use dataset averages.</p>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Resting ECG */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Resting Electrocardiogram</label>
                <select 
                    name="restecg" value={formData.restecg} onChange={handleChange} 
                    className={`w-full p-3 border rounded-xl transition-all ${validFields.restecg ? 'border-green-500 bg-green-50' : 'border-slate-200'}`}
                >
                    <option value="">-- Skip --</option>
                    <option value="0">Normal</option>
                    <option value="1">ST-T Abnormal</option>
                    <option value="2">LV Hypertrophy</option>
                </select>
              </div>

              {/* Exercise Induced Angina */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Exercise Induced Angina</label>
                <select 
                    name="exang" value={formData.exang} onChange={handleChange} 
                    className={`w-full p-3 border rounded-xl transition-all ${validFields.exang ? 'border-green-500 bg-green-50' : 'border-slate-200'}`}
                >
                    <option value="">-- Skip --</option>
                    <option value="0">No</option>
                    <option value="1">Yes</option>
                </select>
              </div>

              {/* ST Depression */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">ST Depression (oldpeak)</label>
                <input 
                  name="oldpeak" type="number" step="0.1" value={formData.oldpeak} onChange={handleChange} 
                  className={`w-full p-3 border rounded-xl transition-all ${validFields.oldpeak ? 'border-green-500 bg-green-50' : 'border-slate-200'}`}
                  placeholder="e.g. 1.5"
                />
              </div>

              {/* ST Slope */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">ST Slope</label>
                <select 
                    name="slope" value={formData.slope} onChange={handleChange} 
                    className={`w-full p-3 border rounded-xl transition-all ${validFields.slope ? 'border-green-500 bg-green-50' : 'border-slate-200'}`}
                >
                    <option value="">-- Skip --</option>
                    <option value="0">Upsloping</option>
                    <option value="1">Flat</option>
                    <option value="2">Downsloping</option>
                </select>
              </div>

              {/* Major Vessels */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Major Vessels (ca)</label>
                <select 
                    name="ca" value={formData.ca} onChange={handleChange} 
                    className={`w-full p-3 border rounded-xl transition-all ${validFields.ca ? 'border-green-500 bg-green-50' : 'border-slate-200'}`}
                >
                    <option value="">-- Skip --</option>
                    <option value="0">0 vessels</option>
                    <option value="1">1 vessel</option>
                    <option value="2">2 vessels</option>
                    <option value="3">3 vessels</option>
                </select>
              </div>

              {/* Thalassemia */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Thalassemia (thal)</label>
                <select 
                    name="thal" value={formData.thal} onChange={handleChange} 
                    className={`w-full p-3 border rounded-xl transition-all ${validFields.thal ? 'border-green-500 bg-green-50' : 'border-slate-200'}`}
                >
                    <option value="">-- Skip --</option>
                    <option value="1">Normal</option>
                    <option value="2">Fixed Defect</option>
                    <option value="3">Reversible Defect</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center pt-6">
            <button 
                type="button" 
                onClick={handleFinalSubmit}
                className="w-full max-w-md bg-blue-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-blue-700 shadow-2xl transition-all transform hover:scale-[1.02] active:scale-95"
            >
                Run Diagnostic Report
            </button>
          </div>
        </form>
      </div>
    );
};

export default AssessmentForm;