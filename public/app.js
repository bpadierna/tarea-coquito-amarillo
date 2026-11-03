const formulario = document.getElementById("formPedido");
const mensaje = document.getElementById("mensaje");
formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault(); // evita que la página se recargue
    const datos = {
        nombreCliente: formulario.elements.nombreCliente.value.trim(),
        producto: formulario.elements.producto.value.trim(),
        cantidad: Number(formulario.elements.cantidad.value),
        correo: formulario.elements.correo.value.trim()
    };
    try {
        const respuesta = await fetch("/registrar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });
        const resultado = await respuesta.json();
        if (!respuesta.ok) {
            throw new Error(resultado.error || "Error desconocido");
        }
        mensaje.textContent = resultado.mensaje;
        mensaje.className = "exito";
        formulario.reset();
    } catch (error) {
        mensaje.textContent = error.message;
        mensaje.className = "error";
    }
});