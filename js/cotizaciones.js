const db = firebase.firestore();

let items = [];

// Cargar clientes en el select
async function cargarClientes() {
  const snapshot = await db.collection("clientes").get();
  const select = document.getElementById("cliente");
  select.innerHTML = `<option value="">-- Seleccione Cliente --</option>`;
  snapshot.forEach(doc => {
    let data = doc.data();
    select.innerHTML += `<option value="${doc.id}">${data.nombreEmpresa || data.nombre}</option>`;
  });
}

// Agregar item
function agregarItem(descripcion = "", cantidad = 1, precioUnitario = 0) {
  items.push({ descripcion, cantidad, precioUnitario });
  renderItems();
}

// Renderizar items
function renderItems() {
  const container = document.getElementById("items");
  container.innerHTML = "";
  items.forEach((item, index) => {
    container.innerHTML += `
      <div class="grid grid-cols-4 gap-2 mb-2">
        <input type="text" value="${item.descripcion}" placeholder="Descripción"
          class="border p-2 rounded"
          onchange="items[${index}].descripcion=this.value">
        <input type="number" value="${item.cantidad}" class="border p-2 rounded"
          onchange="items[${index}].cantidad=parseInt(this.value)">
        <input type="number" value="${item.precioUnitario}" class="border p-2 rounded"
          onchange="items[${index}].precioUnitario=parseFloat(this.value)">
        <button type="button" onclick="eliminarItem(${index})" class="bg-red-600 text-white px-2 rounded">X</button>
      </div>`;
  });
  calcularTotales();
}

// Eliminar item
function eliminarItem(index) {
  items.splice(index, 1);
  renderItems();
}

// Calcular totales
function calcularTotales() {
  let subtotal = items.reduce((acc, i) => acc + (i.cantidad * i.precioUnitario), 0);
  let impuestos = subtotal * 0.19;
  let total = subtotal + impuestos;

  document.getElementById("subtotal").innerText = "Subtotal: $" + subtotal.toLocaleString();
  document.getElementById("impuestos").innerText = "IVA (19%): $" + impuestos.toLocaleString();
  document.getElementById("total").innerText = "Total: $" + total.toLocaleString();

  return { subtotal, impuestos, total };
}

// Guardar cotización
document.getElementById("form-cotizacion").addEventListener("submit", async (e) => {
  e.preventDefault();
  const clienteId = document.getElementById("cliente").value;
  const notas = document.getElementById("notas").value;
  const { subtotal, impuestos, total } = calcularTotales();

  await db.collection("cotizaciones").add({
    clienteId,
    items,
    notas,
    subtotal,
    impuestos,
    total,
    estado: "pendiente",
    fecha: new Date()
  });

  items = [];
  renderItems();
  document.getElementById("form-cotizacion").reset();
  cargarCotizaciones();
});

// Listar cotizaciones
async function cargarCotizaciones() {
  const snapshot = await db.collection("cotizaciones").get();
  const tbody = document.getElementById("lista-cotizaciones");
  tbody.innerHTML = "";

  for (const doc of snapshot.docs) {
    let c = doc.data();
    let clienteDoc = await db.collection("clientes").doc(c.clienteId).get();
    let clienteNombre = clienteDoc.exists ? clienteDoc.data().nombreEmpresa || clienteDoc.data().nombre : "N/A";

    tbody.innerHTML += `
      <tr class="border">
        <td class="p-2">${clienteNombre}</td>
        <td class="p-2">$${c.total.toLocaleString()}</td>
        <td class="p-2">${c.estado}</td>
        <td class="p-2">
          <button class="bg-blue-600 text-white px-2 rounded">PDF</button>
          <a href="https://wa.me/?text=Hola, aquí tienes tu cotización: TOTAL $${c.total.toLocaleString()}" target="_blank"
            class="bg-green-600 text-white px-2 rounded">WhatsApp</a>
        </td>
      </tr>`;
  }
}

// Inicializar
cargarClientes();
cargarCotizaciones();

