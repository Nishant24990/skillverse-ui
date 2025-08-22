// ===============================
// File: src/App.jsx
// ===============================

import React, { useState, useEffect, useRef } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
import { auth, db, storage } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  serverTimestamp,
  limit,
} from "firebase/firestore";
import { ref as sRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";

import { palette, cls, Btn } from "./uiTheme";

/* ----------------------------- Small helpers ----------------------------- */
function StarRating({ value = 0, outOf = 5, size = "text-xl" }) {
  const filled = Math.round(value || 0);
  return (
    <span className={size} aria-label={`Rating ${value} of ${outOf}`}>
      {Array.from({ length: outOf }).map((_, i) => (i < filled ? "★" : "☆"))}
    </span>
  );
}
function Initials({ name }) {
  const initials = (name || "")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-white flex items-center justify-center text-lg font-bold shadow">
      {initials || "U"}
    </div>
  );
}

/* ----------------------- Presence (online/lastActive) ---------------------- */
function PresenceManager() {
  useEffect(() => {
    let unsubAuth = () => {};
    let cleanup = () => {};
    unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      const meRef = doc(db, "users", user.uid);
      await updateDoc(meRef, { online: true, lastActive: serverTimestamp() }).catch(() => {});
      const handleAway = async () => {
        await updateDoc(meRef, { online: false, lastActive: serverTimestamp() }).catch(() => {});
      };
      document.addEventListener("visibilitychange", handleAway);
      window.addEventListener("beforeunload", handleAway);
      cleanup = () => {
        document.removeEventListener("visibilitychange", handleAway);
        window.removeEventListener("beforeunload", handleAway);
        handleAway();
      };
    });
    return () => { cleanup(); unsubAuth && unsubAuth(); };
  }, []);
  return null;
}

/* --------------------------------- App --------------------------------- */
function AppShell() {
  const location = useLocation();
  const hideBottomNav =
    location.pathname === "/" ||
    location.pathname.startsWith("/login") ||
    location.pathname.startsWith("/signup");

  return (
    <>
      <PresenceManager />

      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/profile/:id" element={<UserProfile />} />
        <Route path="/chat/:id" element={<Chat />} />
        <Route path="/schedule/:id" element={<ScheduleSession />} />
        <Route path="/chats" element={<Chats />} />
        <Route path="/me" element={<MyProfile />} />
      </Routes>

      {!hideBottomNav && <BottomNav />}
    </>
  );
}

function BottomNav() {
  const navigate = useNavigate();
  const doSignOut = async () => {
    try { await signOut(auth); navigate("/login"); }
    catch (e) { alert("Sign out failed: " + e.message); }
  };
  return (
    <nav className="fixed bottom-0 left-0 right-0 backdrop-blur bg-white/70 border-t border-white/60 shadow-sm flex justify-around py-2">
      <Link to="/dashboard" className="flex flex-col items-center text-xs"><span>🏠</span><span className="mt-1">Home</span></Link>
      <Link to="/sessions" className="flex flex-col items-center text-xs"><span>📅</span><span className="mt-1">Sessions</span></Link>
      <Link to="/chats" className="flex flex-col items-center text-xs"><span>💬</span><span className="mt-1">Chats</span></Link>
      <Link to="/me" className="flex flex-col items-center text-xs"><span>👤</span><span className="mt-1">Profile</span></Link>
      <button onClick={doSignOut} className="flex flex-col items-center text-xs text-rose-600">
        <span>⏻</span><span className="mt-1">Sign out</span>
      </button>
    </nav>
  );
}

/* ----------------------------- Welcome/Auth ----------------------------- */
function Welcome() {
  return (
    <div className={cls.page(palette.bg.welcome) + " flex items-center justify-center"}>
      <div className="max-w-sm w-full p-8 text-center space-y-6">
        <h1 className="text-4xl font-extrabold tracking-tight">Skillverse</h1>
        <p className="text-slate-700">Exchange skills. Learn together.</p>
        <div className="grid grid-cols-1 gap-3">
          <Link to="/signup"><Btn className="w-full">Sign Up</Btn></Link>
          <Link to="/login"><Btn className="w-full" variant="secondary">Login</Btn></Link>
        </div>
      </div>
    </div>
  );
}

