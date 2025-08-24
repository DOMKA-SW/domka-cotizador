// js/cuentas.js

// ====== Helpers globales desde firebase.js ======
// - window.db (Firestore)
// - window.auth (Auth)
// - window.logout() definido en firebase.js (si lo tienes allí)

const formCuenta   = document.getElementById("form-cuenta");
const selectCliente = document.getElementById("cliente");
const tablaItems   = document.querySelector("#tabla-items tbody");
const tablaCuentas = document.querySelector("#tabla-cuentas tbody");

// Para construir URLs absolutas de la página pública en GitHub Pages
const BASE_PUBLICA = "https://domka-sw.github.io/domka-cotizador";

let items = [];

// ============================
// 🔹 Cargar clientes en select
// ============================
async function cargarClientes() {
  try {
    const snap = await db.collection("clientes").get();
    const fragment = document.createDocumentFragment();

    snap.forEach(docu => {
      const c = docu.data();
      const opt = document.createElement("option");
      opt.value = docu.id;
      opt.textContent = c.nombreEmpresa || c.nombre || `(sin nombre)`;
      opt.dataset.telefono = c.telefono || "";
      fragment.appendChild(opt);
    });

    selectCliente.appendChild(fragment);
  } catch (e) {
    console.error("Error cargando clientes:", e);
    alert("No se pudieron cargar los clientes.");
  }
}

// ============================
// 🔹 Ítems dinámicos
// ============================
document.getElementById("agregar-item").addEventListener("click", () => {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td class="p-1">
      <input type="text" class="desc border p-2 w-full rounded" placeholder="Descripción" />
    </td>
    <td class="p-1 text-right">
      <input type="number" class="cant border p-2 w-full rounded text-right" value="1" min="0" />
    </td>
    <td class="p-1 text-right">
      <input type="number" class="precio border p-2 w-full rounded text-right" value="0" min="0" />
    </td>
    <td class="p-1 text-right subtotal">0</td>
    <td class="p-1 text-center">
      <button type="button" class="text-red-600 hover:underline btn-del">Eliminar</button>
    </td>
  `;

  tr.querySelector(".cant").addEventListener("input", recalcular);
  tr.querySelector(".precio").addEventListener("input", recalcular);
  tr.querySelector(".btn-del").addEventListener("click", () => { tr.remove(); recalcular(); });

  tablaItems.appendChild(tr);
  recalcular();
});

function recalcular() {
  let subtotal = 0;
  items = [];

  tablaItems.querySelectorAll("tr").forEach(tr => {
    const desc   = tr.querySelector(".desc")?.value?.trim() || "";
    const cant   = Number(tr.querySelector(".cant")?.value || 0);
    const precio = Number(tr.querySelector(".precio")?.value || 0);
    const sub    = cant * precio;

    tr.querySelector(".subtotal").textContent = sub.toLocaleString("es-CO");

    items.push({ descripcion: desc, cantidad: cant, precio, subtotal: sub });
    subtotal += sub;
  });

  const total = subtotal; // Cuenta de cobro SIN IVA por defecto
  document.getElementById("subtotal").textContent = `Subtotal: $${subtotal.toLocaleString("es-CO")}`;
  document.getElementById("total").textContent    = `Total: $${total.toLocaleString("es-CO")}`;

  return { subtotal, total };
}

// ============================
// 🔹 Guardar cuenta de cobro
// ============================
formCuenta.addEventListener("submit", async (e) => {
  e.preventDefault();
  const clienteId = selectCliente.value;
  const notas = document.getElementById("notas").value.trim();
  const { subtotal, total } = recalcular();

  if (!clienteId) {
    alert("Selecciona un cliente.");
    return;
  }
  if (items.length === 0) {
    alert("Agrega al menos un ítem.");
    return;
  }

  try {
    const docRef = await db.collection("cuentas").add({
      clienteId,
      notas,
      items,
      subtotal,
      total,
      fecha: new Date(),
      estado: "pendiente"
    });

    const linkPublico = `${BASE_PUBLICA}/public/cuenta.html?id=${docRef.id}`;
    await db.collection("cuentas").doc(docRef.id).update({ linkPublico });

    alert("✅ Cuenta de cobro guardada");
    formCuenta.reset();
    tablaItems.innerHTML = "";
    items = [];
    document.getElementById("subtotal").textContent = `Subtotal: $0`;
    document.getElementById("total").textContent    = `Total: $0`;
    await cargarCuentas();
  } catch (e) {
    console.error("Error guardando cuenta:", e);
    alert("Error guardando la cuenta de cobro.");
  }
});

// ============================
// 🔹 Listar cuentas de cobro
// ============================
async function cargarCuentas() {
  tablaCuentas.innerHTML = "";

  try {
    const clientesSnap = await db.collection("clientes").get();
    const MAP_CLIENTES = {};
    clientesSnap.forEach(d => { MAP_CLIENTES[d.id] = d.data(); });

    const snap = await db.collection("cuentas").orderBy("fecha", "desc").get();

    snap.forEach(docu => {
      const c = docu.data();
      const id = docu.id;

      const clienteData = MAP_CLIENTES[c.clienteId] || {};
      const nombreCliente = clienteData.nombreEmpresa || clienteData.nombre || `(sin nombre)`;
      const telefono = clienteData.telefono || "";

      const tr = document.createElement("tr");
      tr.className = "border-t hover:bg-gray-50";
      tr.innerHTML = `
        <td class="p-2">${nombreCliente}</td>
        <td class="p-2 text-right">$${Number(c.total || 0).toLocaleString("es-CO")}</td>
        <td class="p-2 text-center">
          <span class="px-2 py-1 rounded text-xs ${c.estado === "pagada" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}">
            ${c.estado || "pendiente"}
          </span>
        </td>
        <td class="p-2">${c.fecha?.toDate ? c.fecha.toDate().toLocaleDateString() : new Date(c.fecha).toLocaleDateString()}</td>
        <td class="p-2 flex flex-wrap gap-2">
          <button data-id="${id}" class="btn-pdf bg-orange-600 text-white px-2 py-1 rounded hover:bg-orange-700">PDF</button>
          <a class="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
             target="_blank"
             href="https://wa.me/${telefono}?text=${encodeURIComponent(`Hola, aquí tienes tu cuenta de cobro DOMKA: ${c.linkPublico || ''}`)}">
            WhatsApp
          </a>
          <button data-id="${id}" class="btn-pagada bg-gray-800 text-white px-2 py-1 rounded hover:bg-gray-700">Marcar pagada</button>
        </td>
      `;
      tablaCuentas.appendChild(tr);
    });

    // PDF handlers
    tablaCuentas.querySelectorAll(".btn-pdf").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const docu = await db.collection("cuentas").doc(id).get();
        const cuenta = docu.data();
        const cli  = await db.collection("clientes").doc(cuenta.clienteId).get();
        const nombreCliente = (cli.data()?.nombreEmpresa || cli.data()?.nombre || "(sin nombre)");
        generarPDFCuenta(cuenta, nombreCliente);
      });
    });

    // Marcar pagada
    tablaCuentas.querySelectorAll(".btn-pagada").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const ok = confirm("¿Marcar esta cuenta como PAGADA?");
        if (!ok) return;
        await db.collection("cuentas").doc(id).update({ estado: "pagada" });
        await cargarCuentas();
      });
    });

  } catch (e) {
    console.error("Error cargando cuentas:", e);
  }
}

// Init
(async function init() {
  await cargarClientes();
  await cargarCuentas();
})();
