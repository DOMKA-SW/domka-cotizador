// js/auth.js
const firebaseConfig = {
  // 🔑 Tus credenciales Firebase
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

// Hacemos que sean accesibles globalmente
window.auth = auth;
window.db = db;

// --- LOGIN ---
function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      window.location.href = "dashboard.html";
    })
    .catch((error) => {
      alert("Error en login: " + error.message);
    });
}

// --- LOGOUT ---
function logout() {
  auth.signOut()
    .then(() => {
      window.location.href = "index.html";
    })
    .catch((error) => {
      console.error("Error al cerrar sesión:", error);
    });
}

// Exportamos para usar en HTML (botones)
window.login = login;
window.logout = logout;
