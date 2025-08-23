// js/clientes.js
const clientesTabla = document.getElementById("clientesTabla");
const clienteForm = document.getElementById("clienteForm");

// --- Guardar cliente ---
clienteForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nuevoCliente = {
    nombre: document.getElementById("nombre").value,
    empresa: document.getElementById("empresa").value,
    nit: document.getElementById("nit").value,
    telefono: document.getElementById("telefono").value,
    email: document.getElementById("email").value,
    fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    await db.collection("clientes").add(nuevoCliente);
    clienteForm.reset();
    cargarClientes();
  } catch (error) {
    console.error("Error al guardar cliente:", error);
  }
});

// --- Cargar clientes ---
async function cargarClientes() {
  clientesTabla.innerHTML = "";
  const snap = await db.collection("clientes").orderBy("fechaCreacion", "desc").get();

  snap.forEach((doc) => {
    const c = doc.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="p-2 border">${c.nombre || ""}</td>
      <td class="p-2 border">${c.empresa || ""}</td>
      <td class="p-2 border">${c.nit || ""}</td>
      <td class="p-2 border">${c.telefono || ""}</td>
      <td class="p-2 border">${c.email || ""}</td>
      <td class="p-2 border">
        <button onclick="eliminarCliente('${doc.id}')" class="bg-red-600 text-white px-2 py-1 rounded text-sm">Eliminar</button>
      </td>
    `;
    clientesTabla.appendChild(tr);
  });
}

// --- Eliminar cliente ---
async function eliminarCliente(id) {
  if (confirm("¿Seguro de eliminar este cliente?")) {
    try {
      await db.collection("clientes").doc(id).delete();
      cargarClientes();
    } catch (error) {
      console.error("Error al eliminar cliente:", error);
    }
  }
}

// Exponer funciones globalmente
window.eliminarCliente = eliminarCliente;
cargarClientes();
