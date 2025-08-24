// firebase.js
const firebaseConfig = {
  apiKey: "AIzaSyAzcLdb3lm0efSMuG3U3U8etdb9oJe9SdY",
  authDomain: "domka-cotizador.firebaseapp.com",
  projectId: "domka-cotizador",
  storageBucket: "domka-cotizador.firebasestorage.app",
  messagingSenderId: "11233894590",
  appId: "1:11233894590:web:56fb76f5a1ca9af7453eef"
};

// Inicializar Firebase (compat)
firebase.initializeApp(firebaseConfig);

// Firestore y Auth desde compat
const db = firebase.firestore();
const auth = firebase.auth();

// Exportamos global
window.db = db;
window.auth = auth;
