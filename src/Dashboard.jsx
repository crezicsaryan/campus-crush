import React, { useState, useEffect, useMemo, useRef } from 'react';
import TinderCard from 'react-tinder-card';
import { useAuth } from './AuthContext';
import { db } from './firebase';
import { 
  doc, getDoc, collection, getDocs, query, where, orderBy,
  setDoc, addDoc, updateDoc, serverTimestamp, onSnapshot 
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { 
  Flame, Heart, MessageCircle, User, 
  X, Star, Edit3, ArrowLeft, Send
} from 'lucide-react';
import './App.css';

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  // --- STATE ---
  const [activeTab, setActiveTab] = useState('discover');
  const [userData, setUserData] = useState(null);
  const [profiles, setProfiles] = useState([]); 
  const [matches, setMatches] = useState([]); 
  const [showMatchPopup, setShowMatchPopup] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState(null);
  const [showHeart, setShowHeart] = useState(false);
  const [notification, setNotification] = useState(null);
  
  // --- NEW: UNREAD COUNT STATE ---
  const [totalUnread, setTotalUnread] = useState(0);

  // --- CHAT STATE ---
  const [currentChatUser, setCurrentChatUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null); 
  const chatInputRef = useRef(null); 

  // --- REFS FOR BUTTON SWIPES ---
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(currentIndex);

  const childRefs = useMemo(
    () =>
      Array(profiles.length)
        .fill(0)
        .map((i) => React.createRef()),
    [profiles.length]
  );

  const updateCurrentIndex = (val) => {
    setCurrentIndex(val);
    currentIndexRef.current = val;
  };

  // --- 1. LOAD USER & LISTEN FOR "LIKE" ALERTS ---
  useEffect(() => {
    if (currentUser) {
      const unsubUser = onSnapshot(doc(db, "users", currentUser.uid), (doc) => {
        if (doc.exists()) setUserData(doc.data());
      });

      const q = query(
        collection(db, "users", currentUser.uid, "notifications"), 
        where("read", "==", false)
      );

      const unsubNotify = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            triggerNotification({
              name: data.senderName,
              photo: data.senderPhoto,
              message: "Just liked you! Swipe to match."
            });
          }
        });
      });

      return () => {
        unsubUser();
        unsubNotify();
      };
    }
  }, [currentUser]);

  const triggerNotification = (data) => {
    setNotification(data);
    setTimeout(() => setNotification(null), 4000); 
  };

  // --- 2. FETCH PROFILES (FIXED) ---
  useEffect(() => {
    const fetchCards = async () => {
      if (!currentUser) return;
      const querySnapshot = await getDocs(collection(db, 'users'));
      const swipesSnapshot = await getDocs(collection(db, 'users', currentUser.uid, 'swipes'));
      const swipedIds = new Set(swipesSnapshot.docs.map(doc => doc.id));
      const feed = [];
      
      querySnapshot.forEach(doc => {
        // FIX: Ensure we manually add the UID so the key works later
        if (doc.id !== currentUser.uid && !swipedIds.has(doc.id)) {
          feed.push({ ...doc.data(), uid: doc.id }); 
        }
      });
      
      setProfiles(feed);
      updateCurrentIndex(feed.length - 1); 
    };
    fetchCards();
  }, [currentUser]);

  // --- 3. LISTEN FOR MATCHES, CHAT ALERTS & UNREAD COUNT ---
  useEffect(() => {
    if (!currentUser) return;

    const q = query(collection(db, 'matches'), where('users', 'array-contains', currentUser.uid));
    
    const unsubMatches = onSnapshot(q, async (snapshot) => {
      // 1. Handle Notifications
      for (const change of snapshot.docChanges()) {
         if (change.type === 'modified') {
            const data = change.doc.data();
            if (data.lastSenderId && data.lastSenderId !== currentUser.uid) {
                const senderId = data.lastSenderId;
                if (!currentChatUser || currentChatUser.id !== senderId) {
                    const userSnap = await getDoc(doc(db, 'users', senderId));
                    if(userSnap.exists()) {
                        triggerNotification({
                            name: userSnap.data().name,
                            photo: userSnap.data().photoURL,
                            message: data.lastMessage || "Sent a message"
                        });
                    }
                }
            }
         }
      }

      // 2. Build Match List & Count Unread
      const matchesData = [];
      let unreadCounter = 0;

      for (const docSnap of snapshot.docs) {
        const matchData = docSnap.data();
        const otherUserId = matchData.users.find(id => id !== currentUser.uid);
        
        // CHECK UNREAD STATUS
        const isUnread = matchData.lastSenderId && 
                         matchData.lastSenderId !== currentUser.uid && 
                         matchData.isRead === false;

        if (isUnread) unreadCounter++;

        if (otherUserId) {
             const userSnap = await getDoc(doc(db, 'users', otherUserId));
             if (userSnap.exists()) {
                 matchesData.push({ 
                     id: userSnap.id, 
                     ...userSnap.data(),
                     lastMessage: matchData.lastMessage || "Tap to chat",
                     lastMessageTime: matchData.lastMessageTime,
                     isUnread: isUnread 
                 });
             }
        }
      }
      setMatches(matchesData);
      setTotalUnread(unreadCounter); 
    });

    return () => unsubMatches();
  }, [currentUser, currentChatUser]); 

  // --- 4. REAL-TIME CHAT ---
  useEffect(() => {
    if (currentChatUser && currentUser) {
      const matchId = [currentUser.uid, currentChatUser.id].sort().join('_');
      const q = query(collection(db, 'matches', matchId, 'messages'), orderBy('timestamp', 'asc'));
      const unsub = onSnapshot(q, (snapshot) => {
        setMessages(snapshot.docs.map(doc => doc.data()));
      });
      return () => unsub();
    }
  }, [currentChatUser, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentChatUser]);

  // --- 5. SEND MESSAGE ---
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const textToSend = newMessage;
    setNewMessage("");
    if (chatInputRef.current) chatInputRef.current.focus();

    const matchId = [currentUser.uid, currentChatUser.id].sort().join('_');
    const timestamp = serverTimestamp();

    try {
      await addDoc(collection(db, 'matches', matchId, 'messages'), {
        text: textToSend,
        senderId: currentUser.uid,
        timestamp: timestamp
      });

      await updateDoc(doc(db, 'matches', matchId), {
          lastMessage: textToSend,
          lastSenderId: currentUser.uid,
          lastMessageTime: timestamp,
          isRead: false 
      });

    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // --- 6. OPEN CHAT ---
  const openChat = async (user) => {
    setCurrentChatUser(user);
    setActiveTab('chat');

    if (user.isUnread) {
        const matchId = [currentUser.uid, user.id].sort().join('_');
        try {
            await updateDoc(doc(db, 'matches', matchId), {
                isRead: true
            });
        } catch (err) {
            console.error("Error marking read:", err);
        }
    }
  };

  // --- SWIPE LOGIC ---
  const canSwipe = currentIndex >= 0;

  const swiped = async (direction, swipedUser, index) => {
    updateCurrentIndex(index - 1);
    await setDoc(doc(db, 'users', currentUser.uid, 'swipes', swipedUser.uid), {
      direction: direction,
      timestamp: serverTimestamp()
    });

    if (direction === 'right' || direction === 'up') {
      const otherUserSwipe = await getDoc(doc(db, 'users', swipedUser.uid, 'swipes', currentUser.uid));
      if (otherUserSwipe.exists() && (otherUserSwipe.data().direction === 'right' || otherUserSwipe.data().direction === 'up')) {
        handleMatch(swipedUser);
      } else {
        await addDoc(collection(db, 'users', swipedUser.uid, 'notifications'), {
          senderName: userData?.name || "Someone",
          senderPhoto: userData?.photoURL,
          type: 'like',
          read: false,
          timestamp: serverTimestamp()
        });
      }
    }
  };

  const swipe = async (dir) => {
    if (canSwipe && currentIndex < profiles.length) {
      if(dir === 'right') {
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 800);
      }
      // Safety check to ensure ref exists before swiping
      if (childRefs[currentIndex] && childRefs[currentIndex].current) {
        await childRefs[currentIndex].current.swipe(dir);
      }
    }
  };

  const handleMatch = async (otherUser) => {
    const matchId = [currentUser.uid, otherUser.uid].sort().join('_');
    await setDoc(doc(db, 'matches', matchId), {
      users: [currentUser.uid, otherUser.uid],
      timestamp: serverTimestamp(),
      lastMessage: "Matched! Say Hi 👋", 
      lastSenderId: "system",
      isRead: true
    });
    setMatchedProfile(otherUser);
    setShowMatchPopup(true);
  };

  // --- VIEWS ---

  const MatchesView = () => (
    <div className="view-container scrollable">
      <header className="top-header">
        <div className="header-brand"><Heart className="icon-brand" fill="#ff4b4b" /> Matches</div>
      </header>
      <div className="matches-section">
        <h3>Your Matches ({matches.length})</h3>
        {matches.length === 0 ? (
            <p className="no-data-msg">No matches yet.</p>
        ) : (
            <div className="matches-grid">
            {matches.map(user => (
                <div className="match-card" key={user.id} onClick={() => openChat(user)}>
                  <img src={user.photoURL} alt={user.name} />
                  <div className="match-info">
                      <h4>{user.name}</h4>
                  </div>
                </div>
            ))}
            </div>
        )}
      </div>
    </div>
  );

  const ChatView = () => {
    if (currentChatUser) {
      return (
        <div className="view-container chat-view-container">
           <header className="chat-header">
             <button onClick={() => setCurrentChatUser(null)} className="back-btn"><ArrowLeft size={24} /></button>
             <img src={currentChatUser.photoURL} className="chat-header-avatar" alt="" />
             <h3>{currentChatUser.name}</h3>
           </header>

           <div className="messages-area">
              {messages.length === 0 && <p className="start-chat-text">Say hi to {currentChatUser.name}! 👋</p>}
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === currentUser.uid;
                return (
                  <div key={idx} className={`message-bubble ${isMe ? 'mine' : 'theirs'}`}>
                    {msg.text}
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
           </div>

           <form className="chat-input-area" onSubmit={sendMessage}>
             <input ref={chatInputRef} autoFocus type="text" placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} />
             <button type="submit"><Send size={20} /></button>
           </form>
        </div>
      );
    }

    return (
      <div className="view-container scrollable">
        <header className="top-header">
          <div className="header-brand">Messages</div>
        </header>
        <div className="chat-list">
          {matches.length === 0 && <p className="no-data-msg">No conversations yet.</p>}
          {matches.map(user => (
             <div className="chat-item" key={user.id} onClick={() => openChat(user)}>
               <img src={user.photoURL} className="chat-avatar" alt="" />
               <div className="chat-details">
                 <div className="chat-top">
                   <h4>{user.name}</h4>
                   {user.isUnread && <span className="unread-dot-small"></span>}
                 </div>
                 <p className="chat-preview" style={{
                   fontWeight: user.isUnread ? '700' : '400', 
                   color: user.isUnread ? '#000' : '#888'
                 }}>
                    {user.lastMessage}
                 </p>
               </div>
             </div>
          ))}
        </div>
      </div>
    );
  };

  const ProfileView = () => (
    <div className="view-container scrollable">
       <header className="top-header space-between">
         <div className="header-brand">Profile</div>
       </header>
       <div className="profile-hero">
         <div className="profile-pic-wrapper">
           <img src={userData?.photoURL || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} alt="" />
         </div>
         <h2>{userData?.name}</h2>
         <p className="profile-bio">{userData?.bio}</p>
         <div className="tags-row">
            <span className="hero-badge">{userData?.branch}</span>
            <span className="hero-badge">{userData?.year}</span>
         </div>
       </div>
       <button className="edit-profile-long-btn" style={{marginTop: '30px'}} onClick={() => navigate('/onboarding')}>
         <Edit3 size={16} style={{marginRight: '8px'}}/> Edit Profile
       </button>
       <button className="logout-text-btn" onClick={logout}>Log Out</button>
    </div>
  );

  return (
    <div className="dashboard-layout fade-in">
      {notification && (
        <div className="notification-toast fade-in" onClick={() => {
            if (activeTab !== 'chat') setActiveTab('chat');
            setNotification(null);
        }}>
           <img src={notification.photo} alt="" />
           <div><strong>{notification.name}</strong><p>{notification.message}</p></div>
           <button onClick={(e) => { e.stopPropagation(); setNotification(null); }}><X size={16} /></button>
        </div>
      )}
      
      {showHeart && <div className="floating-match-heart">❤️</div>}

      {showMatchPopup && (
        <div className="match-popup">
           <div className="match-content">
             <h1>It's a Match! 💘</h1>
             <p>You and {matchedProfile?.name} matched!</p>
             <button className="send-msg-btn" onClick={() => { setShowMatchPopup(false); openChat(matchedProfile); }}>Send Message</button>
             <button className="keep-swiping-btn" onClick={() => setShowMatchPopup(false)}>Keep Swiping</button>
           </div>
        </div>
      )}

      <div className="content-area">
        {activeTab === 'discover' && (
            <div className="view-container">
            <header className="top-header">
              <div className="header-brand"><Flame className="icon-brand" fill="#ff4b4b" /> Discover</div>
            </header>
            <div className="card-stack-layout">
              <div className="tinder-card-container">
                {profiles.length === 0 && (
                     <div className="no-cards-state">
                        <div className="pulse-circle"></div>
                        <h3>Searching...</h3>
                        <p>No new profiles found nearby.</p>
                     </div>
                )}
                {profiles.map((character, index) => (
                  <TinderCard 
                    ref={childRefs[index]}
                    className='swipe' 
                    key={character.uid} 
                    onSwipe={(dir) => swiped(dir, character, index)} 
                    preventSwipe={['down']} // FIX: Removed 'up' so Star button works
                  >
                    <div style={{ backgroundImage: `url(${character.photoURL})` }} className='card'>
                      <div className="card-gradient"></div>
                      <div className="card-content">
                        <h2>{character.name}</h2>
                        <p className="card-uni">🎓 {character.branch} • {character.year}</p>
                      </div>
                    </div>
                  </TinderCard>
                ))}
              </div>
              <div className="action-buttons">
                {/* FIX: Left swipe (X) will now work because refs are fixed */}
                <button className="action-btn pass" onClick={() => swipe('left')}><X size={30} /></button>
                {/* FIX: Added onClick to Star button */}
                <button className="action-btn super" onClick={() => swipe('up')}><Star size={24} /></button>
                <button className="action-btn like" onClick={() => swipe('right')}><Heart size={30} fill="white" /></button>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'matches' && <MatchesView />}
        {activeTab === 'chat' && <ChatView />}
        {activeTab === 'profile' && <ProfileView />}
      </div>

      <nav className="bottom-nav">
        <div className={`nav-item ${activeTab === 'discover' ? 'active' : ''}`} onClick={() => setActiveTab('discover')}><Flame size={26} /><span>Discover</span></div>
        <div className={`nav-item ${activeTab === 'matches' ? 'active' : ''}`} onClick={() => setActiveTab('matches')}><Heart size={26} /><span>Matches</span></div>
        
        <div className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
            <MessageCircle size={26} />
            {totalUnread > 0 && <span className="nav-badge-dot"></span>}
            <span>Chat</span>
        </div>
        
        <div className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}><User size={26} /><span>Profile</span></div>
      </nav>
    </div>
  );
};

export default Dashboard;
