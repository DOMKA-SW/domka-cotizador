// js/cuentas.js
const formCuenta = document.getElementById("form-cuenta");
const selectCliente = document.getElementById("cliente");
const tablaItems = document.querySelector("#tabla-items tbody");
const tablaCuentas = document.querySelector("#tabla-cuentas tbody");
const campoValorTotal = document.getElementById("campo-valor-total");
const inputValorTotal = document.getElementById("valor-total");

let items = [];
let tipoCalculo = "por-items";
const BASE_PUBLICA = "https://domka-sw.github.io/domka-cotizador";

// ============================
// 🔹 Toggle columnas de items
// ============================
function toggleColumnasItems() {
  const headers = document.querySelectorAll("#tabla-items th");
  const cells = document.querySelectorAll("#tabla-items td");
  
  if (tipoCalculo === "valor-total") {
    headers[1].classList.add("hidden");
    headers[2].classList.add("hidden");
    headers[3].classList.add("hidden");
    
    for (let i = 0; i < cells.length; i++) {
      const position = i % 5;
      if (position === 1 || position === 2 || position === 3) {
        cells[i].classList.add("hidden");
      }
    }
    
    document.getElementById("agregar-item").textContent = "+ Agregar Descripción";
  } else {
    headers[1].classList.remove("hidden");
    headers[2].classList.remove("hidden");
    headers[3].classList.remove("hidden");
    
    for (let i = 0; i < cells.length; i++) {
      cells[i].classList.remove("hidden");
    }
    
    document.getElementById("agregar-item").textContent = "+ Agregar Ítem";
  }
}

// ============================
// 🔹 Cargar clientes en select
// ============================
async function cargarClientes() {
  try {
    const snap = await db.collection("clientes").get();
    selectCliente.innerHTML = '<option value="">-- Selecciona un cliente --</option>';
    
    snap.forEach(docu => {
      const c = docu.data();
      const opt = document.createElement("option");
      opt.value = docu.id;
      opt.textContent = c.nombreEmpresa || c.nombre || `(sin nombre)`;
      opt.dataset.telefono = c.telefono || "";
      selectCliente.appendChild(opt);
    });
  } catch (e) {
    console.error("Error cargando clientes:", e);
    alert("No se pudieron cargar los clientes.");
  }
}

// ============================
// 🔹 Manejar tipo de cálculo
// ============================
document.querySelectorAll('input[name="tipo-calculo"]').forEach(radio => {
  radio.addEventListener("change", function() {
    tipoCalculo = this.value;
    
    if (tipoCalculo === "valor-total") {
      campoValorTotal.classList.remove("hidden");
    } else {
      campoValorTotal.classList.add("hidden");
    }
    
    toggleColumnasItems();
    recalcular();
  });
});

// Event listener para el campo de valor total
inputValorTotal.addEventListener("input", recalcular);

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
  toggleColumnasItems();
  recalcular();
});

function recalcular() {
  let subtotal = 0;
  let total = 0;
  items = [];
  
  if (tipoCalculo === "por-items") {
    tablaItems.querySelectorAll("tr").forEach(tr => {
      const desc = tr.querySelector(".desc")?.value?.trim() || "";
      const cant = Number(tr.querySelector(".cant")?.value || 0);
      const precio = Number(tr.querySelector(".precio")?.value || 0);
      const sub = cant * precio;
      tr.querySelector(".subtotal").textContent = sub.toLocaleString("es-CO");
      subtotal += sub;
      items.push({ descripcion: desc, cantidad: cant, precio, subtotal: sub });
    });
    
    total = subtotal;
  } else {
    total = Number(inputValorTotal.value) || 0;
    
    tablaItems.querySelectorAll("tr").forEach(tr => {
      const desc = tr.querySelector(".desc")?.value?.trim() || "";
      const cant = Number(tr.querySelector(".cant")?.value || 0);
      const precio = Number(tr.querySelector(".precio")?.value || 0);
      const sub = cant * precio;
      
      tr.querySelector(".subtotal").textContent = sub.toLocaleString("es-CO");
      items.push({ descripcion: desc, cantidad: cant, precio, subtotal: sub });
    });
    
    subtotal = total;
  }
  
  document.getElementById("subtotal").textContent = `Subtotal: $${subtotal.toLocaleString("es-CO")}`;
  document.getElementById("total").textContent = `Total: $${total.toLocaleString("es-CO")}`;
  
  const mostrarValorLetras = document.getElementById("mostrar-valor-letras").checked;
  if (mostrarValorLetras) {
    document.getElementById("valor-letras").textContent = numeroAPalabras(total);
  } else {
    document.getElementById("valor-letras").textContent = "";
  }
  
  return { subtotal, total };
}

