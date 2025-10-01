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
      window.location.href = "dashboard.html"; // al iniciar sesión
    })
    .catch((error) => {
      alert("Error en login: " + error.message);
    });
}

// --- LOGOUT ---
function logout() {
  window.auth.signOut()
    .then(() => {
      window.location.href = "home.html";  // al cerrar sesión
    })
    .catch((error) => {
      console.error("Error al cerrar sesión:", error);
    });
}

// --- PROTECCIÓN DE PÁGINAS PRIVADAS ---
window.auth.onAuthStateChanged(function(user) {
  const page = window.location.pathname.split("/").pop();

  // Páginas públicas
  const publicPages = ["", "home.html", "index.html", "cotizacion.html", "cuenta.html"];

  // Si estamos en una página pública → no hacer nada
  if (publicPages.includes(page)) {
    return;
  }

  // Si no hay usuario en una página privada → mandar al home
  if (!user) {
    window.location.href = "home.html";
  }
});

// Exponer funciones en window
window.login = login;
window.logout = logout;
