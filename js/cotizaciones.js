// js/cotizaciones.js
const form = document.getElementById("form-cotizacion");
const tablaItems = document.querySelector("#tabla-items tbody");
const tablaCotizaciones = document.querySelector("#tabla-cotizaciones tbody");
const clienteSelect = document.getElementById("cliente");

let items = [];

// ============================
// 🔹 Cargar clientes en select
// ============================
async function cargarClientes() {
  clienteSelect.innerHTML = '<option value="">-- Selecciona un cliente --</option>'; // limpiar antes
  const snap = await db.collection("clientes").get();
  snap.forEach(doc => {
    const c = doc.data();
    const opt = document.createElement("option");
    opt.value = doc.id;
    opt.textContent = c.nombre || c.nombreEmpresa || "Sin nombre";
    clienteSelect.appendChild(opt);
  });
}
cargarClientes();

// ============================
// 🔹 Ítems dinámicos
// ============================
document.getElementById("agregar-item").addEventListener("click", () => {
  const row = document.createElement("tr");

  row.innerHTML = `
    <td><input type="text" class="desc border p-1 w-full"></td>
    <td><input type="number" class="cant border p-1 w-full" value="1"></td>
    <td><input type="number" class="precio border p-1 w-full" value="0"></td>
    <td class="subtotal text-right p-2">0</td>
    <td><button type="button" class="text-red-600">Eliminar</button></td>
  `;

  row.querySelector(".cant").addEventListener("input", recalcular);
  row.querySelector(".precio").addEventListener("input", recalcular);
  row.querySelector("button").addEventListener("click", () => {
    row.remove();
    recalcular();
  });

  tablaItems.appendChild(row);
  recalcular();
});

function recalcular() {
  let subtotal = 0;
  items = [];
  tablaItems.querySelectorAll("tr").forEach(tr => {
    const desc = tr.querySelector(".desc").value;
    const cant = Number(tr.querySelector(".cant").value) || 0;
    const precio = Number(tr.querySelector(".precio").value) || 0;
    const sub = cant * precio;
    tr.querySelector(".subtotal").textContent = sub.toLocaleString("es-CO");
    subtotal += sub;
    items.push({ descripcion: desc, cantidad: cant, precio, subtotal: sub });
  });

  const impuestos = Math.round(subtotal * 0.19);
  const total = subtotal + impuestos;
  document.getElementById("subtotal").textContent = `Subtotal: $${subtotal.toLocaleString("es-CO")}`;
  document.getElementById("impuestos").textContent = `IVA (19%): $${impuestos.toLocaleString("es-CO")}`;
  document.getElementById("total").textContent = `Total: $${total.toLocaleString("es-CO")}`;
  return { subtotal, impuestos, total };
}

// ============================
// 🔹 Guardar cotización
// ============================
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const clienteId = clienteSelect.value;
  const notas = document.getElementById("notas").value;
  const { subtotal, impuestos, total } = recalcular();

  if (!clienteId) {
    alert("Selecciona un cliente");
    return;
  }

  // Buscar cliente seleccionado
  const clienteDoc = await db.collection("clientes").doc(clienteId).get();
  const clienteData = clienteDoc.data() || {};

  const cotizacion = {
    clienteId,
    nombreCliente: clienteData.nombre || clienteData.nombreEmpresa || "Sin nombre",
    telefono: clienteData.telefono || "",
    notas,
    items,
    subtotal,
    impuestos,
    total,
    fecha: new Date(),
    estado: "pendiente"
  };

  const docRef = await db.collection("cotizaciones").add(cotizacion);

  // Guardar link público
  await db.collection("cotizaciones").doc(docRef.id).update({
    linkPublico: `https://domka-sw.github.io/domka-cotizador/public/cotizacion.html?id=${docRef.id}`
  });

  alert("✅ Cotización guardada");
  form.reset();
  tablaItems.innerHTML = "";
  cargarCotizaciones();
});

// ============================
// 🔹 Listar cotizaciones
// ============================
async function cargarCotizaciones() {
  tablaCotizaciones.innerHTML = "";
  const snap = await db.collection("cotizaciones").get();
  snap.forEach(doc => {
    const c = doc.data();
    const nombreCliente = c.nombreCliente || c.clienteId;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="p-2">${nombreCliente}</td>
      <td class="p-2">$${Number(c.total || 0).toLocaleString("es-CO")}</td>
      <td class="p-2 flex gap-2">
        <button class="bg-orange-600 text-white px-2 py-1 rounded hover:bg-orange-700 btn-pdf">PDF</button>
        <a class="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700" target="_blank"
          href="https://wa.me/${c.telefono}?text=${encodeURIComponent(`Hola ${nombreCliente}, aquí tienes tu cotización DOMKA: ${c.linkPublico || ''}`)}">WhatsApp</a>
      </td>
    `;

    // Botón PDF
    tr.querySelector(".btn-pdf").addEventListener("click", () => {
      generarPDFCotizacion(c, nombreCliente);
    });

    tablaCotizaciones.appendChild(tr);
  });
}
cargarCotizaciones();
