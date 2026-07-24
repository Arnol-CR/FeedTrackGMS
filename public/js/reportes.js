const selectSector = document.getElementById('sector');
const selectTipoRecipiente = document.getElementById('tipo-recipiente');
const inputFecha = document.getElementById('fecha');
const form = document.getElementById('form-reporte');
const tbody = document.querySelector('#tabla-reporte tbody');
const mensajeReporte = document.getElementById('mensaje-reporte');

// Fecha por defecto: hoy (en hora local, no UTC)
function fechaLocalHoy() {
  const hoy = new Date();
  const offset = hoy.getTimezoneOffset() * 60000; // minutos a milisegundos
  return new Date(hoy - offset).toISOString().split('T')[0];
}
inputFecha.value = fechaLocalHoy();

// Intenta encontrar una columna "de nombre" en un registro, sin asumir un
// nombre exacto de columna (las vistas pueden variar).
function obtenerEtiqueta(fila, idField) {
  const candidatos = ['Nombre', 'NombreSector', 'Sector', 'Descripcion',
    'NombreTipoRecipiente', 'TipoRecipiente', 'NombreRecipiente'];
  for (const campo of candidatos) {
    if (fila[campo]) return fila[campo];
  }
  return `#${fila[idField]}`;
}

async function cargarCombos() {
  try {
    const [resSectores, resTipos] = await Promise.all([
      fetch('/api/reportes/sectores', { headers: authHeaders() }),
      fetch('/api/reportes/tipos-recipientes', { headers: authHeaders() })
    ]);
    await manejarRespuesta(resSectores);
    await manejarRespuesta(resTipos);

    const sectores = await resSectores.json();
    const tipos = await resTipos.json();

    selectSector.innerHTML = sectores
      .filter(s => !obtenerEtiqueta(s, 'IdSector').toUpperCase().startsWith('TODA'))
      .map(s => `<option value="${s.IdSector}">${obtenerEtiqueta(s, 'IdSector')}</option>`)
      .join('');

    selectTipoRecipiente.innerHTML = tipos.map(t =>
      `<option value="${t.IdTipoRecimiente}">${obtenerEtiqueta(t, 'IdTipoRecimiente')}</option>`
    ).join('');
  } catch (err) {
    console.error('Error al cargar combos:', err);
    mostrarError('No se pudieron cargar los sectores / tipos de recipiente');
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  ocultarError();
  tbody.innerHTML = '';

  const params = new URLSearchParams({
    fecha: inputFecha.value,
    idSector: selectSector.value,
    idRecipiente: selectTipoRecipiente.value
  });

  try {
    const res = await fetch(`/api/reportes/racion?${params}`, { headers: authHeaders() });
    await manejarRespuesta(res);
    const data = await res.json();

    if (!res.ok) {
      mostrarError(data.detalle || data.error || 'No se pudo generar el reporte');
      return;
    }

    const filas = data.filter(f =>
      Number(f.Racion) > 0 ||
      (f.LecturaMañana && f.LecturaMañana.trim() !== '') ||
      (f.LecturaTarde && f.LecturaTarde.trim() !== '')
    );

    if (filas.length === 0) {
      mostrarError('No hay datos para los filtros seleccionados');
      return;
    }

const mapaRacionesExistentes = await obtenerRacionesExistentes(filas);
const mapaAjustesExistentes = await obtenerAjustesExistentes(filas);
mostrarResumenFiltros();
renderTabla(filas, mapaRacionesExistentes, mapaAjustesExistentes);
  } catch (err) {
    console.error('Error al generar el reporte:', err);
    mostrarError('Error de conexión al generar el reporte');
  }
});

function calcularFechaSiguiente() {
  const fechaSeleccionada = new Date(inputFecha.value + 'T00:00:00');
  fechaSeleccionada.setDate(fechaSeleccionada.getDate() + 1);
  return fechaSeleccionada.toISOString().split('T')[0];
}

async function obtenerAjustesExistentes(filas) {
  const idEstanques = filas.map(f => f.IdEstanque).join(',');

  try {
    const res = await fetch(`/api/reportes/ajustes-existentes?fecha=${inputFecha.value}&idEstanques=${idEstanques}`, {
      headers: authHeaders()
    });
    await manejarRespuesta(res);
    const registros = await res.json();

    const mapa = {};
    registros.forEach(r => { mapa[r.IdEstanque] = { ajuste1: r.Ajuste1, ajuste2: r.Ajuste2 }; });
    return mapa;
  } catch (err) {
    console.error('Error al obtener ajustes existentes:', err);
    return {};
  }
}

