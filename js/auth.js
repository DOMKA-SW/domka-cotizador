import { auth } from "./firebase.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } 
  from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Login
window.login = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const errorEl = document.getElementById("error");

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "dashboard.html";
  } catch (err) {
    errorEl.textContent = "❌ " + err.message;
  }
};

// Logout
window.logout = async function () {
  await signOut(auth);
  window.location.href = "index.html";
};

// Redirigir si no está logueado
onAuthStateChanged(auth, (user) => {
  if (!user && window.location.pathname.includes("dashboard")) {
    window.location.href = "index.html";
  }
});
