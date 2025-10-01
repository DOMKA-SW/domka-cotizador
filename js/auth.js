// js/auth.js

// Inicializar Firebase solo si no está inicializado
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Inicializamos servicios
window.auth = firebase.auth();
window.db = firebase.firestore();

// --- LOGIN ---
function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  window.auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      window.location.href = "dashboard.html";
    })
    .catch((error) => {
      alert("Error en login: " + error.message);
    });
}

// --- LOGOUT ---
function logout() {
  window.auth.signOut()
    .then(() => {
      window.location.href = "home.html";  // 🔹 Redirige a home.html
    })
    .catch((error) => {
      console.error("Error al cerrar sesión:", error);
    });
}

// --- PROTECCIÓN DE PÁGINAS PRIVADAS ---
window.auth.onAuthStateChanged(function(user) {
  // Evitar que corra en home.html (página pública inicial)
  if (window.location.pathname.includes("home.html")) return;

  if (!user) {
    // No logueado → redirigir a home.html
    window.location.href = "home.html";
  }
});

// Exponer funciones en window
window.login = login;
window.logout = logout;