async function obtenerRacionesExistentes(filas) {
  const fechaSiguiente = calcularFechaSiguiente();
  const idEstanques = filas.map(f => f.IdEstanque).join(',');

  try {
    const res = await fetch(`/api/reportes/racion-existente?fecha=${fechaSiguiente}&idEstanques=${idEstanques}`, {
      headers: authHeaders()
    });
    await manejarRespuesta(res);
    const registros = await res.json();

    const mapa = {};
    registros.forEach(r => { mapa[r.IdEstanque] = r.Racion; });
    return mapa;
  } catch (err) {
    console.error('Error al obtener raciones existentes:', err);
    return {};
  }
}

const timersGuardado = {};
const timersAjustes = {};

function renderTabla(filas, mapaRacionesExistentes = {}, mapaAjustesExistentes = {}) {
  tbody.innerHTML = filas.map((f, i) => {
    const racionExistente = mapaRacionesExistentes[f.IdEstanque];
    const valorInicialRacion = (racionExistente !== undefined && racionExistente !== null)
      ? racionExistente
      : '';

    const ajustes = mapaAjustesExistentes[f.IdEstanque] || {};
    const valorAjuste1 = (ajustes.ajuste1 !== undefined && ajustes.ajuste1 !== null) ? ajustes.ajuste1 : '';
    const valorAjuste2 = (ajustes.ajuste2 !== undefined && ajustes.ajuste2 !== null) ? ajustes.ajuste2 : '';

    return `
    <tr>
      <td>${f.NombreRecipiente ?? ''}</td>
      <td>
        <input type="number" step="0.01" id="ajuste1-${i}" value="${valorAjuste1}"
               oninput="onCambioAjuste(${i}, ${f.IdEstanque})"
               style="width:90px; padding:0.4rem; border:1px solid #cbd2d9; border-radius:4px;">
      </td>
      <td>
        <input type="number" step="0.01" id="ajuste2-${i}" value="${valorAjuste2}"
               oninput="onCambioAjuste(${i}, ${f.IdEstanque})"
               style="width:90px; padding:0.4rem; border:1px solid #cbd2d9; border-radius:4px;">
        <span id="estado-ajuste-${i}" style="font-size:0.8rem; display:block; margin-top:0.2rem;"></span>
      </td>
      <td>${formatearNumero(f.Racion)}</td>
<td>${formatearNumero(f.LibrasConsumo)}</td>
      <td>${badgePorcentaje(f.Porcentaje)}</td>
      <td>${f.LecturaMañana ?? ''}</td>
      <td>${f.LecturaTarde ?? ''}</td>
      <td>
        <div style="display:flex; gap:0.4rem; align-items:center;">
          <input type="number" step="0.01" min="0" placeholder="Ración"
                 id="racion-siguiente-${i}" value="${valorInicialRacion}"
                 oninput="onCambioRacion(${i}, ${f.IdEstanque})"
                 style="width:100px; padding:0.4rem; border:1px solid #cbd2d9; border-radius:4px;">
          <span id="estado-racion-${i}" style="font-size:0.8rem;"></span>
        </div>
      </td>
    </tr>
  `;
  }).join('');
}

function onCambioAjuste(indice, idEstanque) {
  const estado = document.getElementById(`estado-ajuste-${indice}`);
  estado.textContent = '';

  clearTimeout(timersAjustes[indice]);
  timersAjustes[indice] = setTimeout(() => {
    guardarAjustes(indice, idEstanque);
  }, 800);
}

