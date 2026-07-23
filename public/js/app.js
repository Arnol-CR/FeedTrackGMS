const API_URL = '/api/usuarios';

const form = document.getElementById('form-usuario');
const inputId = document.getElementById('usuario-id');
const inputNombre = document.getElementById('nombre');
const inputCorreo = document.getElementById('correo');
const tbody = document.querySelector('#tabla-usuarios tbody');

// authHeaders() y manejarRespuesta() vienen de js/layout.js (cargado antes que este archivo)

async function cargarUsuarios() {
  try {
    const res = await fetch(API_URL, { headers: authHeaders() });
    await manejarRespuesta(res);
    const usuarios = await res.json();
    renderTabla(usuarios);
  } catch (err) {
    console.error('Error al cargar usuarios:', err);
  }
}

function renderTabla(usuarios) {
  tbody.innerHTML = '';
  usuarios.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.id}</td>
      <td>${u.nombre}</td>
      <td>${u.correo}</td>
      <td>
        <button class="btn-editar" onclick="editarUsuario(${u.id}, '${u.nombre}', '${u.correo}')">Editar</button>
        <button class="btn-eliminar" onclick="eliminarUsuario(${u.id})">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = inputId.value;
  const data = { nombre: inputNombre.value, correo: inputCorreo.value };

  try {
    let res;
    if (id) {
      res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(data)
      });
    } else {
      res = await fetch(API_URL, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data)
      });
    }
    await manejarRespuesta(res);
    form.reset();
    inputId.value = '';
    cargarUsuarios();
  } catch (err) {
    console.error('Error al guardar usuario:', err);
  }
});

function editarUsuario(id, nombre, correo) {
  inputId.value = id;
  inputNombre.value = nombre;
  inputCorreo.value = correo;
}

async function eliminarUsuario(id) {
  if (!confirm('¿Eliminar este usuario?')) return;
  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    await manejarRespuesta(res);
    cargarUsuarios();
  } catch (err) {
    console.error('Error al eliminar usuario:', err);
  }
}

cargarUsuarios();
