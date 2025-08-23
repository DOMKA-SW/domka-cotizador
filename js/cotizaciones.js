// js/cotizaciones.js

const form = document.getElementById("formCotizacion");
const tablaBody = document.getElementById("cotizacionesBody");

// Guardar cotización
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nuevaCotizacion = {
    cliente: document.getElementById("cliente").value,
    email: document.getElementById("email").value,
    telefono: document.getElementById("telefono").value,
    detalle: document.getElementById("detalle").value,
    valor: Number(document.getElementById("valor").value),
    estado: "pendiente",
    fecha: new Date()
  };

  await db.collection("cotizaciones").add(nuevaCotizacion);
  form.reset();
  cargarCotizaciones();
});

// Cargar cotizaciones
async function cargarCotizaciones() {
  const snapshot = await db.collection("cotizaciones").orderBy("fecha", "desc").get();
  tablaBody.innerHTML = "";
  snapshot.forEach(doc => {
    const c = doc.data();
    const row = `
      <tr class="border-t">
        <td class="p-2">${c.cliente}</td>
        <td class="p-2">${c.email}</td>
        <td class="p-2">$${c.valor.toLocaleString("es-CO")}</td>
        <td class="p-2">
          <button onclick="eliminarCotizacion('${doc.id}')" class="text-red-600">Eliminar</button>
        </td>
      </tr>
    `;
    tablaBody.innerHTML += row;
  });
}

// Eliminar
async function eliminarCotizacion(id) {
  await db.collection("cotizaciones").doc(id).delete();
  cargarCotizaciones();
}

// Al iniciar
cargarCotizaciones();
