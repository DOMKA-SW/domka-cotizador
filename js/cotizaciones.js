// js/cotizaciones.js

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-cotizacion");
  const tablaItems = document.querySelector("#tabla-items tbody");
  const tablaCotizaciones = document.querySelector("#tabla-cotizaciones tbody");
  const clienteSelect = document.getElementById("cliente");
  const btnAgregarItem = document.getElementById("agregar-item");
  const btnVolver = document.getElementById("btn-volver");

  // Volver al dashboard
  if (btnVolver) {
    btnVolver.addEventListener("click", () => { window.location.href = "dashboard.html"; });
  }

  let items = [];
  const clientesCache = {}; // id -> {nombre, nombreEmpresa, ...}

  // ========= Cargar clientes en el select =========
  async function cargarClientes() {
    clienteSelect.innerHTML = `<option value="">-- Selecciona un cliente --</option>`;
    const snap = await db.collection("clientes").get();
    snap.forEach(doc => {
      const c = doc.data();
      clientesCache[doc.id] = c;
      const optText = c.nombre || c.nombreEmpresa || "Sin nombre";
      const opt = document.createElement("option");
      opt.value = doc.id;
      opt.textContent = optText;
      clienteSelect.appendChild(opt);
    });
  }

  // ========= Ítems dinámicos =========
  function addItemRow() {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="text" class="desc border p-1 w-full" placeholder="Descripción"></td>
      <td><input type="number" class="cant border p-1 w-full" value="1" min="0"></td>
      <td><input type="number" class="precio border p-1 w-full" value="0" min="0"></td>
      <td class="subtotal text-right p-2">0</td>
      <td><button type="button" class="text-red-600 hover:underline">Eliminar</button></td>
    `;
    tr.querySelector(".cant").addEventListener("input", recalcular);
    tr.querySelector(".precio").addEventListener("input", recalcular);
    tr.querySelector("button").addEventListener("click", () => { tr.remove(); recalcular(); });
    tablaItems.appendChild(tr);
    recalcular();
  }

  function recalcular() {
    let subtotal = 0;
    items = [];
    tablaItems.querySelectorAll("tr").forEach(tr => {
      const desc = tr.querySelector(".desc").value || "";
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

  // Botón agregar ítem
  if (btnAgregarItem) btnAgregarItem.addEventListener("click", addItemRow);

  // ========= Guardar cotización =========
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const clienteId = clienteSelect.value;
    const notas = document.getElementById("notas").value || "";
    const { subtotal, impuestos, total } = recalcular();

    if (!clienteId) {
      alert("Selecciona un cliente");
      return;
    }
    if (items.length === 0) {
      alert("Agrega al menos un ítem");
      return;
    }

    // 1) Guardar
    const docRef = await db.collection("cotizaciones").add({
      clienteId,
      notas,
      items,
      subtotal,
      impuestos,
      total,
      fecha: new Date(),
      estado: "pendiente"
    });

    // 2) Guardar link público (ajusta a tu hosting si cambias)
    const linkPublico = `https://domka-sw.github.io/domka-cotizador/public/cotizacion.html?id=${docRef.id}`;
    await db.collection("cotizaciones").doc(docRef.id).update({ linkPublico });

    alert("✅ Cotización guardada");
    form.reset();
    tablaItems.innerHTML = "";
    addItemRow(); // una fila lista
    await cargarCotizaciones(); // refrescar
  });

  // ========= Listar cotizaciones (con nombre) =========
  async function cargarCotizaciones() {
    tablaCotizaciones.innerHTML = "";
    const snap = await db.collection("cotizaciones").orderBy("fecha", "desc").get();
    snap.forEach(doc => {
      const c = doc.data();
      const cliente = clientesCache[c.clienteId];
      const nombreCliente = cliente ? (cliente.nombre || cliente.nombreEmpresa || c.clienteId) : c.clienteId;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="p-2">${nombreCliente}</td>
        <td class="p-2">$${Number(c.total || 0).toLocaleString("es-CO")}</td>
        <td class="p-2 flex gap-2">
           <button class="bg-orange-600 text-white px-2 py-1 rounded hover:bg-orange-700 btn-pdf">PDF</button>
           <a class="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700" target="_blank"
           href="https://wa.me/${c.telefono}?text=${encodeURIComponent(`Hola, aquí tienes tu cotización DOMKA: ${c.linkPublico || ''}`)}">WhatsApp</a>
        </td>
      `;

      // Botón PDF (pasamos el nombre de cliente)
      tr.querySelector(".btn-pdf").addEventListener("click", () => {
        window.generarPDFCotizacion(c, nombreCliente);
      });

      tablaCotizaciones.appendChild(tr);
    });
  }

  // ========= Arranque =========
  (async () => {
    await cargarClientes();
    addItemRow();       // 1 fila preparada
    await cargarCotizaciones();
  })();
});
