const formClientes = document.getElementById("form-clientes");
const listaClientes = document.getElementById("clientes-list");

let editando = false;
let idEditando = null;

// Guardar cliente (nuevo o editado)
formClientes.addEventListener("submit", async (e) => {
  e.preventDefault();

  const cliente = {
    nombre: formClientes.nombre.value,
    email: formClientes.email.value,
    telefono: formClientes.telefono.value,
    empresa: formClientes.empresa.value,
    nit: formClientes.nit.value,
    numeroDocumento: formClientes.numeroDocumento.value || "", // 🔹 NUEVO
  };

  if (editando) {
    await db.collection("clientes").doc(idEditando).update(cliente);
    editando = false;
    idEditando = null;
  } else {
    await db.collection("clientes").add(cliente);
  }

  formClientes.reset();
  cargarClientes();
});

// Cargar clientes
async function cargarClientes() {
  const snapshot = await db.collection("clientes").get();
  listaClientes.innerHTML = "";
  let count = 0;

  snapshot.forEach((doc) => {
    const c = doc.data();
    count++;
    listaClientes.innerHTML += `
      <tr class="border-b table-row-striped">
        <td class="p-2">${c.nombre || "—"}</td>
        <td class="p-2">${c.email || "—"}</td>
        <td class="p-2">${c.telefono || "—"}</td>
        <td class="p-2">${c.empresa || "—"}</td>
        <td class="p-2">${c.nit || "—"}</td>
        <td class="p-2">${c.numeroDocumento || "—"}</td>
        <td class="p-2 space-x-2">
          <button onclick="editarCliente('${doc.id}')" class="action-btn action-btn-edit">Editar</button>
          <button onclick="eliminarCliente('${doc.id}')" class="action-btn action-btn-delete">Eliminar</button>
        </td>
      </tr>
    `;
  });

  // Actualizar contador
  const contador = document.getElementById("clientes-count");
  if (contador) contador.textContent = `${count} cliente${count !== 1 ? "s" : ""}`;

  // Mostrar/ocultar empty state
  const emptyState = document.getElementById("empty-state");
  if (emptyState) emptyState.style.display = count === 0 ? "block" : "none";
}

// Eliminar cliente
async function eliminarCliente(id) {
  if (confirm("¿Seguro de eliminar este cliente?")) {
    await db.collection("clientes").doc(id).delete();
    cargarClientes();
  }
}

// Editar cliente
async function editarCliente(id) {
  const docSnap = await db.collection("clientes").doc(id).get();
  const c = docSnap.data();

  formClientes.nombre.value = c.nombre || "";
  formClientes.email.value = c.email || "";
  formClientes.telefono.value = c.telefono || "";
  formClientes.empresa.value = c.empresa || "";
  formClientes.nit.value = c.nit || "";
  formClientes.numeroDocumento.value = c.numeroDocumento || ""; // 🔹 NUEVO

  editando = true;
  idEditando = id;

  // Scroll al formulario
  formClientes.scrollIntoView({ behavior: "smooth" });
}

// Cargar al iniciar
cargarClientes();

// Hacer accesibles desde HTML
window.eliminarCliente = eliminarCliente;
window.editarCliente = editarCliente;
