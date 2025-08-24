// js/cotizaciones.js

const formCotizacion = document.getElementById("form-cotizacion");
const tablaItems = document.querySelector("#tabla-items tbody");
const btnAgregarItem = document.getElementById("agregar-item");
const tablaCotizaciones = document.querySelector("#tabla-cotizaciones tbody");

let items = [];

// Agregar un ítem
btnAgregarItem.addEventListener("click", () => {
  const item = { descripcion: "", cantidad: 1, precio: 0, subtotal: 0 };
  items.push(item);
  renderItems();
});

// Renderizar tabla de ítems
function renderItems() {
  tablaItems.innerHTML = "";
  items.forEach((it, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><input type="text" value="${it.descripcion}" class="border px-2 py-1 w-full" onchange="updateItem(${index}, 'descripcion', this.value)"></td>
      <td><input type="number" value="${it.cantidad}" class="border px-2 py-1 w-full" onchange="updateItem(${index}, 'cantidad', this.value)"></td>
      <td><input type="number" value="${it.precio}" class="border px-2 py-1 w-full" onchange="updateItem(${index}, 'precio', this.value)"></td>
      <td class="text-right">$${it.subtotal.toLocaleString("es-CO")}</td>
      <td><button class="text-red-600" onclick="deleteItem(${index})">X</button></td>
    `;
    tablaItems.appendChild(row);
  });
  calcularTotales();
}

// Actualizar item
window.updateItem = (index, field, value) => {
  items[index][field] = field === "descripcion" ? value : Number(value);
  items[index].subtotal = items[index].cantidad * items[index].precio;
  renderItems();
};

// Eliminar item
window.deleteItem = (index) => {
  items.splice(index, 1);
  renderItems();
};

// Calcular totales
function calcularTotales() {
  const subtotal = items.reduce((acc, it) => acc + it.subtotal, 0);
  const impuestos = Math.round(subtotal * 0.19);
  const total = subtotal + impuestos;
  document.getElementById("subtotal").innerText = `Subtotal: $${subtotal.toLocaleString("es-CO")}`;
  document.getElementById("impuestos").innerText = `IVA (19%): $${impuestos.toLocaleString("es-CO")}`;
  document.getElementById("total").innerText = `Total: $${total.toLocaleString("es-CO")}`;
  return { subtotal, impuestos, total };
}

// Guardar cotización
formCotizacion.addEventListener("submit", async (e) => {
  e.preventDefault();

  const cliente = document.getElementById("cliente").value;
  const notas = document.getElementById("notas").value;
  const { subtotal, impuestos, total } = calcularTotales();

  await db.collection("cotizaciones").add({
    cliente,
    notas,
    items,
    subtotal,
    impuestos,
    total,
    fecha: new Date(),
  });

  alert("✅ Cotización guardada");
  formCotizacion.reset();
  items = [];
  renderItems();
  loadCotizaciones();
});

// Listar cotizaciones
async function loadCotizaciones() {
  const snapshot = await db.collection("cotizaciones").get();
  tablaCotizaciones.innerHTML = "";
  snapshot.forEach(doc => {
    const c = doc.data();
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="p-2">${c.cliente}</td>
      <td class="p-2">$${c.total.toLocaleString("es-CO")}</td>
      <td class="p-2">
        <button class="bg-orange-600 text-white px-2 py-1 rounded" onclick="generarPDF('${doc.id}')">PDF</button>
        <a href="https://wa.me/?text=Hola, aquí tienes tu cotización DOMKA: ${window.location.origin}/public-cotizacion.html?id=${doc.id}" 
           target="_blank" class="bg-green-600 text-white px-2 py-1 rounded">WhatsApp</a>
      </td>
    `;
    tablaCotizaciones.appendChild(row);
  });
}

// Inicializar
loadCotizaciones();
