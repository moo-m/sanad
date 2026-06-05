import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
const firebaseConfig = {
  apiKey: "AIzaSyDEVzj2FOCXJCbgDmdmQWiyDv8kB4IglKE",
  authDomain: "engineering-87472.firebaseapp.com",
  projectId: "engineering-87472",
  storageBucket: "engineering-87472.firebasestorage.app",
  messagingSenderId: "712205545095",
  appId: "1:712205545095:web:2aef2b144c1bdcb07c5222"
};const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
onAuthStateChanged(auth, (user) => { if (user) window.location.href = '../index.html'; });
document.getElementById('login-btn').onclick = async () => {
    const email = document.getElementById('viewer-email').value.trim();
    const password = document.getElementById('viewer-password').value;
    const errorDiv = document.getElementById('login-error');
    errorDiv.style.display = 'none';
    if (!email || !password) { errorDiv.textContent = 'يرجى إدخال البريد وكلمة المرور'; errorDiv.style.display = 'block'; return; }
    try { await signInWithEmailAndPassword(auth, email, password); }
    catch (err) { errorDiv.textContent = 'بيانات الدخول غير صحيحة'; errorDiv.style.display = 'block'; }
};