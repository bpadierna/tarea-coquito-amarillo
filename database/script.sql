CREATE DATABASE IF NOT EXISTS coquito_amarillo;
USE coquito_amarillo;

CREATE TABLE IF NOT EXISTS registros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_cliente VARCHAR(100) NOT NULL,
    producto VARCHAR(100) NOT NULL,
    cantidad INT NOT NULL,
    correo VARCHAR(150),
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);