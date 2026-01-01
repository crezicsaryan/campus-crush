import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Trash2, ShieldAlert, ArrowLeft, Lock, Calendar, User, Key, MessageCircle, Users } from 'lucide-react';
import './App.css';

const AdminPanel = () => {
  const navigate = useNavigate();
  
  // --- STATE ---
  const [users, setUsers] = useState([]);
  const [chats, setChats] = useState([]); // <--- NEW: Stores chat data
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('users'); // <--- NEW: Tab state
  
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
      // We fetch data immediately after login is successful
    } else {
      alert("⚠️ Access Denied");
    }
  };

  // --- FETCH DATA (USERS & CHATS) ---
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

        // 2. Fetch Matches (Chats) - NEW LOGIC
        const chatsSnap = await getDocs(query(collection(db, "matches"), orderBy("timestamp", "desc")));
        const chatsList = [];
        
        for (const d of chatsSnap.docs) {
            const data = d.data();
            // Fetch names of the two users involved
            let names = [];
            if (data.users && data.users.length === 2) {
                // Find names from the already fetched userList to save reads
                const user1 = userList.find(u => u.id === data.users[0])?.name || "Unknown";
                const user2 = userList.find(u => u.id === data.users[1])?.name || "Unknown";
                names = [user1, user2];
            }
            chatsList.push({
                id: d.id,
                names: names.join(" & "),
                lastMessage: data.lastMessage || "No messages yet",
                time: data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleString() : "N/A"
            });
        }
        setChats(chatsList);

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated]); // Run this when authentication becomes true

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

  // --- RENDER: LOGIN SCREEN (YOUR ORIGINAL DESIGN) ---
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

  // --- RENDER: DASHBOARD (UPDATED WITH TABS) ---
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
        
        {/* NEW: TABS SELECTOR IN HEADER */}
        <div className="admin-tabs" style={{display: 'flex', gap: '15px'}}>
            <button 
                className={`tab-btn ${activeTab === 'users' ? 'active-tab' : ''}`}
                onClick={() => setActiveTab('users')}
                style={{
                    background: activeTab === 'users' ? 'white' : 'rgba(255,255,255,0.2)',
                    color: activeTab === 'users' ? '#ff4b4b' : 'white',
                    border: 'none', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px'
                }}
            >
                <Users size={16} /> Users
            </button>
            <button 
                className={`tab-btn ${activeTab === 'chats' ? 'active-tab' : ''}`}
                onClick={() => setActiveTab('chats')}
                style={{
                    background: activeTab === 'chats' ? 'white' : 'rgba(255,255,255,0.2)',
                    color: activeTab === 'chats' ? '#ff4b4b' : 'white',
                    border: 'none', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px'
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
            
            {/* --- TAB 1: USERS TABLE (YOUR ORIGINAL) --- */}
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
                                <span className="text-muted">@{user.username || 'N/A'}</span>
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
            )}

            {/* --- TAB 2: LIVE CHATS TABLE (NEW) --- */}
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
                             <tr><td colSpan="4" style={{textAlign:'center', padding:'20px'}}>No conversations yet.</td></tr>
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