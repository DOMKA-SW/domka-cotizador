// firebase.js
const firebaseConfig = {
  apiKey: "AIzaSyAzcLdb3lm0efSMuG3U3U8etdb9oJe9SdY",
  authDomain: "domka-cotizador.firebaseapp.com",
  projectId: "domka-cotizador",
  storageBucket: "domka-cotizador.firebasestorage.app",
  messagingSenderId: "11233894590",
  appId: "1:11233894590:web:56fb76f5a1ca9af7453eef"
};

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);

// Firestore
const db = firebase.firestore();

// Auth solo si lo necesitas en login/dashboard
const auth = firebase.auth();

// Exportamos globalmente
window.db = db;
window.auth = auth;

