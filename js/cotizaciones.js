// --- DOM refs ---
const form = document.getElementById("form-cotizacion");
const tablaItems = document.querySelector("#tabla-items tbody");
const tablaCotizaciones = document.querySelector("#tabla-cotizaciones tbody");
const modoValorSel = document.getElementById("modoValor");
const totalManualInput = document.getElementById("totalManual");
const campoTotalManual = document.getElementById("campo-total-manual");

let items = [];

// ============================
// Helpers
// ============================
function currency(n) {
  return `$${Number(n || 0).toLocaleString("es-CO")}`;
}

// Genera una URL absoluta al recurso (resuelve bien en GitHub Pages)
function urlAbsoluta(rel) {
  // new URL(res, base)
  return new URL(rel, window.location.href).toString();
}

// ============================
// Ítems dinámicos
// ============================
document.getElementById("agregar-item").addEventListener("click", () => {
  const row = document.createElement("tr");
  row.className = "border-b";

  row.innerHTML = `
    <td class="p-2">
      <input type="text" class="desc border rounded px-2 py-1 w-full" placeholder="Descripción">
    </td>
    <td class="p-2 text-right">
      <input type="number" class="cant border rounded px-2 py-1 w-full text-right" value="1" min="0">
    </td>
    <td class="p-2 text-right">
      <input type="number" class="precio border rounded px-2 py-1 w-full text-right" value="0" min="0">
    </td>
    <td class="p-2 text-right subtotal">0</td>
    <td class="p-2 text-center">
      <button type="button" class="text-red-600 hover:underline">Eliminar</button>
    </td>
  `;

  row.querySelector(".cant").addEventListener("input", recalcular);
  row.querySelector(".precio").addEventListener("input", recalcular);
  row.querySelector("button").addEventListener("click", () => { row.remove(); recalcular(); });

  tablaItems.appendChild(row);
  recalcular();
});

// ============================
// Recalcular totales
// ============================
function recalcular() {
  let subtotal = 0;
  items = [];

  tablaItems.querySelectorAll("tr").forEach(tr => {
    const desc = tr.querySelector(".desc")?.value || "";
    const cant = Number(tr.querySelector(".cant")?.value) || 0;
    const precio = Number(tr.querySelector(".precio")?.value) || 0;
    const sub = cant * precio;

    const cellSubtotal = tr.querySelector(".subtotal");
    if (cellSubtotal) cellSubtotal.textContent = Number(sub).toLocaleString("es-CO");

    items.push({ descripcion: desc, cantidad: cant, precio, subtotal: sub });
    subtotal += sub;
  });

  // Modo de cálculo de total
  let total = subtotal;
  if (modoValorSel.value === "total") {
    total = Number(totalManualInput.value) || 0;
  }

  // IVA suspendido temporalmente
  // const impuestos = Math.round(total * 0.19);

  document.getElementById("subtotal").textContent = `Subtotal: ${currency(subtotal)}`;
  document.getElementById("total").textContent = `Total: ${currency(total)}`;
  document.getElementById("totalLetras").textContent = `Total en letras: ${numeroALetras(total)}`;

  return { subtotal, impuestos: 0, total };
}

// toggle campo total manual
modoValorSel.addEventListener("change", () => {
  if (modoValorSel.value === "total") {
    campoTotalManual.classList.remove("hidden");
  } else {
    campoTotalManual.classList.add("hidden");
  }
  recalcular();
});
totalManualInput.addEventListener("input", recalcular);

// ============================
// Guardar cotización
// ============================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const cliente = document.getElementById("cliente").value.trim();
  const notas = document.getElementById("notas").value.trim();
  const tipoCotizacion = document.getElementById("tipoCotizacion").value;
  const { subtotal, impuestos, total } = recalcular();

  if (!cliente) {
    alert("Debe ingresar un cliente.");
    return;
  }

  // Construimos objeto
  const cot = {
    cliente,
    notas,
    tipoCotizacion,
    modoValor: modoValorSel.value, // 'items' o 'total'
    items,
    subtotal,
    impuestos,
    total,
    totalEnLetras: numeroALetras(total),
    fecha: new Date(),
    estado: "pendiente"
  };

  try {
    // Guardar
    const docRef = await db.collection("cotizaciones").add(cot);

    // URL pública absoluta
    const publicURL = urlAbsoluta(`public/cotizacion.html?id=${docRef.id}`);

    await db.collection("cotizaciones").doc(docRef.id).update({
      linkPublico: publicURL
    });

    alert("✅ Cotización guardada.");
    form.reset();
    tablaItems.innerHTML = "";
    campoTotalManual.classList.add("hidden");
    cargarCotizaciones();
  } catch (err) {
    console.error(err);
    alert("Error guardando la cotización.");
  }
});

// ============================
// Listar cotizaciones
// ============================
async function cargarCotizaciones() {
  tablaCotizaciones.innerHTML = "";
  const snap = await db.collection("cotizaciones").orderBy("fecha", "desc").get();

  snap.forEach(docu => {
    const c = docu.data();

    const tr = document.createElement("tr");
    tr.className = "border-t hover:bg-gray-50";

    const tipoTxt = c.tipoCotizacion === "manoObra" ? "Solo Mano de Obra" : "Mano de Obra + Materiales";

    // fallback de link si aún no existe (muy raro por timing)
    const link = c.linkPublico || urlAbsoluta(`public/cotizacion.html?id=${docu.id}`);

    tr.innerHTML = `
      <td class="p-2">${c.cliente}</td>
      <td class="p-2">${tipoTxt}</td>
      <td class="p-2 text-right">${currency(c.total)}</td>
      <td class="p-2">
        <div class="flex flex-wrap gap-2 justify-end">
          <button class="bg-orange-600 text-white px-2 py-1 rounded hover:bg-orange-700 btn-pdf">PDF</button>
          <a class="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 btn-wa" target="_blank">WhatsApp</a>
          <a class="bg-gray-700 text-white px-2 py-1 rounded hover:bg-gray-800" target="_blank" href="${link}">Ver Link</a>
        </div>
      </td>
    `;

    // PDF
    tr.querySelector(".btn-pdf").addEventListener("click", () => {
      generarPDFCotizacion({
        ...c,
        // Asegurar consistencia para el PDF
        items: Array.isArray(c.items) ? c.items : [],
      });
    });

    // WhatsApp
    const wa = tr.querySelector(".btn-wa");
    const mensaje = `Hola, aquí tienes tu cotización DOMKA: ${link}`;
    const hrefWa = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    wa.href = hrefWa;

    tablaCotizaciones.appendChild(tr);
  });
}

cargarCotizaciones();

