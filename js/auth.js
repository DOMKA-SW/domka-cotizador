// auth.js
window.login = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const errorEl = document.getElementById("error");

  try {
    await auth.signInWithEmailAndPassword(email, password);
    window.location.href = "dashboard.html";
  } catch (err) {
    errorEl.textContent = "❌ " + err.message;
  }
};

window.logout = async function () {
  await auth.signOut();
  window.location.href = "index.html";
};
