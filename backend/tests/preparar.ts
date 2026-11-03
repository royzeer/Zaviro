// Se ejecuta antes de cada archivo de pruebas: usa una base de datos aparte para no tocar la real.
process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.DB_NAME_TEST || 'zaviro_pruebas';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-pruebas';
