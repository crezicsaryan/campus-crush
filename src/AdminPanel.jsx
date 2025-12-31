import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { Trash2, ShieldAlert, ArrowLeft, Lock, Calendar, User, Key } from 'lucide-react';
import './App.css';

const AdminPanel = () => {
  const navigate = useNavigate();
  
  // --- STATE ---
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');

  // --- CREDENTIALS ---
  const ADMIN_USERNAME = "admin";
  const ADMIN_PASSWORD = "campuscrush2025";

  // Login Handler
  const handleLogin = (e) => {
    e.preventDefault();
    if (adminUser === ADMIN_USERNAME && adminPass === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      fetchUsers();
    } else {
      alert("⚠️ Access Denied");
    }
  };

  // Fetch Users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const userList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(userList);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if(window.confirm("Are you sure you want to delete this user? This cannot be undone.")) {
        try {
            await deleteDoc(doc(db, "users", userId));
            setUsers(users.filter(user => user.id !== userId));
        } catch (error) {
            alert("Error deleting user");
        }
    }
  };

  // --- RENDER: LOGIN SCREEN (ELEGANT DESIGN) ---
  if (!isAuthenticated) {
    return (
      <div className="admin-login-wrapper">
        <div className="admin-login-card fade-up">
          <div className="admin-header-icon">
            <Lock size={32} color="white" />
          </div>
          <h2>Admin Portal</h2>
          <p>Secure Access Control</p>
          
          <form onSubmit={handleLogin} className="admin-form">
            <div className="input-group">
                <User size={18} className="input-icon" />
                <input 
                    type="text" 
                    placeholder="Username" 
                    value={adminUser} 
                    onChange={(e) => setAdminUser(e.target.value)}
                />
            </div>
            
            <div className="input-group">
                <Key size={18} className="input-icon" />
                <input 
                    type="password" 
                    placeholder="Password" 
                    value={adminPass} 
                    onChange={(e) => setAdminPass(e.target.value)}
                />
            </div>

            <button type="submit" className="admin-login-btn">
                <span>Access Dashboard</span>
                <ArrowLeft size={16} style={{transform: 'rotate(180deg)'}}/>
            </button>
          </form>
          
          <div className="login-footer">
            <span onClick={() => navigate('/dashboard')}>Back to Application</span>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER: DASHBOARD (RESPONSIVE) ---
  return (
    <div className="admin-layout fade-in">
      {/* Sidebar / Header Area */}
      <header className="admin-topbar">
        <div className="admin-title">
            <div className="title-icon-box"><ShieldAlert color="white" size={24} /></div>
            <div>
                <h1>Control Center</h1>
                <span className="user-count-badge">{users.length} Active Users</span>
            </div>
        </div>
        <button onClick={() => navigate('/dashboard')} className="back-btn-admin">
            <ArrowLeft size={18} /> <span className="hide-on-mobile">Back to App</span>
        </button>
      </header>

      {loading ? (
        <div className="admin-loading">
            <div className="pulse-circle"></div>
            Syncing Database...
        </div>
      ) : (
        <div className="table-card">
            <div className="table-responsive">
            <table className="modern-table">
                <thead>
                <tr>
                    <th>User</th>
                    <th>Identity</th>
                    <th>Academics</th>
                    <th>Bio</th>
                    <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                {users.map(user => (
                    <tr key={user.id}>
                    {/* User Profile */}
                    <td className="col-profile">
                        <img 
                        src={user.photoURL || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} 
                        alt="user" 
                        className="table-avatar" 
                        />
                        <div className="mobile-name">
                            <strong>{user.name}</strong>
                            <small>{user.branch}</small>
                        </div>
                    </td>

                    {/* Identity */}
                    <td className="col-identity">
                        <div className="user-identity">
                            <span className="fw-bold">{user.name}</span>
                            <span className="text-muted">@{user.username}</span>
                            <span className={`gender-badge ${user.gender === 'Male' ? 'g-male' : 'g-female'}`}>
                                {user.gender || 'N/A'}
                            </span>
                        </div>
                    </td>

                    {/* Academics */}
                    <td>
                        <div className="academic-info">
                            <span className="branch-badge">{user.branch}</span>
                            <span className="year-badge">{user.year}</span>
                            <div className="meta-item text-small mt-1">
                                <Calendar size={10} style={{marginRight:3}}/> 
                                {user.dob || 'N/A'}
                            </div>
                        </div>
                    </td>

                    {/* Bio */}
                    <td className="col-bio">
                        <div className="bio-box" title={user.bio}>
                            {user.bio || "No bio provided."}
                        </div>
                    </td>

                    {/* Actions */}
                    <td>
                        <button className="delete-icon-btn" onClick={() => handleDelete(user.id)} title="Delete User">
                            <Trash2 size={18} />
                        </button>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;