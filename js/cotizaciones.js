// js/cotizaciones.js
const form = document.getElementById("form-cotizacion");
const tablaItems = document.querySelector("#tabla-items tbody");
const tablaCotizaciones = document.querySelector("#tabla-cotizaciones tbody");
const clienteSelect = document.getElementById("cliente");
const formaPagoSelect = document.getElementById("forma-pago");
const pagosPersonalizadosDiv = document.getElementById("pagos-personalizados");
const campoValorTotal = document.getElementById("campo-valor-total");
const inputValorTotal = document.getElementById("valor-total");

let items = [];
let tipoCalculo = "por-items";

// ============================
// 🔹 Toggle columnas de items
// ============================
function toggleColumnasItems() {
  const headers = document.querySelectorAll("#tabla-items th");
  const cells = document.querySelectorAll("#tabla-items td");
  
  if (tipoCalculo === "valor-total") {
    // Ocultar columnas de Cantidad, Precio y Subtotal
    headers[1].classList.add("hidden");
    headers[2].classList.add("hidden");
    headers[3].classList.add("hidden");
    
    // Ocultar las celdas correspondientes
    for (let i = 0; i < cells.length; i++) {
      const position = i % 5;
      if (position === 1 || position === 2 || position === 3) {
        cells[i].classList.add("hidden");
      }
    }
    
    // Cambiar el texto del botón de agregar
    document.getElementById("agregar-item").textContent = "+ Agregar Descripción";
  } else {
    // Mostrar todas las columnas
    headers[1].classList.remove("hidden");
    headers[2].classList.remove("hidden");
    headers[3].classList.remove("hidden");
    
    // Mostrar todas las celdas
    for (let i = 0; i < cells.length; i++) {
      cells[i].classList.remove("hidden");
    }
    
    // Restaurar texto del botón
    document.getElementById("agregar-item").textContent = "+ Agregar Ítem";
  }
}

// ============================
// 🔹 Cargar clientes en select
// ============================
async function cargarClientes() {
  clienteSelect.innerHTML = '<option value="">-- Selecciona un cliente --</option>';
  const snap = await db.collection("clientes").get();
  snap.forEach(doc => {
    const c = doc.data();
    const opt = document.createElement("option");
    opt.value = doc.id;
    opt.textContent = c.nombre || c.nombreEmpresa || "Sin nombre";
    clienteSelect.appendChild(opt);
  });
}

// ============================
// 🔹 Manejar forma de pago
// ============================
formaPagoSelect.addEventListener("change", function() {
  if (this.value === "personalizado") {
    pagosPersonalizadosDiv.classList.remove("hidden");
  } else {
    pagosPersonalizadosDiv.classList.add("hidden");
  }
});

// Validar que los pagos personalizados sumen 100%
document.getElementById("pago1").addEventListener("input", validarPagos);
document.getElementById("pago2").addEventListener("input", validarPagos);
document.getElementById("pago3").addEventListener("input", validarPagos);

