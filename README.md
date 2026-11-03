# Sistema de pedidos — Coquito Amarillo S.A.S.

## Descripción

Aplicación web que captura pedidos de clientes mediante un formulario y guarda cada pedido al mismo tiempo en dos destinos:

- El archivo `Datos.csv` (respaldo en archivo plano).
- La tabla `registros` de la base de datos MySQL `coquito_amarillo`.

## Integrantes

- Nombre Apellido — rol / aporte
- Nombre Apellido — rol / aporte

## Requisitos

- Node.js (versión LTS)
- MySQL 8 (servidor en `localhost:3306`)

## Instalación

1. Instalar las dependencias (Express y mysql2):

   ```powershell
   npm install
   ```

2. Crear la base de datos y la tabla ejecutando el script SQL.

   En PowerShell (Windows):

   ```powershell
   Get-Content database/script.sql | mysql -u root -p
   ```

   En CMD o bash:

   ```bash
   mysql -u root -p < database/script.sql
   ```

   Si el comando `mysql` no se reconoce, use la ruta completa del cliente, por ejemplo
   `& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"`.

3. La conexión se configura en `servidor.js`, en el objeto `CONFIG_BD`. La contraseña no está escrita en el código: se lee de la variable de entorno `DB_PASSWORD`. Si su usuario `root` no tiene contraseña, no necesita definirla.

## Ejecución

En PowerShell:

```powershell
$env:DB_PASSWORD = "su_contraseña"
node servidor.js
```

En CMD:

```bat
set DB_PASSWORD=su_contraseña
node servidor.js
```

Abrir <http://localhost:3000> en el navegador. Si la conexión es correcta, la consola muestra:

```
Servidor escuchando en http://localhost:3000
Conexión a MySQL establecida
```

## Estructura del proyecto

```
coquito-amarillo/
├── capturas/            Capturas de las pruebas realizadas
├── database/
│   └── script.sql       Creación de la base de datos y la tabla
├── public/              Frontend servido por Express
│   ├── formulario.html  Formulario HTML5 de registro
│   ├── estilos.css      Estilos y diseño responsivo
│   └── app.js           Envío del formulario con fetch y manejo de la respuesta
├── Datos.csv            Registros guardados en archivo (se crea solo si no existe)
├── servidor.js          Backend: validación, clases y persistencia
├── package.json
└── README.md
```

## Diseño

### Arquitectura

```
Navegador (formulario.html + app.js)
        │  POST /registrar (JSON)
        ▼
Servidor Node.js + Express (servidor.js)
        │  valida → crea RegistroPedido
        ├──────────────► Datos.csv   (fs.appendFile)
        └──────────────► MySQL       (INSERT con mysql2)
```

### Endpoint

| Método | Ruta         | Cuerpo (JSON)                                      | Respuestas |
|--------|--------------|----------------------------------------------------|------------|
| GET    | `/`          | —                                                  | Formulario HTML |
| POST   | `/registrar` | `nombreCliente`, `producto`, `cantidad`, `correo`  | `201` guardado, `400` datos inválidos, `500` fallo al guardar |

### Modelo de datos (tabla `registros`)

| Campo            | Tipo          | Restricción |
|------------------|---------------|-------------|
| `id`             | INT           | Llave primaria, AUTO_INCREMENT |
| `nombre_cliente` | VARCHAR(100)  | NOT NULL |
| `producto`       | VARCHAR(100)  | NOT NULL |
| `cantidad`       | INT           | NOT NULL |
| `correo`         | VARCHAR(150)  | Opcional |
| `fecha_registro` | DATETIME      | Por defecto `CURRENT_TIMESTAMP` |

El archivo `Datos.csv` usa las columnas `nombre_cliente,producto,cantidad,correo,fecha`.

## Aplicación de los contenidos de la unidad

### Programación orientada a objetos

- **`RegistroPedido`** encapsula un pedido. Sus atributos son privados (`#nombreCliente`, `#producto`, etc.) y solo se leen mediante *getters*, así nadie puede modificar un pedido después de creado. La clase también agrupa la validación (`validar()`, método estático) y la conversión a una línea CSV (`toCSV()`).
- **`Repositorio`** es una clase base que define el método `guardar()`.
- **`RepositorioCSV`** y **`RepositorioMySQL`** heredan de `Repositorio` e implementan `guardar()` cada una a su manera. El servidor trata ambos destinos igual, y agregar un destino nuevo solo requiere otra subclase.

### Tipos de datos, decisiones y ciclos

- Los textos se convierten con `String()` y `trim()`; la cantidad con `Number()`.
- Un ciclo `for...of` recorre los campos de texto obligatorios y, con `if/else if`, verifica que no estén vacíos y que no superen 100 caracteres (el tamaño de las columnas en MySQL).
- La cantidad debe ser un entero mayor que cero (`Number.isInteger`).
- El correo se valida con una expresión regular y un máximo de 150 caracteres.

La validación se hace dos veces: en el navegador (atributos `required`, `type="email"`, `type="number"`, `min="1"`) y en el servidor, porque una petición puede llegar sin pasar por el formulario.

### Manejo de errores

- La ruta `/registrar` está envuelta en `try/catch`; un error inesperado responde `500`.
- Los dos guardados se ejecutan en paralelo con `Promise.allSettled`, de modo que un fallo en un destino no impide intentar el otro, y la respuesta indica cuál falló.
- Al iniciar, el servidor prueba la conexión a MySQL e informa en consola si falla.
- En el frontend, `app.js` usa `try/catch` para mostrar el mensaje de error del servidor o de red.

### Integridad del CSV

- Se usa `fs.promises.appendFile`, que agrega al final del archivo y nunca sobrescribe los registros anteriores.
- Si un valor contiene comas, comillas o saltos de línea, `toCSV()` lo encierra entre comillas y duplica las comillas internas, para no romper las columnas.
- Las consultas a MySQL usan parámetros (`?`), lo que evita inyección SQL.

## Pruebas realizadas

| # | Caso | Resultado esperado | Captura |
|---|------|--------------------|---------|
| 1 | Datos válidos | "Registro guardado exitosamente"; nueva línea en CSV y fila en MySQL | `capturas/prueba 1 Valido.png` |
| 2 | Datos no válidos (completar) | El registro no se guarda | `capturas/prueba 2 no valido.png` |
| 3 | Cantidad 0 | El navegador exige un valor mayor o igual a 1 y no envía | `capturas/prueba 3 no enviado.png` |
| 4 | Correo sin `@` | El navegador pide incluir el signo `@` y no envía | `capturas/prueba 4.png` |
| 5 | Contenido del archivo | `Datos.csv` con los registros de prueba | `capturas/datos csv.png` |

Para verificar los datos en MySQL:

```sql
SELECT * FROM coquito_amarillo.registros;
```