async function guardarAjustes(indice, idEstanque) {
  const inputAjuste1 = document.getElementById(`ajuste1-${indice}`);
  const inputAjuste2 = document.getElementById(`ajuste2-${indice}`);
  const estado = document.getElementById(`estado-ajuste-${indice}`);

  if ((inputAjuste1.value !== '' && isNaN(inputAjuste1.value)) ||
      (inputAjuste2.value !== '' && isNaN(inputAjuste2.value))) {
    estado.textContent = 'Número inválido';
    estado.style.color = '#b91c1c';
    return;
  }

  estado.textContent = 'Guardando...';
  estado.style.color = '#6b7280';

  try {
    const res = await fetch('/api/reportes/ajustes', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        idEstanque,
        fecha: inputFecha.value,
        ajuste1: inputAjuste1.value === '' ? null : Number(inputAjuste1.value),
        ajuste2: inputAjuste2.value === '' ? null : Number(inputAjuste2.value)
      })
    });
    await manejarRespuesta(res);
    const data = await res.json();

    if (!res.ok) {
      estado.textContent = data.detalle || data.error || 'Error al guardar';
      estado.style.color = '#b91c1c';
      return;
    }

    estado.textContent = '✔ Guardado';
    estado.style.color = '#15803d';
  } catch (err) {
    console.error('Error al guardar ajustes:', err);
    estado.textContent = 'Error de conexión';
    estado.style.color = '#b91c1c';
  }
}

function onCambioRacion(indice, idEstanque) {
  const estado = document.getElementById(`estado-racion-${indice}`);
  estado.textContent = '';

  clearTimeout(timersGuardado[indice]);
  timersGuardado[indice] = setTimeout(() => {
    guardarRacionSiguiente(indice, idEstanque);
  }, 800); // espera 800ms después de dejar de escribir
}

function badgePorcentaje(valor) {
  const pct = Number(valor) || 0;
  let color = '#b91c1c'; // rojo: <= 50
  if (pct > 55) color = '#15803d'; // verde: > 55
  else if (pct > 50) color = '#a16207'; // amarillo: 50.01 a 55
  return `<span style="background:${color}1a; color:${color}; padding:0.2rem 0.6rem; border-radius:999px; font-weight:600; font-size:0.8rem;">${pct}%</span>`;
}


function limpiarNumero(texto) {
  return String(texto ?? '').replace(/,/g, '').trim();
}

function formatearCampo(input) {
  const limpio = limpiarNumero(input.value);
  if (limpio === '' || isNaN(limpio)) return;
  input.value = Number(limpio).toLocaleString('es-HN', { maximumFractionDigits: 2 });
}

function limpiarCampoParaEditar(input) {
  input.value = limpiarNumero(input.value);
}

function mostrarResumenFiltros() {
  const textoSector = selectSector.options[selectSector.selectedIndex]?.text || '';
  const [anio, mes, dia] = inputFecha.value.split('-');
  const fechaFormateada = `${dia}/${mes}/${anio}`;
  document.getElementById('resumen-filtros').textContent =
    `Sector: ${textoSector}  •  Fecha: ${fechaFormateada}`;
}

async function guardarRacionSiguiente(indice, idEstanque) {
  const input = document.getElementById(`racion-siguiente-${indice}`);
  const estado = document.getElementById(`estado-racion-${indice}`);
  const valor = input.value;

  if (valor === '') {
    estado.textContent = '';
    return;
  }

  if (isNaN(valor)) {
    estado.textContent = 'Número inválido';
    estado.style.color = '#b91c1c';
    return;
  }

  // La ración capturada aquí es para el día SIGUIENTE a la fecha consultada
  const fechaSiguiente = calcularFechaSiguiente();

  estado.textContent = 'Guardando...';
  estado.style.color = '#6b7280';

  try {
    const res = await fetch('/api/reportes/racion', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ idEstanque, fecha: fechaSiguiente, racion: Number(valor) })
    });
    await manejarRespuesta(res);
    const data = await res.json();

    if (!res.ok) {
      estado.textContent = data.detalle || data.error || 'Error al guardar';
      estado.style.color = '#b91c1c';
      return;
    }

    estado.textContent = '✔ Guardado';
    estado.style.color = '#15803d';
  } catch (err) {
    console.error('Error al guardar ración del día siguiente:', err);
    estado.textContent = 'Error de conexión';
    estado.style.color = '#b91c1c';
  }
}

function mostrarError(texto) {
  mensajeReporte.textContent = texto;
  mensajeReporte.hidden = false;
}

function ocultarError() {
  mensajeReporte.hidden = true;
  mensajeReporte.textContent = '';
}

