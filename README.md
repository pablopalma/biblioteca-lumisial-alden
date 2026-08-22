# Biblioteca Gnosis Lumisial Alden

Sitio web estático para gestionar la biblioteca del Lumisial Alden de Gnosis:
préstamos, disponibilidad, stock y seguimiento de quién tiene cada libro y por
cuántos días. Funciona 100% en el navegador, **sin servidor ni base de datos**,
por lo que se puede publicar gratis en **GitHub Pages**.

## Qué hace

- **ABM de libros**: agregar, editar y eliminar libros fácilmente (título, autor,
  categoría, stock, ubicación/estante y notas).
- **Préstamos**: registrar a quién se le presta un libro, la fecha y los días
  solicitados. Muestra los días transcurridos y avisa cuando un préstamo está
  **vencido**.
- **Devoluciones e historial**: marcar devoluciones y ver el historial de cada
  libro (fechas y duración real del préstamo).
- **Disponibilidad y stock**: calcula automáticamente los ejemplares disponibles
  (stock menos préstamos activos).
- **Buscador y filtros**: por título/autor/categoría, por disponibilidad y con
  ordenamiento.
- **Responsivo**: se adapta a celular, tablet y escritorio.
- **Tema claro/oscuro**.
- **Exportar / Importar** los datos en un archivo `.json` (para respaldo o para
  pasarlos a otra computadora).

## Acceso de administrador (login)

Para **agregar, editar, eliminar o prestar** libros hay que iniciar sesión con el
botón **🔒 Ingresar**:

- **Usuario:** `adminalden`
- **Contraseña:** `admin123`

Sin sesión, cualquiera puede **ver** el catálogo, buscar y consultar préstamos,
pero **no puede modificar** nada. La sesión queda guardada en el dispositivo hasta
que se toca **🔓 Salir**.


## ⚠️ Importante sobre los datos

Los datos se guardan en el **almacenamiento local del navegador** (`localStorage`)
del dispositivo donde se use. Esto significa:

- Es ideal para que **una persona (el bibliotecario)** lleve el control desde su
  computadora o celular.
- Los datos **no se sincronizan** automáticamente entre distintos dispositivos ni
  entre distintas personas.
- Para respaldar o mover los datos, usá el botón **Exportar** (descarga un `.json`)
  y **Importar** en el otro dispositivo.
- Si borrás los datos del navegador o el historial, se pueden perder: **exportá
  seguido**.

> Si en el futuro necesitás que varias personas vean y modifiquen los mismos datos
> en simultáneo, hace falta un backend gratuito (por ejemplo Firebase o Supabase).
> El sitio actual queda preparado para eso, pero no lo incluye.

## Publicar en GitHub Pages

1. Creá un repositorio en GitHub (por ejemplo `biblioteca-alden`).
2. Subí estos archivos a la raíz del repositorio:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `README.md`
   - la carpeta **`assets/`** completa (contiene `logo.png`, el emblema) — **si no la
     subís, el logo no aparecerá.**
3. En GitHub, entrá a **Settings → Pages**.
4. En **Source**, elegí la rama `main` y la carpeta `/root`, y guardá.
5. En unos minutos el sitio queda disponible en:
   `https://TU-USUARIO.github.io/biblioteca-alden/`

### Subir por línea de comandos (opcional)

```bash
git init
git add .
git commit -m "Biblioteca Gnosis Lumisial Alden"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/biblioteca-alden.git
git push -u origin main
```

## Uso local

Abrí `index.html` directamente en el navegador (doble clic). No necesita
instalación ni servidor.

## Estructura

```
index.html   → estructura de la página y modales
styles.css   → estilos y diseño responsivo (tema claro/oscuro)
app.js       → lógica: ABM, préstamos, filtros, exportar/importar, persistencia
```
