const express = require("express");
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
// ---------- Configuración ----------
const PUERTO = 3000;
const RUTA_CSV = path.join(__dirname, "Datos.csv");
const CONFIG_BD = {
    host: "localhost",
    user: "root",
    password: process.env.DB_PASSWORD ?? "", // se lee de una variable de entorno para no publicarla
    database: "coquito_amarillo"
};
// ---------- POO: clase que encapsula el pedido ----------
class RegistroPedido {
    #nombreCliente;
    #producto;
    #cantidad;
    #correo;
    #fecha;
    constructor(nombreCliente, producto, cantidad, correo) {
        this.#nombreCliente = String(nombreCliente).trim();
        this.#producto = String(producto).trim();
        this.#cantidad = Number(cantidad);
        this.#correo = String(correo).trim();
        this.#fecha = new Date().toISOString();
    }
    get nombreCliente() { return this.#nombreCliente; }
    get producto() { return this.#producto; }
    get cantidad() { return this.#cantidad; }
    get correo() { return this.#correo; }
    get fecha() { return this.#fecha; }
    // Valida datos crudos; devuelve la lista de errores (vacía = todo correcto)
    static validar(datos) {
        const errores = [];
        const textos = {
            nombreCliente: datos.nombreCliente, producto:
                datos.producto
        };
        // Ciclo + decisiones: revisa cada campo de texto obligatorio
        for (const [campo, valor] of Object.entries(textos)) {
            if (typeof valor !== "string" || valor.trim() === "") {
                errores.push(`El campo ${campo} es obligatorio`);
            } else if (valor.trim().length > 100) {
                errores.push(`El campo ${campo} no puede superar 100 caracteres`);
            }
        }
        const cantidad = Number(datos.cantidad);
        if (!Number.isInteger(cantidad) || cantidad <= 0) {
            errores.push("La cantidad debe ser un entero mayor que cero");
        }
        const patronCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (typeof datos.correo !== "string" ||
            !patronCorreo.test(datos.correo.trim())) {
            errores.push("El correo electrónico no es válido");
        } else if (datos.correo.trim().length > 150) {
            errores.push("El correo no puede superar 150 caracteres");
        }
        return errores;
    }
    // Una línea CSV; escapa comas y comillas para no romper las columnas
    toCSV() {
        const campos = [this.#nombreCliente, this.#producto, this.#cantidad,
        this.#correo, this.#fecha];
        const escapados = campos.map((c) => {
            const texto = String(c);
            return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
        });
        return escapados.join(",") + "\n";
    }
}
// ---------- POO: herencia para el acceso a datos ----------
class Repositorio {
    async guardar(registro) {
        throw new Error("guardar() debe implementarse en la subclase");
    }
}
class RepositorioCSV extends Repositorio {
    constructor(ruta) {
        super();
        this.ruta = ruta;
        if (!fs.existsSync(ruta)) { // crea el archivo con encabezados la primera vez
            fs.writeFileSync(ruta,
                "nombre_cliente,producto,cantidad,correo,fecha\n", "utf8");
        }
    }
    async guardar(registro) {
        // appendFile AGREGA al final; nunca sobrescribe
        await fs.promises.appendFile(this.ruta, registro.toCSV(), "utf8");
    }
}
class RepositorioMySQL extends Repositorio {
    constructor(config) {
        super();
        this.pool = mysql.createPool(config);
    }
    async guardar(registro) {
        const sql = "INSERT INTO registros (nombre_cliente, producto, cantidad, correo) VALUES (?, ?, ?, ?)";
        await this.pool.execute(sql, [registro.nombreCliente, registro.producto,
        registro.cantidad, registro.correo]);
    }
    async probarConexion() {
        const conexion = await this.pool.getConnection();
        conexion.release();
    }
}
// ---------- Servidor Express ----------
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
const repoCSV = new RepositorioCSV(RUTA_CSV);
const repoMySQL = new RepositorioMySQL(CONFIG_BD);
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "formulario.html"));
});
app.post("/registrar", async (req, res) => {
    try {
        const datos = req.body ?? {};
        const errores = RegistroPedido.validar(datos);
        if (errores.length > 0) {
            return res.status(400).json({ error: errores.join(". ") });
        }
        const registro = new RegistroPedido(datos.nombreCliente, datos.producto,
            datos.cantidad, datos.correo);
        // Guarda en ambos destinos al mismo tiempo
        const resultados = await Promise.allSettled([
            repoCSV.guardar(registro),
            repoMySQL.guardar(registro)
        ]);
        const destinos = ["CSV", "MySQL"];
        const fallos = [];
        resultados.forEach((r, i) => {
            if (r.status === "rejected") {
                console.error(`Error al guardar en ${destinos[i]}:`, r.reason);
                fallos.push(destinos[i]);
            }
        });
        if (fallos.length > 0) {
            return res.status(500).json({
                error: `No se pudo guardar en: 
${fallos.join(" y ")}`
            });
        }
        res.status(201).json({ mensaje: "Registro guardado exitosamente" });
    } catch (error) {
        console.error("Error inesperado:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});
app.listen(PUERTO, async () => {
    console.log(`Servidor escuchando en http://localhost:${PUERTO}`);
    try {
        await repoMySQL.probarConexion();
        console.log("Conexión a MySQL establecida");
    } catch (error) {
        console.error("No se pudo conectar a MySQL:", error.message);
    }
});