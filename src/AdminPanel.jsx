import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase'; 
import { signInAnonymously } from 'firebase/auth'; 
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Trash2, ShieldAlert, ArrowLeft, Lock, Calendar, User, Key, MessageCircle, Users } from 'lucide-react';
import './App.css';

const AdminPanel = () => {
  const navigate = useNavigate();
  
  // --- STATE ---
  const [users, setUsers] = useState([]);
  const [chats, setChats] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [errorMsg, setErrorMsg] = useState(''); 
  
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');

  // --- CREDENTIALS ---
  const ADMIN_USERNAME = "admin";
  const ADMIN_PASSWORD = "campuscrush2025";

  // Login Handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (adminUser === ADMIN_USERNAME && adminPass === ADMIN_PASSWORD) {
      try {
        await signInAnonymously(auth);
        setIsAuthenticated(true);
      } catch (err) {
        console.error(err);
        setErrorMsg("Database Connection Failed. Check Console.");
      }
    } else {
      alert("⚠️ Access Denied");
    }
  };

  // --- FETCH DATA ---
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Users
        const usersSnap = await getDocs(collection(db, "users"));
        const userList = usersSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUsers(userList);

        // 2. Fetch Matches (Chats)
        const chatsSnap = await getDocs(collection(db, "matches"));
        const chatsList = [];
        
        for (const d of chatsSnap.docs) {
            const data = d.data();
            
            // Find names safely
            let names = [];
            if (data.users && data.users.length === 2) {
                const user1 = userList.find(u => u.id === data.users[0])?.name || "Unknown";
                const user2 = userList.find(u => u.id === data.users[1])?.name || "Unknown";
                names = [user1, user2];
            }
            
            chatsList.push({
                id: d.id,
                names: names.join(" & "),
                lastMessage: data.lastMessage || "No messages yet",
                time: data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleString() : "N/A",
                rawTime: data.timestamp ? data.timestamp.seconds : 0
            });
        }
        
        // Sort by time (Newest first)
        chatsList.sort((a, b) => b.rawTime - a.rawTime);
        
        setChats(chatsList);

      } catch (error) {
        console.error("Error fetching data:", error);
        setErrorMsg("Error fetching data: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated]);

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

  // --- RENDER: LOGIN SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="admin-login-wrapper">
        <div className="admin-login-card fade-up">
          <div className="admin-header-icon">
            <Lock size={32} color="white" />
          </div>
          <h2>Admin Portal</h2>
          <p>Secure Access Control</p>
          
          {errorMsg && <p style={{color: 'red', fontSize:'12px'}}>{errorMsg}</p>}

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

  // --- RENDER: DASHBOARD ---
  return (
    <div className="admin-layout fade-in">
      <header className="admin-topbar">
        <div className="admin-title">
            <div className="title-icon-box"><ShieldAlert color="white" size={24} /></div>
            <div>
                <h1>Control Center</h1>
                <span className="user-count-badge">{users.length} Active Users</span>
            </div>
        </div>
        
        {/* TABS SELECTOR - FIXED VISIBILITY */}
        <div className="admin-tabs" style={{display: 'flex', gap: '15px'}}>
            <button 
                onClick={() => setActiveTab('users')}
                style={{
                    background: activeTab === 'users' ? '#ff4b4b' : '#eee', // Active: Red, Inactive: Light Gray
                    color: activeTab === 'users' ? 'white' : '#555',       // Active: White, Inactive: Dark Gray
                    border: 'none', 
                    padding: '8px 16px', 
                    borderRadius: '20px', 
                    cursor: 'pointer', 
                    fontWeight: 'bold', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    transition: 'all 0.3s ease'
                }}
            >
                <Users size={16} /> Users
            </button>
            <button 
                onClick={() => setActiveTab('chats')}
                style={{
                    background: activeTab === 'chats' ? '#ff4b4b' : '#eee',
                    color: activeTab === 'chats' ? 'white' : '#555',
                    border: 'none', 
                    padding: '8px 16px', 
                    borderRadius: '20px', 
                    cursor: 'pointer', 
                    fontWeight: 'bold', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    transition: 'all 0.3s ease'
                }}
            >
                <MessageCircle size={16} /> Live Chats
            </button>
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
            
            {/* --- TAB 1: USERS TABLE --- */}
            {activeTab === 'users' && (
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
                        <td className="col-identity">
                            <div className="user-identity">
                                <span className="fw-bold">{user.name}</span>
                                <span className="text-muted">@{user.username || 'N/A'}</span>
                                <span className={`gender-badge ${user.gender === 'Male' ? 'g-male' : 'g-female'}`}>
                                    {user.gender || 'N/A'}
                                </span>
                            </div>
                        </td>
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
                        <td className="col-bio">
                            <div className="bio-box" title={user.bio}>
                                {user.bio || "No bio provided."}
                            </div>
                        </td>
                        <td>
                            <button className="delete-icon-btn" onClick={() => handleDelete(user.id)} title="Delete User">
                                <Trash2 size={18} />
                            </button>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            )}

            {/* --- TAB 2: LIVE CHATS TABLE --- */}
            {activeTab === 'chats' && (
                <table className="modern-table">
                    <thead>
                        <tr>
                            <th>Participants</th>
                            <th>Last Message</th>
                            <th>Time Sent</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {chats.length === 0 ? (
                             <tr><td colSpan="4" style={{textAlign:'center', padding:'20px'}}>No conversations found.</td></tr>
                        ) : (
                            chats.map(chat => (
                                <tr key={chat.id}>
                                    <td style={{fontWeight: 'bold', color: '#333'}}>
                                        <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                                            <MessageCircle size={16} color="#ff4b4b"/>
                                            {chat.names}
                                        </div>
                                    </td>
                                    <td style={{maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#666'}}>
                                        {chat.lastMessage}
                                    </td>
                                    <td style={{fontSize: '13px', color: '#888'}}>
                                        {chat.time}
                                    </td>
                                    <td>
                                        <span className="branch-badge" style={{background:'#e8f5e9', color:'#2e7d32'}}>Active</span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            )}

            </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;