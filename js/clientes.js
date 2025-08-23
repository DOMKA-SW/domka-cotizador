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
  snapshot.forEach((doc) => {
    const c = doc.data();
    listaClientes.innerHTML += `
      <tr class="border-b">
        <td class="p-2">${c.nombre}</td>
        <td class="p-2">${c.email}</td>
        <td class="p-2">${c.telefono}</td>
        <td class="p-2">${c.empresa}</td>
        <td class="p-2">${c.nit}</td>
        <td class="p-2 space-x-2">
          <button onclick="editarCliente('${doc.id}')" class="text-blue-600 hover:underline">Editar</button>
          <button onclick="eliminarCliente('${doc.id}')" class="text-red-600 hover:underline">Eliminar</button>
        </td>
      </tr>
    `;
  });
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

  formClientes.nombre.value = c.nombre;
  formClientes.email.value = c.email;
  formClientes.telefono.value = c.telefono;
  formClientes.empresa.value = c.empresa;
  formClientes.nit.value = c.nit;

  editando = true;
  idEditando = id;
}

// Cargar al iniciar
cargarClientes();

// Hacer accesibles desde HTML
window.eliminarCliente = eliminarCliente;
window.editarCliente = editarCliente;