function formatearNumero(valor) {
  const num = Number(valor) || 0;
  return num.toLocaleString('es-HN', { maximumFractionDigits: 0 });
}

cargarCombos();
document.getElementById('btn-exportar-excel').addEventListener('click', exportarExcel);
document.getElementById('btn-copiar-imagen').addEventListener('click', copiarImagen);

function leerFilasVisibles() {
  const filas = [];
  document.querySelectorAll('#tabla-reporte tbody tr').forEach(tr => {
    const c = tr.querySelectorAll('td');
    filas.push({
      'Recipiente': c[0].textContent.trim(),
      'Ajuste 1': (c[1].querySelector('input')?.value || '').replace(/,/g, ''),
      'Ajuste 2': (c[2].querySelector('input')?.value || '').replace(/,/g, ''),
      'Ración': c[3].textContent.replace(/,/g, '').trim(),
      'Libras consumo': c[4].textContent.replace(/,/g, '').trim(),
      '%': c[5].textContent.trim(),
      'Lectura mañana': c[6].textContent.trim(),
      'Lectura tarde': c[7].textContent.trim(),
      'Ración día siguiente': (c[8].querySelector('input')?.value || '').replace(/,/g, '')
    });
  });
  return filas;
}

function exportarExcel() {
  const filas = leerFilasVisibles();
  if (filas.length === 0) {
    mostrarError('No hay datos para exportar');
    return;
  }
  const hoja = XLSX.utils.json_to_sheet(filas);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Reporte de Ración');
  XLSX.writeFile(libro, `ReporteRacion_${inputFecha.value}.xlsx`);
}

async function construirElementoParaImagen() {
  const textoSector = selectSector.options[selectSector.selectedIndex]?.text || '';
  const [anio, mes, dia] = inputFecha.value.split('-');
  const fechaFormateada = `${dia}/${mes}/${anio}`;
  const usuario = localStorage.getItem('usuario') || '';

  const temp = document.createElement('div');
  temp.style.cssText = 'position:fixed; left:-9999px; top:0; background:white; padding:24px; width:1400px; font-family:Inter, system-ui, sans-serif;';

  const header = document.createElement('div');
  header.style.cssText = 'display:flex; align-items:center; gap:16px; margin-bottom:20px; border-bottom:3px solid #4285F4; padding-bottom:16px;';
  header.innerHTML = `
    <img src="img/logo.png" style="width:56px; height:56px;">
    <div>
      <div style="font-size:22px; font-weight:700; color:#1f2933;">FeedTrack Web GMS</div>
      <div style="font-size:14px; color:#6b7280;">Reporte de Ración — Sector: ${textoSector} · Fecha: ${fechaFormateada}</div>
      <div style="font-size:13px; color:#6b7280;">Generado por: ${usuario}</div>
    </div>
  `;
  temp.appendChild(header);

  const tablaClonada = document.getElementById('tabla-reporte').cloneNode(true);
  tablaClonada.querySelectorAll('input').forEach(input => {
    const span = document.createElement('span');
    span.textContent = input.value || '-';
    input.replaceWith(span);
  });
tablaClonada.querySelectorAll('tr').forEach(tr => {
  const celda = tr.children[8]; // columna "Ración día siguiente"
  if (celda) {
    celda.style.background = '#0f799a';
    celda.style.fontWeight = 'bold';
    celda.style.color = 'white';
  }
  });
  temp.appendChild(tablaClonada);
  document.body.appendChild(temp);
  return temp;
}

async function copiarImagen() {
  if (document.querySelectorAll('#tabla-reporte tbody tr').length === 0) {
    mostrarError('No hay datos para copiar');
    return;
  }

  const temp = await construirElementoParaImagen();

  try {
    const canvas = await html2canvas(temp, { scale: 2, backgroundColor: '#ffffff' });
    canvas.toBlob(async (blob) => {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        mostrarError('✔ Imagen copiada, ya puedes pegarla (Ctrl+V)');
      } catch (err) {
        console.error('Error al copiar al portapapeles:', err);
        mostrarError('No se pudo copiar la imagen (tu navegador podría no permitirlo)');
      }
    }, 'image/png');
  } catch (err) {
    console.error('Error al generar la imagen:', err);
    mostrarError('Error al generar la imagen');
  } finally {
    document.body.removeChild(temp);
  }
}