// js/public-cuenta.js
(function () {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  if (!id) {
    document.body.innerHTML = "<div class='p-6 text-center'>⚠️ Falta el parámetro <b>id</b> en la URL.</div>";
    return;
  }

  const elId     = document.getElementById("cuenta-id");
  const elNombre = document.getElementById("cliente-nombre");
  const elContacto = document.getElementById("cliente-contacto");
  const elFecha  = document.getElementById("cuenta-fecha");
  const elEstado = document.getElementById("cuenta-estado");
  const elItems  = document.getElementById("detalle-items");
  const elSub    = document.getElementById("subtotal");
  const elTot    = document.getElementById("total");
  const elNotas  = document.getElementById("notas");

  elId.textContent = `ID: ${id}`;

  db.collection("cuentas").doc(id).get().then(async (docu) => {
    if (!docu.exists) {
      document.body.innerHTML = "<div class='p-6 text-center'>❌ Cuenta de cobro no encontrada.</div>";
      return;
    }
    const c = docu.data();

    // Cliente
    let nombre = "(sin nombre)";
    let contacto = "";
    if (c.clienteId) {
      const cli = await db.collection("clientes").doc(c.clienteId).get();
      const cd = cli.data() || {};
      nombre = cd.nombreEmpresa || cd.nombre || nombre;
      const tel = cd.telefono ? `Tel: ${cd.telefono}` : "";
      const mail = cd.email ? ` | Email: ${cd.email}` : "";
      contacto = (tel || mail) ? (tel + mail) : "";
    }
    elNombre.textContent = nombre;
    elContacto.textContent = contacto;

    // Cabecera
    elFecha.textContent = c.fecha?.toDate ? c.fecha.toDate().toLocaleDateString() : new Date(c.fecha).toLocaleDateString();
    elEstado.textContent = c.estado || "pendiente";
    elEstado.className = `inline-block mt-2 px-2 py-1 rounded text-xs ${c.estado === "pagada" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`;

    // Items
    elItems.innerHTML = "";
    (c.items || []).forEach(it => {
      const tr = document.createElement("tr");
      tr.className = "border-t";
      tr.innerHTML = `
        <td class="p-2">${it.descripcion || ""}</td>
        <td class="p-2 text-right">${Number(it.cantidad || 0)}</td>
        <td class="p-2 text-right">$${Number(it.precio || 0).toLocaleString("es-CO")}</td>
        <td class="p-2 text-right">$${Number(it.subtotal || 0).toLocaleString("es-CO")}</td>
      `;
      elItems.appendChild(tr);
    });

    // Totales + notas
    elSub.textContent = `Subtotal: $${Number(c.subtotal || 0).toLocaleString("es-CO")}`;
    elTot.textContent = `Total: $${Number(c.total || 0).toLocaleString("es-CO")}`;
    elNotas.textContent = c.notas || "—";

  }).catch(err => {
    console.error(err);
    document.body.innerHTML = "<div class='p-6 text-center'>⚠️ Error cargando la cuenta de cobro.</div>";
  });
})();
