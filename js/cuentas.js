// js/cuentas.js
const formCuenta = document.getElementById("form-cuenta");
const selectCliente = document.getElementById("cliente");
const itemsContainer = document.getElementById("items-container");
const tablaCuentas = document.querySelector("#tabla-cuentas tbody");
const agregarItemBtn = document.getElementById("agregar-item");
const valorTotalInput = document.getElementById("valor-total");
let items = [];
const BASE_PUBLICA = "https://domka-sw.github.io/domka-cotizador";

// ============================
// 🔹 Variables para anexos
// ============================
const toggleBtn = document.getElementById("toggle-anexos");
const seccionAnexos = document.getElementById("seccion-anexos");
const iconAnexos = document.getElementById("icon-anexos");
const anexosInput = document.getElementById("anexos-input");
const listaAnexos = document.getElementById("lista-anexos");
let anexosSeleccionados = [];

// Cargar clientes
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

// Agregar ítem
function agregarItem(descripcion = "") {
  const itemId = Date.now();
  const itemDiv = document.createElement("div");
  itemDiv.className = "flex items-center mb-2";
  itemDiv.innerHTML = `
    <input type="text" class="item-desc border rounded px-3 py-2 flex-grow mr-2" 
           placeholder="Descripción del servicio" value="${descripcion}">
    <button type="button" class="eliminar-item text-red-600 hover:text-red-800 px-2 py-1">
      ✕
    </button>
  `;
  
  itemDiv.querySelector(".eliminar-item").addEventListener("click", () => {
    itemDiv.remove();
  });
  
  itemsContainer.appendChild(itemDiv);
}

// Actualizar array de items
function actualizarItems() {
  items = [];
  document.querySelectorAll(".item-desc").forEach(input => {
    if (input.value.trim() !== "") {
      items.push({ descripcion: input.value.trim() });
    }
  });
}

// ============================
// 🔹 Inicialización de anexos
// ============================
if (toggleBtn && seccionAnexos) {
  toggleBtn.onclick = () => {
    seccionAnexos.classList.toggle("hidden");
    if (iconAnexos) {
      iconAnexos.textContent = seccionAnexos.classList.contains("hidden") ? "+" : "−";
    }
  };
}

if (anexosInput) {
  anexosInput.onchange = () => {
    anexosSeleccionados = Array.from(anexosInput.files);
    if (listaAnexos) {
      listaAnexos.innerHTML = anexosSeleccionados
        .map(f => `<li>📄 ${f.name} (${Math.round(f.size / 1024)} KB)</li>`)
        .join("");
    }
  };
}

// ============================
// 🔹 Convertir archivo a Base64
// ============================
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ============================
// 🔹 Procesar anexos antes de guardar
// ============================
async function procesarAnexos() {
  const anexos = [];

  for (const file of anexosSeleccionados) {
    if (file.size > 500 * 1024) {
      alert(`❌ ${file.name} supera 500 KB`);
      continue;
    }

    const base64 = await fileToBase64(file);

    anexos.push({
      nombre: file.name,
      tipo: file.type,
      base64,
      fecha: new Date()
    });
  }

  return anexos;
}

// Guardar cuenta de cobro
formCuenta.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const clienteId = selectCliente.value;
  const notas = document.getElementById("notas").value.trim();
  const valorTotal = Number(valorTotalInput.value) || 0;
  const mostrarValorLetras = document.getElementById("mostrar-valor-letras").checked;

  // 🔹 Nuevos campos
  const concepto = document.getElementById("concepto").value.trim();
  const fechaEmision = document.getElementById("fecha-emision").value 
    ? new Date(document.getElementById("fecha-emision").value)
    : new Date();
  
  actualizarItems();
  
  if (!clienteId) {
    alert("Selecciona un cliente.");
    return;
  }
  
  if (items.length === 0) {
    alert("Agrega al menos un ítem/descripción.");
    return;
  }
  
  if (valorTotal <= 0) {
    alert("Ingresa un valor total válido.");
    return;
  }
  
  try {
    // 🔹 Procesar anexos
    const anexos = await procesarAnexos();
    
    // Obtener datos del cliente
    const clienteDoc = await db.collection("clientes").doc(clienteId).get();
    const clienteData = clienteDoc.data() || {};
    const nombreCliente = clienteData.nombreEmpresa || clienteData.nombre || "(sin nombre)";
    const telefonoCliente = clienteData.telefono || "";
    
    // Guardar cuenta de cobro
    const docRef = await db.collection("cuentas").add({
      clienteId,
      nombreCliente,
      telefonoCliente,
      concepto,        // 👈 se guarda el concepto
      notas,
      items,
      total: valorTotal,
      subtotal: valorTotal,
      fecha: fechaEmision,  // 👈 ahora la fecha viene del formulario
      estado: "pendiente",
      mostrarValorLetras,
      firmaNombre: "DOMKA",
      firmaTelefono: "+57 321 456 7890",
      firmaEmail: "contacto@domka.com",
      firmaRut: "123456789-0",
      anexos // 👈 NUEVO
    });
    
    // Guardar link público
    const linkPublico = `${BASE_PUBLICA}/public/cuenta.html?id=${docRef.id}`;
    await db.collection("cuentas").doc(docRef.id).update({ linkPublico });
    
    alert("✅ Cuenta de cobro guardada correctamente");
    
    // Limpiar formulario
    formCuenta.reset();
    itemsContainer.innerHTML = "";
    items = [];
    valorTotalInput.value = "0";
    
    // Limpiar anexos
    if (anexosInput) anexosInput.value = "";
    if (listaAnexos) listaAnexos.innerHTML = "";
    anexosSeleccionados = [];
    
    // Recargar lista
    cargarCuentas();
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
      const tieneAnexos = c.anexos && c.anexos.length > 0;

      const tr = document.createElement("tr");
      tr.className = "border-t hover:bg-gray-50";
      tr.innerHTML = `
        <td class="p-2">
          ${c.nombreCliente || "Sin nombre"}
          ${tieneAnexos ? '<span class="ml-2 text-blue-600">📎</span>' : ''}
        </td>
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

    // PDF handlers - CORRECCIÓN AQUÍ
    tablaCuentas.querySelectorAll(".btn-pdf").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        try {
          const docu = await db.collection("cuentas").doc(id).get();
          if (docu.exists) {
            const cuenta = docu.data();
            cuenta.id = id; // Asegurar que el ID esté incluido
            generarPDFCuenta(cuenta, cuenta.nombreCliente);
          } else {
            alert("Cuenta de cobro no encontrada.");
          }
        } catch (error) {
          console.error("Error al cargar la cuenta:", error);
          alert("Error al generar el PDF.");
        }
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

// Inicializar
agregarItemBtn.addEventListener("click", () => agregarItem());
(async function init() {
  await cargarClientes();
  await cargarCuentas();
})();
