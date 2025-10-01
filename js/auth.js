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
      window.location.href = "home.html";  // 🔹 Redirige al home al salir
    })
    .catch((error) => {
      console.error("Error al cerrar sesión:", error);
    });
}

// --- PROTECCIÓN DE PÁGINAS PRIVADAS ---
window.auth.onAuthStateChanged(function(user) {
  // Obtener el archivo actual (ej: "clientes.html", "index.html")
  const page = window.location.pathname.split("/").pop();

  // Páginas públicas → no aplicar redirección
  if (page === "" || page === "home.html" || page === "index.html") {
    return;
  }

  // Si no hay usuario y la página NO es pública → mandar al home
  if (!user) {
    window.location.href = "home.html";
  }
});

// Exponer funciones en window
window.login = login;
window.logout = logout;