function validarPagos() {
  const pago1 = Number(document.getElementById("pago1").value) || 0;
  const pago2 = Number(document.getElementById("pago2").value) || 0;
  const pago3 = Number(document.getElementById("pago3").value) || 0;
  const total = pago1 + pago2 + pago3;
  
  if (total !== 100) {
    pagosPersonalizadosDiv.style.border = "2px solid red";
    pagosPersonalizadosDiv.style.padding = "5px";
    return false;
  } else {
    pagosPersonalizadosDiv.style.border = "";
    pagosPersonalizadosDiv.style.padding = "";
    return true;
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
    
    // Actualizar visibilidad de columnas
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
  const row = document.createElement("tr");

  row.innerHTML = `
    <td><input type="text" class="desc border p-1 w-full" placeholder="Descripción"></td>
    <td><input type="number" class="cant border p-1 w-full" value="1" min="1"></td>
    <td><input type="number" class="precio border p-1 w-full" value="0" min="0" placeholder="Precio"></td>
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
  
  // Actualizar visibilidad de columnas después de agregar
  toggleColumnasItems();
  recalcular();
});

function recalcular() {
  let subtotal = 0;
  let total = 0;
  
  items = [];
  
  if (tipoCalculo === "por-items") {
    // Cálculo por items - modo normal
    tablaItems.querySelectorAll("tr").forEach(tr => {
      const desc = tr.querySelector(".desc").value;
      const cant = Number(tr.querySelector(".cant").value) || 0;
      const precio = Number(tr.querySelector(".precio").value) || 0;
      const sub = cant * precio;
      tr.querySelector(".subtotal").textContent = sub.toLocaleString("es-CO");
      subtotal += sub;
      items.push({ descripcion: desc, cantidad: cant, precio, subtotal: sub });
    });
    
    total = subtotal;
  } else {
    // Cálculo por valor total directo - los items son informativos
    total = Number(inputValorTotal.value) || 0;
    
    // Recolectar items para mostrar en el PDF (aunque no afecten el cálculo)
    tablaItems.querySelectorAll("tr").forEach(tr => {
      const desc = tr.querySelector(".desc").value;
      const cant = Number(tr.querySelector(".cant").value) || 0;
      const precio = Number(tr.querySelector(".precio").value) || 0;
      const sub = cant * precio;
      
      // Mostrar el subtotal calculado pero no usarlo para el total general
      tr.querySelector(".subtotal").textContent = sub.toLocaleString("es-CO");
      items.push({ descripcion: desc, cantidad: cant, precio, subtotal: sub });
    });
    
    // El subtotal para el cálculo general es el valor total ingresado
    subtotal = total;
  }
  
  // Actualizar la interfaz
  document.getElementById("subtotal").textContent = `Subtotal: $${subtotal.toLocaleString("es-CO")}`;
  document.getElementById("total").textContent = `Total: $${total.toLocaleString("es-CO")}`;
  
  // Actualizar valor en letras
  const mostrarValorLetras = document.getElementById("mostrar-valor-letras").checked;
  if (mostrarValorLetras) {
    document.getElementById("valor-letras").textContent = numeroAPalabras(total);
  } else {
    document.getElementById("valor-letras").textContent = "";
  }
  
  return { subtotal, total };
}

// ============================
// 🔹 Guardar cotización
// ============================
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const clienteId = clienteSelect.value;
  const notas = document.getElementById("notas").value;
  const tipoCotizacion = document.querySelector('input[name="tipo"]:checked').value;
  const formaPago = formaPagoSelect.value;
  const mostrarValorLetras = document.getElementById("mostrar-valor-letras").checked;
  const { subtotal, total } = recalcular();
  
  // Validar pagos personalizados
  if (formaPago === "personalizado" && !validarPagos()) {
    alert("Los pagos personalizados deben sumen 100%");
    return;
  }

  if (!clienteId) {
    alert("Selecciona un cliente");
    return;
  }

  if (tipoCalculo === "por-items" && items.length === 0) {
    alert("Agrega al menos un ítem a la cotización");
    return;
  }

  if (tipoCalculo === "valor-total" && total <= 0) {
    alert("Ingresa un valor total válido");
    return;
  }

  // Buscar cliente seleccionado
  const clienteDoc = await db.collection("clientes").doc(clienteId).get();
  const clienteData = clienteDoc.data() || {};

  // Calcular plan de pagos
  let planPagos = [];
  if (formaPago === "contado") {
    planPagos = [{ porcentaje: 100, monto: total, descripcion: "Pago completo al contado" }];
  } else if (formaPago === "60-40") {
    planPagos = [
      { porcentaje: 60, monto: total * 0.6, descripcion: "60% al inicio" },
      { porcentaje: 40, monto: total * 0.4, descripcion: "40% al finalizar" }
    ];
  } else if (formaPago === "50-50") {
    planPagos = [
      { porcentaje: 50, monto: total * 0.5, descripcion: "50% al inicio" },
      { porcentaje: 50, monto: total * 0.5, descripcion: "50% al finalizar" }
    ];
  } else if (formaPago === "tres-pagos") {
    planPagos = [
      { porcentaje: 40, monto: total * 0.4, descripcion: "40% al inicio" },
      { porcentaje: 30, monto: total * 0.3, descripcion: "30% al avance 50%" },
      { porcentaje: 30, monto: total * 0.3, descripcion: "30% al finalizar" }
    ];
  } else if (formaPago === "personalizado") {
    const pago1 = Number(document.getElementById("pago1").value) || 0;
    const pago2 = Number(document.getElementById("pago2").value) || 0;
    const pago3 = Number(document.getElementById("pago3").value) || 0;
    
    planPagos = [
      { porcentaje: pago1, monto: total * (pago1/100), descripcion: `Pago 1 (${pago1}%)` }
    ];
    
    if (pago2 > 0) {
      planPagos.push({ porcentaje: pago2, monto: total * (pago2/100), descripcion: `Pago 2 (${pago2}%)` });
    }
    
    if (pago3 > 0) {
      planPagos.push({ porcentaje: pago3, monto: total * (pago3/100), descripcion: `Pago 3 (${pago3}%)` });
    }
  }

  const cotizacion = {
    clienteId,
    nombreCliente: clienteData.nombre || clienteData.nombreEmpresa || "Sin nombre",
    telefono: clienteData.telefono || "",
    notas,
    tipo: tipoCotizacion,
    formaPago,
    planPagos,
    items,
    subtotal,
    total,
    fecha: new Date(),
    estado: "pendiente",
    mostrarValorLetras,
    tipoCalculo
  };

  const docRef = await db.collection("cotizaciones").add(cotizacion);

  // Guardar link público
  await db.collection("cotizaciones").doc(docRef.id).update({
    linkPublico: `https://domka-sw.github.io/domka-cotizador/public/cotizacion.html?id=${docRef.id}`
  });

  alert("✅ Cotización guardada");
  form.reset();
  tablaItems.innerHTML = "";
  pagosPersonalizadosDiv.classList.add("hidden");
  document.getElementById("valor-letras").textContent = "Cero pesos";
  
  // Resetear tipo de cálculo a por defecto
  document.querySelector('input[name="tipo-calculo"][value="por-items"]').checked = true;
  tipoCalculo = "por-items";
  campoValorTotal.classList.add("hidden");
  toggleColumnasItems();
  
  cargarCotizaciones();
});

