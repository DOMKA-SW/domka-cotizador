// js/cotizaciones.js

// ====== CONFIG ======
const BASE_URL = "https://domka-sw.github.io/domka-cotizador/"; // ajusta si cambias dominio

// ====== ELEMENTOS ======
const form = document.getElementById("form-cotizacion");
const clienteSelect = document.getElementById("cliente");
const notasInput = document.getElementById("notas");

const tipoSelect = document.getElementById("tipo-cotizacion");
const seccionItems = document.getElementById("seccion-items");
const seccionTotal = document.getElementById("seccion-total");
const valorTotalInput = document.getElementById("valor-total");

const tablaItemsBody = document.querySelector("#tabla-items tbody");
const agregarItemBtn = document.getElementById("agregar-item");

const elSubtotal = document.getElementById("subtotal");
const elImpuestos = document.getElementById("impuestos");
const elTotal = document.getElementById("total");

const tablaCotizacionesBody = document.querySelector("#tabla-cotizaciones tbody");

// ====== STATE ======
let items = [];
let clientesMap = {}; // id -> {nombreEmpresa, telefono, email, ...}

// ====== UI: alternar tipo ======
tipoSelect.addEventListener("change", () => {
  if (tipoSelect.value === "items") {
    seccionItems.classList.remove("hidden");
    seccionTotal.classList.add("hidden");
    recalcular(); // re-mostrar totales calculados por ítems
  } else {
    seccionItems.classList.add("hidden");
    seccionTotal.classList.remove("hidden");
    pintarTotales(0, 0, Number(valorTotalInput.value || 0));
  }
});

valorTotalInput.addEventListener("input", () => {
  if (tipoSelect.value === "total") {
    const total = Number(valorTotalInput.value || 0);
    // IVA suspendido → impuestos=0; si activas IVA, calcula aquí 19%
    pintarTotales(total, 0, total);
  }
});

