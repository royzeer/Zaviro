-- Zaviro - Esquema de la base de datos
-- Motor: MySQL 8 / MariaDB 10.6+
-- Se puede ejecutar varias veces: solo crea lo que falta y nunca borra datos.

-- Cuentas de usuario. La contraseña se guarda cifrada con bcrypt.
CREATE TABLE IF NOT EXISTS usuarios (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(80)  NOT NULL,
  correo          VARCHAR(120) NOT NULL UNIQUE,
  contrasena_hash VARCHAR(255) NOT NULL,
  -- Último número de revisión entregado a los cambios de este usuario
  revision        BIGINT       NOT NULL DEFAULT 0,
  creado_en       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Datos de estudio sincronizados: cada fila es un registro de la app
-- (un perfil, una materia, un apunte...) guardado como JSON.
CREATE TABLE IF NOT EXISTS registros (
  usuario_id     INT          NOT NULL,
  tabla          VARCHAR(40)  NOT NULL,
  registro_id    VARCHAR(100) NOT NULL,
  datos          JSON         NULL,
  -- Los registros borrados se conservan sin datos para avisar a los demás dispositivos
  borrado        BOOLEAN      NOT NULL DEFAULT FALSE,
  revision       BIGINT       NOT NULL,
  actualizado_en DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id, tabla, registro_id),
  INDEX idx_registros_revision (usuario_id, revision),
  CONSTRAINT fk_registros_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
