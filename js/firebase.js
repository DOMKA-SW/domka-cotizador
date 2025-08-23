// firebase.js
const firebaseConfig = {
  apiKey: "AIzaSyAzcLdb3lm0efSMuG3U3U8etdb9oJe9SdY",
  authDomain: "domka-cotizador.firebaseapp.com",
  projectId: "domka-cotizador",
  storageBucket: "domka-cotizador.firebasestorage.app",
  messagingSenderId: "11233894590",
  appId: "1:11233894590:web:56fb76f5a1ca9af7453eef"
};

firebase.initializeApp(firebaseConfig);
window.auth = firebase.auth();
window.db = firebase.firestore();


