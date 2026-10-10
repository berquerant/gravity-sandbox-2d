import { formatKm, formatKg, formatKmPerSec, formatSimTime, computeCCWAngleDeg, escapeHtml } from '../core/formatters.js';
import { KM_PER_PX, KG_PER_MASS, KMS_PER_PXS } from '../core/constants.js';
import { getPrimaryStar } from '../physics/celestial.js';
import { eventBus } from '../core/event-bus.js';
import { Camera } from '../renderer/camera.js';

/**
 * Initializes the celestial body catalog drawer and sorting leaderboard table.
 * @param {Object} state - Global state store
 * @param {Camera} camera - Viewport camera coordinator
 * @returns {{updateBodyListUI: Function}}
 */
export function setupBodyCatalog(state, camera) {
  const bodyListDrawer = document.getElementById('bodyListDrawer');
  const btnOpenBodyList = document.getElementById('btnOpenBodyList');
  const btnCloseBodyList = document.getElementById('btnCloseBodyList');
  const btnClearArchivedBodies = document.getElementById('btnClearArchivedBodies');
  const bodySortKey = document.getElementById('bodySortKey');
  const btnToggleSortOrder = document.getElementById('btnToggleSortOrder');
  const sortOrderIcon = document.getElementById('sortOrderIcon');
  const sortOrderLabel = document.getElementById('sortOrderLabel');
  const tableBody = document.getElementById('bodyTableBody');
  const countDisplay = document.getElementById('bodyListCount');
  const emptyMsg = document.getElementById('bodyListEmpty');

  /** Opens or closes the body catalog drawer panel. */
  function setBodyListOpen(open) {
    state.isBodyListOpen = open;
    if (bodyListDrawer) {
      if (open) {
        bodyListDrawer.classList.remove('-translate-x-full');
        updateBodyListUI();
      } else {
        bodyListDrawer.classList.add('-translate-x-full');
      }
    }
  }

  /** Aggregates active bodies and archived records into a unified sortable list. */
  function getCombinedBodyCatalog() {
    const primary = getPrimaryStar(state.bodies);
    const activeList = state.bodies.map(b => {
      const distPx = primary && primary !== b ? b.pos.dist(primary.pos) : 0;
      return {
        id: b.id,
        name: b.name,
        color: b.color,
        massKg: b.mass * KG_PER_MASS,
        radiusKm: b.radius * KM_PER_PX,
        speedKms: b.vel.mag() * KMS_PER_PXS,
        angleDeg: computeCCWAngleDeg(b.vel.x, b.vel.y),
        birthTime: b.birthTime,
        deathTime: null,
        age: state.elapsedTime - b.birthTime,
        absorbCount: b.absorbCount || 0,
        distToPrimaryKm: distPx * KM_PER_PX,
        isAlive: true,
        deathReason: '',
        bodyRef: b
      };
    });

    return [...activeList, ...state.archivedBodies];
  }

  function updateBodyListUI() {
    if (!state.isBodyListOpen) return;
    if (!tableBody || !countDisplay) return;

    const catalog = getCombinedBodyCatalog();
    countDisplay.textContent = `${state.bodies.length} alive / total ${catalog.length}`;

    if (catalog.length === 0) {
      tableBody.innerHTML = '';
      if (emptyMsg) emptyMsg.classList.remove('hidden');
      return;
    }
    if (emptyMsg) emptyMsg.classList.add('hidden');

    const sortKey = state.bodyListSortKey;
    const asc = state.bodyListSortAsc;

    catalog.sort((a, b) => {
      let valA, valB;
      switch (sortKey) {
        case 'absorb':
          valA = a.absorbCount || 0; valB = b.absorbCount || 0; break;
        case 'name':
          return asc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        case 'mass':
          valA = a.massKg; valB = b.massKg; break;
        case 'color':
          return asc ? a.color.localeCompare(b.color) : b.color.localeCompare(a.color);
        case 'speed':
          valA = a.speedKms; valB = b.speedKms; break;
        case 'angle':
          valA = a.angleDeg; valB = b.angleDeg; break;
        case 'age':
          valA = a.age; valB = b.age; break;
        case 'distance':
          valA = a.distToPrimaryKm; valB = b.distToPrimaryKm; break;
        case 'alive':
          valA = a.isAlive ? 1 : 0; valB = b.isAlive ? 1 : 0; break;
        default:
          valA = a.absorbCount || 0; valB = b.absorbCount || 0;
      }

      if (valA < valB) return asc ? -1 : 1;
      if (valA > valB) return asc ? 1 : -1;
      return 0;
    });

    const primary = getPrimaryStar(state.bodies);

    tableBody.innerHTML = catalog.map((item) => {
      const isPrimary = (primary && primary.id === item.id);
      const safeDeathReason = escapeHtml(item.deathReason || '');
      const safeName = escapeHtml(item.name);
      const safeId = escapeHtml(item.id);
      const aliveBadge = item.isAlive
        ? `<span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-sans font-medium">Alive</span>`
        : `<span class="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[9px] font-sans font-medium" title="${safeDeathReason}">Dead</span>`;

      const actionButtons = item.isAlive
        ? `<button class="btn-list-view px-1.5 py-0.5 rounded bg-cyan-900/60 hover:bg-cyan-700 text-cyan-200 text-[10px] font-sans border border-cyan-700/50" data-id="${safeId}">Select</button>`
        : `<span class="text-slate-600 text-[10px] font-sans">-</span>`;

      const absorbBadge = item.absorbCount > 0
        ? `<span class="text-amber-400 font-bold">${item.absorbCount}</span>`
        : `<span class="text-slate-600">0</span>`;

      return `
        <tr class="hover:bg-slate-800/40 transition">
          <td class="py-1.5 px-1.5 flex items-center gap-1.5 truncate max-w-[90px]">
            <span class="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style="background-color: ${item.color};"></span>
            <span class="truncate ${isPrimary ? 'text-amber-400 font-bold' : 'text-slate-200'}">${safeName}</span>
          </td>
          <td class="py-1.5 px-1.5">${aliveBadge}</td>
          <td class="py-1.5 px-1.5 text-right text-slate-300">${formatKg(item.massKg)}</td>
          <td class="py-1.5 px-1.5 text-center">${absorbBadge}</td>
          <td class="py-1.5 px-1.5 text-right text-cyan-300">${formatKmPerSec(item.speedKms)}</td>
          <td class="py-1.5 px-1.5 text-right text-cyan-400">${item.angleDeg.toFixed(0)}°</td>
          <td class="py-1.5 px-1.5 text-right text-slate-300">${isPrimary ? '-' : formatKm(item.distToPrimaryKm)}</td>
          <td class="py-1.5 px-1.5 text-right text-amber-300">${formatSimTime(item.age)}</td>
          <td class="py-1.5 px-1 text-center">${actionButtons}</td>
        </tr>
      `;
    }).join('');
  }

  // Event Listeners
  if (tableBody) {
    tableBody.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-list-view');
      if (btn && btn.dataset.id) {
        const b = state.bodies.find(x => x.id === btn.dataset.id);
        if (b) {
          eventBus.emit('body:selected', b);
        }
      }
    });
  }

  if (btnOpenBodyList) {
    btnOpenBodyList.addEventListener('click', () => setBodyListOpen(!state.isBodyListOpen));
  }
  if (btnCloseBodyList) {
    btnCloseBodyList.addEventListener('click', () => setBodyListOpen(false));
  }
  if (btnClearArchivedBodies) {
    btnClearArchivedBodies.addEventListener('click', () => {
      state.archivedBodies = [];
      updateBodyListUI();
      eventBus.emit('toast:show', 'Archived celestial bodies history cleared');
    });
  }

  if (bodySortKey) {
    bodySortKey.addEventListener('change', (e) => {
      state.bodyListSortKey = e.target.value;
      updateBodyListUI();
    });
  }

  if (btnToggleSortOrder) {
    btnToggleSortOrder.addEventListener('click', () => {
      state.bodyListSortAsc = !state.bodyListSortAsc;
      if (sortOrderLabel) sortOrderLabel.textContent = state.bodyListSortAsc ? 'Asc' : 'Desc';
      if (sortOrderIcon) {
        sortOrderIcon.className = state.bodyListSortAsc
          ? 'fa-solid fa-arrow-up-short-wide text-cyan-400'
          : 'fa-solid fa-arrow-down-wide-short text-cyan-400';
      }
      updateBodyListUI();
    });
  }

  eventBus.on('bodies:collided', updateBodyListUI);
  eventBus.on('bodies:updated', updateBodyListUI);
  eventBus.on('bodies:cleared', updateBodyListUI);
  eventBus.on('bodies:loaded', updateBodyListUI);

  return { updateBodyListUI, setBodyListOpen };
}