// ====== Ítems dinámicos ======
agregarItemBtn.addEventListener("click", addItemRow);
function addItemRow(data = {}) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td class="p-2"><input type="text" class="desc border rounded px-2 py-1 w-full" placeholder="Descripción" value="${data.descripcion || ""}"></td>
    <td class="p-2 text-right"><input type="number" class="cant border rounded px-2 py-1 w-24 text-right" value="${data.cantidad ?? 1}"></td>
    <td class="p-2 text-right"><input type="number" class="precio border rounded px-2 py-1 w-32 text-right" value="${data.precio ?? data.precioUnitario ?? 0}"></td>
    <td class="p-2 text-right subtotal">0</td>
    <td class="p-2 text-right">
      <button type="button" class="text-red-600 hover:underline btn-del">Eliminar</button>
    </td>
  `;
  tr.querySelector(".cant").addEventListener("input", recalcular);
  tr.querySelector(".precio").addEventListener("input", recalcular);
  tr.querySelector(".btn-del").addEventListener("click", () => {
    tr.remove();
    recalcular();
  });

  tablaItemsBody.appendChild(tr);
  recalcular();
}

// ====== Totales ======
function recalcular() {
  let subtotal = 0;
  items = [];
  tablaItemsBody.querySelectorAll("tr").forEach((tr) => {
    const desc = tr.querySelector(".desc").value;
    const cant = Number(tr.querySelector(".cant").value || 0);
    const precio = Number(tr.querySelector(".precio").value || 0);
    const sub = cant * precio;
    tr.querySelector(".subtotal").textContent = sub.toLocaleString("es-CO");
    subtotal += sub;
    items.push({ descripcion: desc, cantidad: cant, precio, subtotal: sub });
  });

  // IVA suspendido: 0 (deja comentado el cálculo para activarlo después)
  // const impuestos = Math.round(subtotal * 0.19);
  const impuestos = 0;
  const total = subtotal + impuestos;

  pintarTotales(subtotal, impuestos, total);
  return { subtotal, impuestos, total };
}

function pintarTotales(subtotal, impuestos, total) {
  elSubtotal.textContent = `Subtotal: $${Number(subtotal || 0).toLocaleString("es-CO")}`;
  elImpuestos.textContent = `IVA (19%): $${Number(impuestos || 0).toLocaleString("es-CO")}`;
  elTotal.textContent = `Total: $${Number(total || 0).toLocaleString("es-CO")}`;
}

// ====== Cargar clientes ======
async function cargarClientes() {
  const snap = await db.collection("clientes").get();
  clientesMap = {};
  clienteSelect.innerHTML = `<option value="">— Selecciona un cliente —</option>`;
  snap.forEach((doc) => {
    const data = doc.data();
    clientesMap[doc.id] = { id: doc.id, ...data };
    const opt = document.createElement("option");
    const nombre = data.nombreEmpresa || data.nombre || `Cliente ${doc.id}`;
    opt.value = doc.id;
    opt.textContent = nombre;
    clienteSelect.appendChild(opt);
  });
}

// ====== Guardar cotización ======
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const clienteId = clienteSelect.value;
  if (!clienteId) {
    alert("Selecciona un cliente");
    return;
  }

  const tipo = tipoSelect.value;
  const notas = notasInput.value || "";
  let subtotal = 0, impuestos = 0, total = 0;

  if (tipo === "items") {
    ({ subtotal, impuestos, total } = recalcular());
  } else {
    total = Number(valorTotalInput.value || 0);
    subtotal = total;
    impuestos = 0; // IVA suspendido
  }

  const payload = {
    clienteId,
    notas,
    tipo,
    items: (tipo === "items" ? items : []),
    subtotal,
    impuestos,
    total,
    fecha: new Date(),
    estado: "pendiente",
    linkPublico: ""
  };

  const docRef = await db.collection("cotizaciones").add(payload);

  // construimos URL pública absoluta para WhatsApp
  const publicLink = `${BASE_URL}public/cotizacion.html?id=${docRef.id}`;
  await db.collection("cotizaciones").doc(docRef.id).update({ linkPublico: publicLink });

  alert("✅ Cotización guardada");
  form.reset();
  tablaItemsBody.innerHTML = "";
  // por UX, si el tipo es "items", dejamos una fila vacía al volver
  if (tipoSelect.value === "items") addItemRow();
  pintarTotales(0, 0, 0);
  await cargarCotizaciones();
});

// ====== Listar cotizaciones ======
async function cargarCotizaciones() {
  // aseguramos tener clientes cargados
  if (!Object.keys(clientesMap).length) await cargarClientes();

  tablaCotizacionesBody.innerHTML = "";
  const snap = await db.collection("cotizaciones").orderBy("fecha", "desc").get();

  snap.forEach((doc) => {
    const c = { id: doc.id, ...doc.data() };
    const cliente = clientesMap[c.clienteId] || {};
    const nombreCliente = cliente.nombreEmpresa || cliente.nombre || c.clienteId || "—";
    const tel = (cliente.telefono || "").toString().trim();

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="p-2">${nombreCliente}</td>
      <td class="p-2">${c.notas ? c.notas : "—"}</td>
      <td class="p-2 text-right">$${Number(c.total || 0).toLocaleString("es-CO")}</td>
      <td class="p-2">${c.estado || "pendiente"}</td>
      <td class="p-2">${(c.fecha?.toDate ? c.fecha.toDate() : c.fecha ? new Date(c.fecha) : new Date()).toLocaleDateString("es-CO")}</td>
      <td class="p-2">
        ${c.linkPublico
          ? `<a class="text-blue-600 underline" href="${c.linkPublico}" target="_blank">Abrir</a>`
          : "—"}
      </td>
      <td class="p-2">
        <div class="flex gap-2">
          <button class="bg-orange-600 text-white px-2 py-1 rounded hover:bg-orange-700 btn-pdf">PDF</button>
          <a class="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 btn-wa" target="_blank">WhatsApp</a>
        </div>
      </td>
    `;

    // PDF
    tr.querySelector(".btn-pdf").addEventListener("click", () => {
      // puedes pasar firmaBase64 en opciones cuando la tengas
      generarPDFCotizacion(c, cliente, {
        firmante: "DOMKA",
        cargo: "Construcción & Remodelaciones"
      });
    });

    // WhatsApp
    const wa = tr.querySelector(".btn-wa");
    const baseMsg = `Hola, aquí tienes tu cotización DOMKA: ${c.linkPublico || ""}`;
    // Si no hay teléfono del cliente, abrimos chat al “wa.me” sin destino para que el usuario elija
    const phone = (tel && /^\+?\d{7,15}$/.test(tel)) ? tel.replace(/\D/g, "") : "";
    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(baseMsg)}`
      : `https://wa.me/?text=${encodeURIComponent(baseMsg)}`;
    wa.href = waUrl;

    tablaCotizacionesBody.appendChild(tr);
  });
}

// ====== INIT ======
(async function init() {
  // si entras por primera vez, deja una fila para ítems
  addItemRow();
  // carga clientes y luego cotizaciones
  await cargarClientes();
  await cargarCotizaciones();
})();