function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [skills, setSkills] = useState("");
  const [learning, setLearning] = useState("");
  const [bio, setBio] = useState("");
  const navigate = useNavigate();

  const handleSignup = async () => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;
      await setDoc(doc(db, "users", user.uid), {
        name, email, role, skills, learning, bio,
        photoURL: "", online: false, lastActive: serverTimestamp(),
      });
      navigate("/dashboard");
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  return (
    <div className={cls.page(palette.bg.auth)}>
      <div className="p-8 max-w-md mx-auto">
        <div className={cls.card + " p-6 space-y-4"}>
          <h2 className="text-2xl font-bold">Sign Up</h2>
          <input className={cls.input} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={cls.input} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={cls.input} placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="flex gap-2">
            <Btn variant={role === "Teacher" ? "primary" : "secondary"} onClick={() => setRole("Teacher")}>Teacher</Btn>
            <Btn variant={role === "Learner" ? "primary" : "secondary"} onClick={() => setRole("Learner")}>Learner</Btn>
            <Btn variant={role === "Both" ? "primary" : "secondary"} onClick={() => setRole("Both")}>Both</Btn>
          </div>
          <input className={cls.input} placeholder="Skills you can teach" value={skills} onChange={(e) => setSkills(e.target.value)} />
          <input className={cls.input} placeholder="Skills you want to learn" value={learning} onChange={(e) => setLearning(e.target.value)} />
          <textarea className={cls.input} placeholder="Short bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
          <Btn onClick={handleSignup} className="w-full">Sign Up</Btn>
          <p className="text-center">Already have an account? <Link to="/login" className="text-indigo-700 underline">Login</Link></p>
        </div>
      </div>
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try { await signInWithEmailAndPassword(auth, email, password); navigate("/dashboard"); }
    catch (error) { alert("Login failed: " + error.message); }
  };

  return (
    <div className={cls.page(palette.bg.auth)}>
      <div className="p-8 max-w-md mx-auto">
        <div className={cls.card + " p-6 space-y-4"}>
          <h2 className="text-2xl font-bold">Login</h2>
          <input className={cls.input} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={cls.input} placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Btn onClick={handleLogin} className="w-full">Login</Btn>
          <p className="text-center">New here? <Link to="/signup" className="text-indigo-700 underline">Create an account</Link></p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Dashboard ------------------------------ */
function Sparkline({ data = [], width = 120, height = 36, className = "" }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const pad = 2;
  const innerH = height - pad * 2;
  const stepX = data.length > 1 ? width / (data.length - 1) : width;
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - pad - (v / max) * innerH;
    return [x, y];
  });
  const d = points.map(([x, y], i) => (i ? `L${x},${y}` : `M${x},${y}`)).join(" ");
  return (
    <svg width={width} height={height} className={className} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function Dashboard() {
  const [userData, setUserData] = useState(null);
  const [matches, setMatches] = useState([]);
  const [newMessageCounts, setNewMessageCounts] = useState({});
  const [sortBy, setSortBy] = useState("active"); // 'active' | 'name'

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      const meRef = doc(db, "users", user.uid);
      const meSnap = await getDoc(meRef);
      if (!meSnap.exists()) return;
      const me = meSnap.data();
      setUserData(me);

      const usersSnap = await getDocs(collection(db, "users"));
      const list = [];
      usersSnap.forEach((d) => {
        const other = d.data();
        if (
          d.id !== user.uid &&
          (other.skills || "").toLowerCase().includes((me.learning || "").toLowerCase())
        ) {
          list.push({ id: d.id, ...other });
          const chatId = [user.uid, d.id].sort().join("_");
          const qy = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp"));
          onSnapshot(qy, async (snap) => {
            const msgs = snap.docs.map((x) => x.data());
            let lastRead = null;
            try {
              const metaSnap = await getDoc(doc(db, "users", user.uid, "chats", chatId));
              if (metaSnap.exists()) lastRead = metaSnap.data().lastRead || null;
            } catch {}
            const unread = msgs.filter((m) => {
              if (!m.timestamp || !m.sender) return false;
              if (m.sender === user.uid) return false;
              if (!lastRead) return true;
              const msgTs = m.timestamp.toMillis ? m.timestamp.toMillis() : +new Date(m.timestamp);
              const lrTs = lastRead?.toMillis ? lastRead.toMillis() : lastRead ? +new Date(lastRead) : 0;
              return msgTs > lrTs;
            }).length;
            setNewMessageCounts((prev) => ({ ...prev, [d.id]: unread }));
          });
        }
      });
      setMatches(list);
    });
    return () => unsub();
  }, []);

  const ts = (x) => (x?.toMillis ? x.toMillis() : x ? +new Date(x) : 0);

  const sortedMatches = React.useMemo(() => {
    const arr = [...matches];
    if (sortBy === "name") arr.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    else arr.sort((a, b) => ts(b.lastActive) - ts(a.lastActive));
    return arr;
  }, [matches, sortBy]);

  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const newMatchCount = React.useMemo(
    () => matches.filter((m) => now - ts(m.lastActive) <= ONE_DAY).length,
    [matches]
  );
  const activity7 = React.useMemo(() => {
    const arr = Array(7).fill(0);
    matches.forEach((m) => {
      const t = ts(m.lastActive);
      if (!t) return;
      const daysAgo = Math.floor((now - t) / ONE_DAY);
      if (daysAgo >= 0 && daysAgo < 7) arr[6 - daysAgo] += 1;
    });
    return arr;
  }, [matches]);

  return (
    <div className={cls.page(palette.bg.home)}>
      <div className="p-4 max-w-md mx-auto">
        <h2 className="text-xl font-bold mb-3">Welcome {userData?.name || "User"}</h2>

        {/* Compact header */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className={cls.card + " p-3 flex items-center justify-between"}>
            <div>
              <div className="text-xs text-slate-600">New matches</div>
              <div className="text-2xl font-bold">{newMatchCount}</div>
            </div>
            <Sparkline data={activity7} className="text-indigo-600" />
          </div>
          <div className={cls.card + " p-3 flex items-center justify-between"}>
            <div>
              <div className="text-xs text-slate-600">Total matches</div>
              <div className="text-2xl font-bold">{matches.length}</div>
            </div>
            <div className="text-right text-slate-500 text-sm">
              <div>Last 7d</div>
              <div className="font-medium">{activity7.reduce((a, b) => a + b, 0)}</div>
            </div>
          </div>
        </div>

        {/* Matches */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold">Matches</h2>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-600">Sort by</span>
            <select
              className="border rounded-lg px-2 py-1 bg-white/80"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="active">Recent</option>
              <option value="name">Name (A–Z)</option>
            </select>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          {sortedMatches.map((match) => (
            <div key={match.id} className={cls.card + " p-3 relative flex items-center gap-3"}>
              {match.photoURL ? (
                <img src={match.photoURL} alt={match.name} className="w-10 h-10 rounded-full object-cover border" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-white flex items-center justify-center text-sm font-bold shadow">
                  {((match.name || "").split(" ").map((n) => n[0]).slice(0, 2).join("") || "U").toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{match.name}</div>
                <div className="mt-1 text-xs text-slate-600">Teaches</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(match.skills || "").split(",").filter(Boolean).slice(0, 2).map((s, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700">{s.trim()}</span>
                  ))}
                </div>
                <div className="mt-2 text-xs text-slate-600">Wants to learn</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(match.learning || "").split(",").filter(Boolean).slice(0, 2).map((s, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-violet-50 text-violet-700">{s.trim()}</span>
                  ))}
                </div>
              </div>
              <Link to={`/profile/${match.id}`} className="text-2xl text-slate-400 px-2 shrink-0" aria-label={`View ${match.name}'s profile`}>›</Link>
              {newMessageCounts[match.id] > 0 && (
                <span className="absolute top-2 right-7 bg-rose-600 text-white rounded-full text-[10px] px-2 py-0.5">
                  {newMessageCounts[match.id]}
                </span>
              )}
            </div>
          ))}
          {sortedMatches.length === 0 && <p className="text-slate-600">No matches yet. Update your profile?</p>}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Sessions (new) ------------------------------ */
function StatusBadge({ status }) {
  const map = {
    pending: "bg-amber-100 text-amber-800",
    accepted: "bg-emerald-100 text-emerald-800",
    rejected: "bg-rose-100 text-rose-800",
  };
  const label = status?.[0]?.toUpperCase() + status?.slice(1);
  return <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${map[status] || "bg-slate-100 text-slate-700"}`}>{label || "Unknown"}</span>;
}
function PersonChip({ name, photoURL }) {
  return (
    <div className="flex items-center gap-2">
      {photoURL ? (
        <img src={photoURL} alt={name} className="w-7 h-7 rounded-full object-cover border" />
      ) : (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-white flex items-center justify-center text-[10px] font-bold">
          {(name || "U").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
        </div>
      )}
      <span className="text-sm font-medium truncate max-w-[120px]">{name}</span>
    </div>
  );
}
function prettyWhen(startISO, endISO) {
  const s = startISO ? new Date(startISO) : null;
  const e = endISO ? new Date(endISO) : null;
  if (!s) return "Unknown time";
  const date = s.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const t1 = s.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const t2 = e ? e.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : null;
  return `${date} • ${t1}${t2 ? `–${t2}` : ""}`;
}
function Sessions() {
  const [currentUid, setCurrentUid] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [filter, setFilter] = useState("pending"); // pending | accepted | rejected | all
  const cleanedRef = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      setCurrentUid(user.uid);

      const usersSnap = await getDocs(collection(db, "users"));
      const um = {};
      usersSnap.forEach((d) => (um[d.id] = d.data()));
      setUserMap(um);

      const q1 = query(collection(db, "sessions"), where("hostUid", "==", user.uid));
      const q2 = query(collection(db, "sessions"), where("guestUid", "==", user.uid));
      const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      const rows = [...s1.docs, ...s2.docs].map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => new Date(b.start || b.datetime || 0) - new Date(a.start || a.datetime || 0));
      setSessions(rows);

      // Auto-delete >45 days old
      if (!cleanedRef.current) {
        cleanedRef.current = true;
        const THRESH = Date.now() - 45 * 24 * 60 * 60 * 1000;
        const toDelete = rows.filter((s) => {
          const base = new Date(s.end || s.start || s.datetime || 0).getTime();
          return base && base < THRESH;
        });
        await Promise.all(toDelete.map((s) => deleteDoc(doc(db, "sessions", s.id)).catch(() => {})));
        if (toDelete.length) setSessions((prev) => prev.filter((s) => !toDelete.find((x) => x.id === s.id)));
      }
    });
    return () => unsub();
  }, []);

  const respondToSession = async (sessionId, status) => {
    await updateDoc(doc(db, "sessions", sessionId), { status });
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, status } : s)));
  };

  const filtered = sessions.filter((s) => (filter === "all" ? true : (s.status || "pending") === filter));

  return (
    <div className={cls.page(palette.bg.sched)}>
      <div className="p-4 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">Sessions</h2>
          <div className="grid grid-cols-4 gap-1 bg-white/70 rounded-xl p-1 border border-white/60">
            {["pending", "accepted", "rejected", "all"].map((k) => (
              <button key={k} className={`px-3 py-1 rounded-lg text-sm ${filter === k ? "bg-indigo-600 text-white" : "text-slate-700"}`} onClick={() => setFilter(k)}>
                {k[0].toUpperCase() + k.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-slate-600">No {filter !== "all" ? filter : ""} sessions.</p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((s) => {
              const meHost = s.hostUid === currentUid;
              const host = userMap[s.hostUid] || {};
              const guest = userMap[s.guestUid] || {};
              const status = (s.status || "pending").toLowerCase();
              const when = prettyWhen(s.start || s.datetime, s.end);
              const meetingLink = `https://meet.jit.si/skillverse-${s.id}`;
              const borderColor =
                status === "pending" ? "border-amber-300" : status === "accepted" ? "border-emerald-300" : "border-rose-300";

              return (
                <li key={s.id} className={`${cls.card} p-3 border-l-4 ${borderColor}`}>
                  <div className="flex items-start gap-3">
                    {/* overlapped avatars */}
                    <div className="relative w-12">
                      {host.photoURL ? (
                        <img src={host.photoURL} alt={host.name} className="w-8 h-8 rounded-full object-cover border absolute left-0 top-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-white flex items-center justify-center text-[10px] font-bold absolute left-0 top-0">
                          {(host.name || "U").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                      )}
                      {guest.photoURL ? (
                        <img src={guest.photoURL} alt={guest.name} className="w-8 h-8 rounded-full object-cover border absolute left-4 top-4" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center text-[10px] font-bold absolute left-4 top-4">
                          {(guest.name || "U").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <PersonChip name={meHost ? guest.name : host.name} photoURL={(meHost ? guest : host).photoURL} />
                        <StatusBadge status={status} />
                      </div>
                      <div className="mt-1 text-sm">
                        <span className="font-semibold">{s.topic || "General"}</span>
                        <span className="text-slate-500"> • {when}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        Host: {host.name || s.hostUid} &nbsp;•&nbsp; Guest: {guest.name || s.guestUid}
                      </div>
                    </div>

                    <div className="grid gap-1">
                      {status === "accepted" && (
                        <a href={meetingLink} target="_blank" rel="noopener noreferrer" className="px-3 py-1 rounded-lg text-xs bg-indigo-600 text-white text-center">Join</a>
                      )}
                      {status === "pending" && s.guestUid === currentUid && (
                        <>
                          <button className="px-3 py-1 rounded-lg text-xs bg-emerald-600 text-white" onClick={() => respondToSession(s.id, "accepted")}>Accept</button>
                          <button className="px-3 py-1 rounded-lg text-xs bg-rose-600 text-white" onClick={() => respondToSession(s.id, "rejected")}>Reject</button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ User Profile ------------------------------ */
function UserProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [ratingAvg, setRatingAvg] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      const userRef = doc(db, "users", id);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) setProfile(userSnap.data());

      const hostQ = query(collection(db, "sessions"), where("hostUid", "==", id));
      const guestQ = query(collection(db, "sessions"), where("guestUid", "==", id));
      const [hostSnap, guestSnap] = await Promise.all([getDocs(hostQ), getDocs(guestQ)]);
      const sessions = [...hostSnap.docs, ...guestSnap.docs];

      let sum = 0, cnt = 0;
      await Promise.all(
        sessions.map(async (sDoc) => {
          const revSnap = await getDocs(collection(db, "sessions", sDoc.id, "reviews"));
          revSnap.forEach((r) => {
            const rev = r.data();
            if (rev.userUid && rev.userUid !== id && rev.rating) {
              sum += Number(rev.rating) || 0;
              cnt += 1;
            }
          });
        })
      );
      setRatingAvg(cnt > 0 ? sum / cnt : 0);
      setRatingCount(cnt);
    };
    load();
  }, [id]);

  return (
    <div className={cls.page(palette.bg.profile)}>
      <div className="p-4 max-w-md mx-auto">
        {profile ? (
          <div className={cls.card + " p-4 mt-2"}>
            <div className="flex items-center gap-3 mb-2">
              {profile.photoURL ? (
                <img src={profile.photoURL} alt="avatar" className="w-12 h-12 rounded-full object-cover border" />
              ) : (<Initials name={profile.name} />)}
              <h2 className="text-xl font-bold">{profile.name}</h2>
            </div>
            <p><strong>Skills teaches:</strong> {profile.skills}</p>
            <p><strong>Wants to learn:</strong> {profile.learning}</p>
            <p><strong>Role:</strong> {profile.role}</p>
            <p><strong>Bio:</strong> {profile.bio}</p>
            <div className="mt-2 flex items-center gap-2">
              <StarRating value={ratingAvg} />
              <span className="text-sm text-slate-600">({ratingCount})</span>
            </div>
            <div className="mt-3 flex gap-2">
              <Link to={`/chat/${id}`}><Btn>Start Chat</Btn></Link>
              <Link to={`/schedule/${id}`}><Btn variant="success">Schedule Session</Btn></Link>
            </div>
          </div>
        ) : (<p>Loading profile...</p>)}
      </div>
    </div>
  );
}

/* ----------------------------- Modern Chats list ----------------------------- */
function timeAgoShort(d) {
  const t = typeof d === "number" ? d : +new Date(d);
  const diff = Date.now() - t;
  const m = 60 * 1000, h = 60 * m, d1 = 24 * h;
  if (diff < m) return "now";
  if (diff < h) return Math.floor(diff / m) + "m";
  if (diff < d1) return Math.floor(diff / h) + "h";
  const dt = new Date(t);
  const yday = new Date(); yday.setDate(yday.getDate() - 1);
  if (dt.toDateString() === yday.toDateString()) return "yday";
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function OnlineDot({ online }) {
  return (
    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-white ${online ? "bg-emerald-500" : "bg-slate-300"}`} />
  );
}
function ChatListItem({ row }) {
  const last = row.lastText || "";
  const preview = last.length > 60 ? last.slice(0, 57).trimEnd() + "…" : last;
  return (
    <Link to={`/chat/${row.uid}`} className={cls.card + " block p-3 hover:shadow-lg transition-shadow"}>
      <div className="flex items-center gap-3">
        <div className="relative">
          {row.photoURL ? (
            <img src={row.photoURL} alt={row.name} className="w-11 h-11 rounded-full object-cover border" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-white flex items-center justify-center text-sm font-bold">
              {(row.name || "U").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
            </div>
          )}
          <OnlineDot online={row.online} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-semibold truncate">{row.name}</div>
            {row.unread > 0 && <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-rose-600 text-white">{row.unread}</span>}
          </div>
          <div className="text-sm text-slate-600 truncate">{preview || "Say hi 👋"}</div>
        </div>
        <div className="text-right text-xs text-slate-500 shrink-0">
          <div>{row.lastTs ? timeAgoShort(row.lastTs) : ""}</div>
          <div className="text-slate-400 text-lg leading-none">›</div>
        </div>
      </div>
    </Link>
  );
}
function Chats() {
  const [rows, setRows] = useState({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | unread

  useEffect(() => {
    const unsubs = [];
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      const usersSnap = await getDocs(collection(db, "users"));
      usersSnap.forEach((d) => {
        if (d.id === user.uid) return;
        const otherId = d.id;

        // live user presence
        const unsubUser = onSnapshot(doc(db, "users", otherId), (snap) => {
          const data = snap.data() || {};
          setRows((prev) => ({
            ...prev,
            [otherId]: {
              ...(prev[otherId] || {}),
              uid: otherId,
              name: data.name || otherId,
              photoURL: data.photoURL || "",
              online:
                data.online ||
                (data.lastActive &&
                  ((data.lastActive.toMillis
                    ? Date.now() - data.lastActive.toMillis()
                    : Date.now() - new Date(data.lastActive).getTime()) < 120000)),
            },
          }));
        });
        unsubs.push(unsubUser);

        // last message + unread
        const chatId = [user.uid, otherId].sort().join("_");
        const lastQ = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "desc"), limit(1));
        const unsubLast = onSnapshot(lastQ, async (snap) => {
          const doc0 = snap.docs[0]?.data();
          const ts =
            doc0?.timestamp?.toMillis?.() ??
            (doc0?.timestamp ? +new Date(doc0.timestamp) : 0);

          setRows((prev) => ({
            ...prev,
            [otherId]: { ...(prev[otherId] || { uid: otherId }), lastText: doc0?.text || "", lastSender: doc0?.sender || "", lastTs: ts || 0 },
          }));

          try {
            const metaSnap = await getDoc(doc(db, "users", user.uid, "chats", chatId));
            const lr = metaSnap.exists() ? metaSnap.data().lastRead : null;
            const lrTs = lr?.toMillis?.() ?? (lr ? +new Date(lr) : 0);
            const unread = ts && doc0?.sender && doc0.sender !== user.uid && ts > lrTs ? 1 : 0;
            setRows((prev) => ({ ...prev, [otherId]: { ...(prev[otherId] || {}), unread } }));
          } catch {}
        });
        unsubs.push(unsubLast);
      });
    });
    return () => { unsubAuth && unsubAuth(); unsubs.forEach((u) => u && u()); };
  }, []);

  const list = React.useMemo(() => {
    const all = Object.values(rows);
    const filtered = filter === "unread" ? all.filter((r) => (r.unread || 0) > 0) : all;
    const searched = search
      ? filtered.filter((r) => (r.name || "").toLowerCase().includes(search.trim().toLowerCase()))
      : filtered;
    return searched.sort((a, b) => (b.lastTs || 0) - (a.lastTs || 0));
  }, [rows, search, filter]);

  return (
    <div className={cls.page(palette.bg.home)}>
      <div className="p-4 max-w-md mx-auto">
        <div className="sticky top-0 z-10 pb-3">
          <h2 className="text-2xl font-bold text-center mb-3">Chats</h2>
          <div className="flex items-center gap-2">
            <input className={cls.input + " flex-1"} placeholder="Search people…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="grid grid-cols-2 bg-white/70 rounded-xl p-1 border border-white/60">
              {["all", "unread"].map((k) => (
                <button key={k} className={`px-3 py-1 rounded-lg text-sm ${filter === k ? "bg-indigo-600 text-white" : "text-slate-700"}`} onClick={() => setFilter(k)}>
                  {k === "all" ? "All" : "Unread"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {list.map((r) => <ChatListItem key={r.uid} row={r} />)}
          {list.length === 0 && (
            <p className="text-center text-slate-600 pt-8">
              {filter === "unread" ? "No unread chats" : "No active chats yet."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- Chat (DM) ---------------------------------- */
function Chat() {
  const { id } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [otherLastRead, setOtherLastRead] = useState(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    let unsubAuth = () => {};
    let unsubMsgs = () => {};
    let unsubOther = () => {};
    let unsubOtherLastRead = () => {};

    unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      setCurrentUser(user);
      const otherUserRef = doc(db, "users", id);
      unsubOther = onSnapshot(otherUserRef, (snap) => { if (snap.exists()) setOtherUser(snap.data()); });

      const chatId = [user.uid, id].sort().join("_");
      const messagesRef = collection(db, "chats", chatId, "messages");
      const qy = query(messagesRef, orderBy("timestamp"));

      unsubMsgs = onSnapshot(qy, async (snapshot) => {
        const msgs = snapshot.docs.map((doc) => doc.data());
        setMessages(msgs);
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        const metaRef = doc(db, "users", user.uid, "chats", chatId);
        await setDoc(metaRef, { lastRead: serverTimestamp() }, { merge: true });
      });

      const otherMetaRef = doc(db, "users", id, "chats", chatId);
      unsubOtherLastRead = onSnapshot(otherMetaRef, (snap) => {
        if (snap.exists()) setOtherLastRead(snap.data().lastRead || null);
      });
    });

    return () => {
      unsubMsgs && unsubMsgs();
      unsubAuth && unsubAuth();
      unsubOther && unsubOther();
      unsubOtherLastRead && unsubOtherLastRead();
    };
  }, [id]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;
    const chatId = [currentUser.uid, id].sort().join("_");
    const messageRef = collection(db, "chats", chatId, "messages");
    await addDoc(messageRef, { sender: currentUser.uid, text: newMessage, timestamp: serverTimestamp() });
    setNewMessage("");
    setShowEmojis(false);
  };

  const myLastMessageTime = (() => {
    const mine = [...messages].reverse().find((m) => m.sender === currentUser?.uid);
    if (!mine) return null;
    const t = mine.timestamp;
    return t?.toMillis ? t.toMillis() : t ? +new Date(t) : null;
  })();
  const otherReadMillis = otherLastRead?.toMillis ? otherLastRead.toMillis() : otherLastRead ? +new Date(otherLastRead) : null;
  const seen = myLastMessageTime && otherReadMillis && otherReadMillis >= myLastMessageTime;

  const isOnline =
    otherUser?.online ||
    (otherUser?.lastActive &&
      (otherUser.lastActive.toMillis ? Date.now() - otherUser.lastActive.toMillis() < 120000 : Date.now() - +new Date(otherUser.lastActive) < 120000));

  return (
    <div className={cls.page(palette.bg.chat)}>
      <div className="p-4 max-w-md mx-auto">
        <div className="text-center mb-3">
          <h2 className="text-xl font-bold">Chat with {otherUser?.name || "User"}</h2>
          <div className="text-xs text-slate-600 flex items-center justify-center gap-1">
            <span className={`inline-block w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-slate-400"}`} />
            {isOnline ? "Online" : "Offline"}
          </div>
        </div>

        <div className={"h-96 overflow-y-auto p-4 " + cls.card}>
          {messages.map((msg, i) => (
            <div key={i} className={`my-2 p-2 rounded-xl max-w-xs ${msg.sender === currentUser?.uid ? "bg-indigo-600 text-white ml-auto" : "bg-white/80 backdrop-blur border border-white/60"}`}>
              <div>{msg.text}</div>
              <div className="text-[10px] text-right mt-1 opacity-70">
                {new Date(msg.timestamp?.toDate ? msg.timestamp.toDate() : msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
          <div ref={chatEndRef}></div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button className="px-3 py-2 rounded-xl border bg-white/80" onClick={() => setShowEmojis((s) => !s)}>😊</button>
          <input className={cls.input + " flex-1"} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." />
          <Btn onClick={sendMessage}>Send</Btn>
        </div>

        {showEmojis && (
          <div className={cls.card + " mt-2 p-2 flex flex-wrap gap-2"}>
            {["😀", "😂", "👍", "🙏", "🎉", "❤️", "🔥", "💯", "😢", "😎"].map((e) => (
              <button key={e} className="text-xl" onClick={() => setNewMessage((t) => t + e)}>{e}</button>
            ))}
          </div>
        )}

        <div className="text-center text-xs mt-2 text-slate-600">{seen ? "Seen" : ""}</div>
      </div>
    </div>
  );
}

/* ------------------------- Schedule Session ------------------------ */
function ScheduleSession() {
  const { id } = useParams();
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [topic, setTopic] = useState("");
  const [monthCursor, setMonthCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const hostSnap = await getDoc(doc(db, "users", user.uid));
          const guestSnap = await getDoc(doc(db, "users", id));
          const defaultTopic =
            (hostSnap.exists() && hostSnap.data().skills) ||
            (guestSnap.exists() && guestSnap.data().learning) ||
            "General";
          setTopic(defaultTopic);
        } catch {}
      }
    });
    return () => unsubscribe();
  }, [id]);

  const monthLabel = monthCursor.toLocaleString(undefined, { month: "long", year: "numeric" });
  const startOfGrid = () => { const d = new Date(monthCursor); const dow = d.getDay(); d.setDate(1 - dow); return d; };
  const daysGrid = () => {
    const cells = []; const start = startOfGrid();
    for (let i = 0; i < 42; i++) {
      const day = new Date(start); day.setDate(start.getDate() + i);
      const dateStr = day.toISOString().split("T")[0];
      const inMonth = day.getMonth() === monthCursor.getMonth();
      cells.push(
        <button key={dateStr} onClick={() => setSelectedDate(dateStr)} className={`p-2 rounded text-sm ${selectedDate === dateStr ? "bg-indigo-600 text-white" : inMonth ? "bg-white" : "bg-white/50 text-slate-400"} border`} style={{ height: 44 }}>
          {day.getDate()}
        </button>
      );
    }
    return cells;
  };

  const handleSchedule = async () => {
    if (!selectedDate || !startTime || !endTime || !currentUser) return alert("Pick a date, start and end time!");
    if (endTime <= startTime) return alert("End time must be after start time.");
    const startISO = new Date(`${selectedDate}T${startTime}`).toISOString();
    const endISO = new Date(`${selectedDate}T${endTime}`).toISOString();
    await addDoc(collection(db, "sessions"), {
      hostUid: currentUser.uid,
      guestUid: id,
      start: startISO,
      end: endISO,
      status: "pending",
      topic: topic || "General",
    });
    alert("Session requested! Waiting for confirmation.");
  };

  return (
    <div className={cls.page(palette.bg.sched)}>
      <div className="p-4 max-w-md mx-auto">
        <div className={cls.card + " p-4"}>
          <div className="flex items-center justify-between mb-2">
            <button className="px-2 py-1 border rounded" onClick={() => { const d = new Date(monthCursor); d.setMonth(d.getMonth() - 1); setMonthCursor(d); }}>{"<"}</button>
            <div className="font-semibold">{monthLabel}</div>
            <button className="px-2 py-1 border rounded" onClick={() => { const d = new Date(monthCursor); d.setMonth(d.getMonth() + 1); setMonthCursor(d); }}>{">"}</button>
          </div>
          <div className="grid grid-cols-7 text-center text-xs text-slate-600 mb-1">{["S","M","T","W","T","F","S"].map((d) => (<div key={d}>{d}</div>))}</div>
          <div className="grid grid-cols-7 gap-1 mb-4">{daysGrid()}</div>
          <label className="block mb-3">
            <span className="text-sm font-semibold">Topic</span>
            <input className={cls.input + " mt-1"} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., Java, Gym" />
          </label>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block"><span className="text-sm font-semibold">Start Time</span>
              <input type="time" className={cls.input + " mt-1"} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </label>
            <label className="block"><span className="text-sm font-semibold">End Time</span>
              <input type="time" className={cls.input + " mt-1"} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </label>
          </div>
          <Btn className="w-full" onClick={handleSchedule}>Confirm</Btn>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- My Profile ----------------------------- */
function MyProfile() {
  const [me, setMe] = useState(null);
  const [data, setData] = useState(null);
  const [edit, setEdit] = useState(false);
  const [taughtByTopic, setTaughtByTopic] = useState({});
  const [learnedByTopic, setLearnedByTopic] = useState({});
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);

  const handlePhotoFile = (file) => {
    if (!file || !me?.uid) return;
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `avatars/${me.uid}/${Date.now()}.${ext}`;
    const fileRef = sRef(storage, path);
    const task = uploadBytesResumable(fileRef, file, { contentType: file.type });
    setUploading(true);
    setUploadPct(0);
    task.on(
      "state_changed",
      (snap) => setUploadPct(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      (err) => { setUploading(false); alert("Upload failed: " + err.message); },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        await updateDoc(doc(db, "users", me.uid), { photoURL: url });
        setData((prev) => ({ ...prev, photoURL: url }));
        setUploading(false);
      }
    );
  };

  useEffect(() => {
    let unsubAuth = () => {};
    let unsubTeach = () => {};
    let unsubLearn = () => {};

    unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      setMe(user);
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setData(snap.data());

      const qTeach = query(collection(db, "sessions"), where("hostUid", "==", user.uid), where("status", "==", "accepted"));
      const qLearn = query(collection(db, "sessions"), where("guestUid", "==", user.uid), where("status", "==", "accepted"));

      unsubTeach = onSnapshot(qTeach, (teachSnap) => {
        const tMap = {};
        teachSnap.forEach((d) => { const s = d.data(); const topic = s.topic || (data?.skills ?? "General"); tMap[topic] = (tMap[topic] || 0) + 1; });
        setTaughtByTopic(tMap);
      });
      unsubLearn = onSnapshot(qLearn, (learnSnap) => {
        const lMap = {};
        learnSnap.forEach((d) => { const s = d.data(); const topic = s.topic || (data?.learning ?? "General"); lMap[topic] = (lMap[topic] || 0) + 1; });
        setLearnedByTopic(lMap);
      });
    });

    return () => { unsubTeach && unsubTeach(); unsubLearn && unsubLearn(); unsubAuth && unsubAuth(); };
  }, [data?.skills, data?.learning]);

  if (!data) {
    return (
      <div className={cls.page(palette.bg.profile)}>
        <div className="p-4 max-w-md mx-auto"><p>Loading...</p></div>
      </div>
    );
  }

  const renderBars = (map, colorClass) => {
    const entries = Object.entries(map);
    if (entries.length === 0) return <span className="text-slate-600 text-sm">No accepted sessions yet.</span>;
    const max = Math.max(...entries.map(([, c]) => c));
    return (
      <div className="space-y-2 w-full">
        {entries.map(([topic, count]) => (
          <div key={topic} className="w-full">
            <div className="flex justify-between text-xs mb-1"><span className="font-medium">{topic}</span><span>{count}</span></div>
            <div className="h-2 bg-slate-200 rounded"><div className={`h-2 ${colorClass} rounded`} style={{ width: `${(count / max) * 100}%` }} /></div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={cls.page(palette.bg.profile)}>
      <div className="p-4 max-w-md mx-auto">
        {!edit ? (
          <div className="space-y-4">
            <div className={cls.card + " p-4 space-y-2"}>
              <div className="flex items-center gap-3">
                <div className="relative">
                  {data.photoURL ? (
                    <img src={data.photoURL} alt="avatar" className="w-16 h-16 rounded-full object-cover border" />
                  ) : (<Initials name={data.name} />)}
                  <label className="absolute -bottom-1 -right-1 bg-white border rounded-full p-1 cursor-pointer shadow">✏️
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoFile(e.target.files?.[0])} />
                  </label>
                  {uploading && (
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white text-xs">{uploadPct}%</div>
                  )}
                </div>
                <div>
                  <p className="font-semibold">{data.name}</p>
                  <p className="text-sm text-slate-600">{data.email}</p>
                </div>
              </div>
              <p><strong>Skills taught:</strong> {data.skills}</p>
              <p><strong>Wants to learn:</strong> {data.learning}</p>
              <p><strong>Bio:</strong> {data.bio}</p>
              <Btn className="mt-2" onClick={() => setEdit(true)}>Edit</Btn>
            </div>

            <div className={cls.card + " p-4"}>
              <h3 className="font-semibold mb-2">Taught by Topic</h3>
              {renderBars(taughtByTopic, "bg-indigo-600")}
            </div>

            <div className={cls.card + " p-4"}>
              <h3 className="font-semibold mb-2">Learned by Topic</h3>
              {renderBars(learnedByTopic, "bg-emerald-600")}
            </div>
          </div>
        ) : (
          <div className={cls.card + " p-4 space-y-2"}>
            <label className="block"><span className="font-semibold">Teaches:</span>
              <input className={cls.input + " mt-1"} value={data.skills} onChange={(e) => setData({ ...data, skills: e.target.value })} />
            </label>
            <label className="block"><span className="font-semibold">Wants to Learn:</span>
              <input className={cls.input + " mt-1"} value={data.learning} onChange={(e) => setData({ ...data, learning: e.target.value })} />
            </label>
            <label className="block"><span className="font-semibold">Bio:</span>
              <textarea className={cls.input + " mt-1"} rows={3} value={data.bio} onChange={(e) => setData({ ...data, bio: e.target.value })} />
            </label>
            <div className="flex gap-2">
              <Btn variant="success" onClick={async () => {
                await updateDoc(doc(db, "users", me.uid), { skills: data.skills, learning: data.learning, bio: data.bio });
                setEdit(false);
              }}>Save</Btn>
              <Btn variant="secondary" onClick={() => setEdit(false)}>Cancel</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ Root wrapper ------------------------------ */
export default function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}