// ============================
// 🔹 Guardar cuenta de cobro
// ============================
formCuenta.addEventListener("submit", async (e) => {
  e.preventDefault();
  const clienteId = selectCliente.value;
  const notas = document.getElementById("notas").value.trim();
  const terminos = document.getElementById("terminos").value.trim();
  const mostrarValorLetras = document.getElementById("mostrar-valor-letras").checked;
  const { subtotal, total } = recalcular();

  if (!clienteId) {
    alert("Selecciona un cliente.");
    return;
  }
  
  if (tipoCalculo === "por-items" && items.length === 0) {
    alert("Agrega al menos un ítem.");
    return;
  }
  
  if (tipoCalculo === "valor-total" && total <= 0) {
    alert("Ingresa un valor total válido.");
    return;
  }

  try {
    // Obtener datos del cliente
    const clienteDoc = await db.collection("clientes").doc(clienteId).get();
    const clienteData = clienteDoc.data() || {};
    const nombreCliente = clienteData.nombreEmpresa || clienteData.nombre || "(sin nombre)";
    const telefonoCliente = clienteData.telefono || "";

    const docRef = await db.collection("cuentas").add({
      clienteId,
      nombreCliente,
      telefonoCliente,
      notas,
      terminos,
      items,
      subtotal,
      total,
      fecha: new Date(),
      estado: "pendiente",
      mostrarValorLetras,
      tipoCalculo,
      firmaNombre: "DOMKA",
      firmaTelefono: "+57 321 456 7890",
      firmaEmail: "contacto@domka.com",
      firmaRut: "123456789-0"
    });

    const linkPublico = `${BASE_PUBLICA}/public/cuenta.html?id=${docRef.id}`;
    await db.collection("cuentas").doc(docRef.id).update({ linkPublico });

    alert("✅ Cuenta de cobro guardada");
    
    // Resetear formulario
    formCuenta.reset();
    tablaItems.innerHTML = "";
    items = [];
    document.getElementById("subtotal").textContent = `Subtotal: $0`;
    document.getElementById("total").textContent = `Total: $0`;
    document.getElementById("valor-letras").textContent = "Cero pesos";
    document.getElementById("terminos").value = `Esta cuenta de cobro tiene una validez de 30 días a partir de la fecha de emisión.\nEl pago debe realizarse dentro de los 15 días posteriores a la recepción.\nEn caso de mora, se aplicará un interés del 1.5% mensual sobre el saldo pendiente.`;
    
    // Resetear tipo de cálculo
    document.querySelector('input[name="tipo-calculo"][value="por-items"]').checked = true;
    tipoCalculo = "por-items";
    campoValorTotal.classList.add("hidden");
    toggleColumnasItems();
    
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
    const snap = await db.collection("cuentas").orderBy("fecha", "desc").get();

    snap.forEach(docu => {
      const c = docu.data();
      const id = docu.id;

      const tr = document.createElement("tr");
      tr.className = "border-t hover:bg-gray-50";
      tr.innerHTML = `
        <td class="p-2">${c.nombreCliente || "Sin nombre"}</td>
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
             href="https://wa.me/${c.telefonoCliente}?text=${encodeURIComponent(`Hola, aquí tienes tu cuenta de cobro DOMKA: ${c.linkPublico || ''}`)}">
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
        generarPDFCuenta(cuenta, cuenta.nombreCliente);
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
  toggleColumnasItems();
})();
