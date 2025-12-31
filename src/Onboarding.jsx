import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from './firebase';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import './App.css';

const Onboarding = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // --- STATE ---
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    dob: '',
    gender: '', 
    year: '1st Year',
    branch: 'CSE',
    bio: ''
  });

  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState(null); // Store old photo
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null); 

  const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  // --- 1. FETCH EXISTING DATA (PRE-FILL) ---
  useEffect(() => {
    const fetchUserData = async () => {
        if(currentUser) {
            const docRef = doc(db, "users", currentUser.uid);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                setFormData({
                    name: data.name || '',
                    username: data.username || '',
                    dob: data.dob || '',
                    gender: data.gender || '',
                    year: data.year || '1st Year',
                    branch: data.branch || 'CSE',
                    bio: data.bio || ''
                });
                if (data.photoURL) {
                    setPreviewUrl(data.photoURL);
                    setExistingPhotoUrl(data.photoURL);
                }
            }
        }
    };
    fetchUserData();
  }, [currentUser]);

  // --- 2. USERNAME CHECK ---
  const checkUsername = async (username) => {
    if (username.length < 3) return;
    
    // Allow current username if editing
    if (currentUser && username === formData.username) return;

    const q = query(collection(db, "users"), where("username", "==", username));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // Check if it's NOT me
      const isMe = querySnapshot.docs[0].id === currentUser.uid;
      if (!isMe) setUsernameStatus('taken');
    } else {
      setUsernameStatus('available');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === 'username') {
      setUsernameStatus('checking...');
      const timer = setTimeout(() => checkUsername(value), 500); 
      return () => clearTimeout(timer);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // --- 3. UPLOAD IMAGE TO CLOUDINARY ---
  const uploadImageToCloudinary = async () => {
    if (!imageFile) return null; // No new file selected

    const data = new FormData();
    data.append("file", imageFile);
    data.append("upload_preset", "college_crush_preset"); 
    data.append("cloud_name", "djujs1suh"); 

    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/djujs1suh/image/upload", {
        method: "POST",
        body: data
      });
      
      const cloudData = await res.json();
      return cloudData.url;

    } catch (err) {
      console.error("Image Upload Error:", err);
      return null;
    }
  };

  // --- 4. SUBMIT (HANDLE IMAGE LOGIC) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (usernameStatus === 'taken') return alert("Username is taken!");
    setLoading(true);

    try {
      // Step A: Determine correct Photo URL
      let finalPhotoURL = existingPhotoUrl || DEFAULT_AVATAR;

      if (imageFile) {
          // If user picked a NEW file, upload it
          const newUrl = await uploadImageToCloudinary();
          if (newUrl) finalPhotoURL = newUrl;
      }

      // Step B: Save to Firestore
      await setDoc(doc(db, "users", currentUser.uid), {
        ...formData,
        photoURL: finalPhotoURL, 
        email: currentUser.email,
        uid: currentUser.uid,
        updatedAt: new Date()
      }, { merge: true }); // Use merge to be safe

      navigate('/dashboard');

    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to save profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-container fade-in">
      <div className="onboarding-card">
        <h1>{existingPhotoUrl ? "Edit Profile" : "Create Profile"}</h1>
        <p>Update your details below.</p>

        <form onSubmit={handleSubmit}>
          
          {/* PHOTO UPLOAD */}
          <div className="photo-upload-section">
            <div className="photo-preview">
              <img src={previewUrl || DEFAULT_AVATAR} alt="Profile" />
            </div>
            <label className="custom-file-upload">
              <input type="file" accept="image/*" onChange={handleImageChange} />
              {existingPhotoUrl ? "Change Photo" : "Upload Photo"}
            </label>
          </div>

          {/* NAME & USERNAME */}
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" name="name" required value={formData.name} onChange={handleChange} placeholder="e.g. Rahul Sharma" />
          </div>

          <div className="form-group">
            <label>Username</label>
            <input 
              type="text" 
              name="username" 
              required 
              value={formData.username} 
              onChange={handleChange} 
              className={usernameStatus === 'taken' ? 'input-error' : usernameStatus === 'available' ? 'input-success' : ''}
              placeholder="@campus_king" 
            />
            {usernameStatus === 'taken' && <small className="error-text">Username already taken!</small>}
          </div>

          {/* DOB & GENDER */}
          <div className="form-row">
            <div className="form-group half">
              <label>Date of Birth</label>
              <input type="date" name="dob" required value={formData.dob} onChange={handleChange} />
            </div>
            
            <div className="form-group half">
              <label>Gender</label>
              <div className="gender-box">
                <div 
                  className={`gender-option ${formData.gender === 'Male' ? 'selected' : ''}`}
                  onClick={() => setFormData({...formData, gender: 'Male'})}
                >
                  👨 Male
                </div>
                <div 
                  className={`gender-option ${formData.gender === 'Female' ? 'selected' : ''}`}
                  onClick={() => setFormData({...formData, gender: 'Female'})}
                >
                  👩 Female
                </div>
              </div>
            </div>
          </div>

          {/* ACADEMICS */}
          <div className="form-row">
            <div className="form-group half">
              <label>Year</label>
              <select name="year" value={formData.year} onChange={handleChange}>
                <option>1st Year</option>
                <option>2nd Year</option>
                <option>3rd Year</option>
                <option>4th Year</option>
              </select>
            </div>
            <div className="form-group half">
              <label>Branch</label>
              <select name="branch" value={formData.branch} onChange={handleChange}>
                <option>CSE</option>
                <option>Mechanical</option>
                <option>Civil</option>
                <option>Electrical</option>
                <option>BCA/BBA</option>
              </select>
            </div>
          </div>

          {/* BIO */}
          <div className="form-group">
            <label>Bio</label>
            <textarea name="bio" required value={formData.bio} onChange={handleChange} placeholder="Coffee addict, coder..."></textarea>
          </div>

          <button type="submit" className="submit-btn gold-btn" disabled={loading}>
            {loading ? 'Saving...' : 'Save Profile 🚀'}
          </button>

        </form>
      </div>
    </div>
  );
};

export default Onboarding;