// ============================
// 🔹 Listar cotizaciones
// ============================
async function cargarCotizaciones() {
  tablaCotizaciones.innerHTML = "";
  const snap = await db.collection("cotizaciones").orderBy("fecha", "desc").get();
  snap.forEach(doc => {
    const c = doc.data();
    const nombreCliente = c.nombreCliente || c.clienteId;
    
    // Traducir tipo de cotización
    let tipoTexto = "";
    switch(c.tipo) {
      case "mano-obra": tipoTexto = "Mano de obra"; break;
      case "materiales": tipoTexto = "Materiales"; break;
      case "ambos": tipoTexto = "Mano de obra y materiales"; break;
      default: tipoTexto = c.tipo || "No especificado";
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="p-2">${nombreCliente}</td>
      <td class="p-2">$${Number(c.total || 0).toLocaleString("es-CO")}</td>
      <td class="p-2">${tipoTexto}</td>
      <td class="p-2 flex gap-2">
        <button class="bg-orange-600 text-white px-2 py-1 rounded hover:bg-orange-700 btn-pdf">PDF</button>
        <a class="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700" target="_blank"
          href="https://wa.me/${c.telefono}?text=${encodeURIComponent(`Hola ${nombreCliente} , aquí tienes tu cotización: ${c.linkPublico || ''}`)}">WhatsApp</a>
      </td>
    `;

    // Botón PDF
    tr.querySelector(".btn-pdf").addEventListener("click", () => {
      generarPDFCotizacion({...c, id: doc.id}, nombreCliente);
    });

    tablaCotizaciones.appendChild(tr);
  });
}

// Inicializar cuando el documento esté listo
document.addEventListener("DOMContentLoaded", function() {
  cargarClientes();
  cargarCotizaciones();
  toggleColumnasItems();
});

