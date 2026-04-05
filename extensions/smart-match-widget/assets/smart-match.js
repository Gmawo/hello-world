/**
 * Smart Match Widget
 * Device compatibility filter for smartwatch accessory shops.
 *
 * State flow:
 * 1. No device selected → green banner with "Select your device" CTA
 * 2. Modal open → brand/model dropdowns, search, device grid
 * 3. Device selected → banner shows device name + "Change"/"Clear" buttons,
 *    products filtered, category tabs shown
 */

(function SmartMatch() {
  'use strict';

  // ── Constants ─────────────────────────────────────────────────────────────
  const LS_KEY = 'smartmatch_device';
  const STOREFRONT_API_VERSION = '2024-10';

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const root = document.getElementById('smart-match-root');
  const modal = document.getElementById('smart-match-modal');

  if (!root || !modal) return;

  // ── Configuration from data attributes ───────────────────────────────────
  const config = {
    shop: root.dataset.shop,
    collection: root.dataset.collection,
    storefrontToken: root.dataset.storefrontToken,
    appUrl: root.dataset.appUrl,
    strapsCollection: root.dataset.strapsCollection,
    protectionCollection: root.dataset.protectionCollection,
    accessoriesCollection: root.dataset.accessoriesCollection,
    productSelector: root.dataset.productSelector || '[data-product-handle]',
    locale: root.dataset.locale || 'en',
  };

  // ── i18n strings (extend for more locales) ────────────────────────────────
  const i18n = {
    da: {
      bannerSubtitleDefault: 'Når du har valgt din enhed, viser vi kun tilbehør der passer til netop din model.',
      bannerSubtitleSelected: 'Viser tilbehør der passer perfekt til:',
      ctaButton: 'Vælg din enhed',
      changeButton: 'Skift',
      tabStraps: 'Remme',
      tabProtection: 'Beskyttelse',
      tabAccessories: 'Tilbehør',
      popularLabel: (brand, count) => `Populære ${brand} enheder (${count} enheder)`,
      variantsLabel: (model) => `${model} – varianter`,
      noResults: 'Ingen enheder fundet',
      noProducts: 'Ingen produkter fundet til denne enhed',
      allBrands: 'Alle Mærker',
      allModels: 'Alle Modeller',
    },
    en: {
      bannerSubtitleDefault: 'Select your device to see only accessories that fit your exact model.',
      bannerSubtitleSelected: 'Showing accessories that perfectly fit:',
      ctaButton: 'Select your device',
      changeButton: 'Change',
      tabStraps: 'Straps',
      tabProtection: 'Protection',
      tabAccessories: 'Accessories',
      popularLabel: (brand, count) => `Popular ${brand} devices (${count} devices)`,
      variantsLabel: (model) => `${model} – variants`,
      noResults: 'No devices found',
      noProducts: 'No products found for this device',
      allBrands: 'All Brands',
      allModels: 'All Models',
    },
  };

  function t(key, ...args) {
    const locale = config.locale.startsWith('da') ? 'da' : 'en';
    const strings = i18n[locale] || i18n.en;
    const val = strings[key];
    if (typeof val === 'function') return val(...args);
    return val || key;
  }

  // ── State ─────────────────────────────────────────────────────────────────
  let deviceCatalog = null; // { brands: [{ brand, brandHandle, models: [...] }] }
  let selectedDevice = loadDevice();
  let allProductHandles = null;

  // ── Modal elements ────────────────────────────────────────────────────────
  const brandSelect = document.getElementById('sm-brand-select');
  const modelSelect = document.getElementById('sm-model-select');
  const searchInput = document.getElementById('sm-search-input');
  const deviceGrid = document.getElementById('sm-device-grid');
  const modalClose = modal.querySelector('.sm-modal__close');
  const modalBackdrop = modal.querySelector('.sm-modal__backdrop');
  const brandWrap = document.getElementById('sm-brand-wrap');
  const modelWrap = document.getElementById('sm-model-wrap');

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  init();

  function init() {
    renderBanner();
    if (selectedDevice) {
      filterProducts(selectedDevice.handle);
      renderCategoryTabs();
    }
    bindModalEvents();
  }

  // ── Persistence ───────────────────────────────────────────────────────────
  function loadDevice() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function saveDevice(device) {
    selectedDevice = device;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(device));
    } catch (_) {}
  }

  function clearDevice() {
    selectedDevice = null;
    try {
      localStorage.removeItem(LS_KEY);
    } catch (_) {}
  }

  // ── Banner rendering ──────────────────────────────────────────────────────
  function renderBanner() {
    if (selectedDevice) {
      renderBannerSelected();
    } else {
      renderBannerEmpty();
    }
  }

  function renderBannerEmpty() {
    root.innerHTML = `
      <div class="sm-banner">
        <svg class="sm-banner__deco" viewBox="0 0 90 90" fill="none" aria-hidden="true">
          <circle cx="45" cy="45" r="40" stroke="white" stroke-width="6"/>
          <circle cx="45" cy="45" r="18" stroke="white" stroke-width="4"/>
          <line x1="45" y1="5" x2="45" y2="85" stroke="white" stroke-width="3"/>
          <line x1="5" y1="45" x2="85" y2="45" stroke="white" stroke-width="3"/>
        </svg>
        <span class="sm-banner__title">SMART MATCH</span>
        <p class="sm-banner__subtitle">${t('bannerSubtitleDefault')}</p>
        <button class="sm-banner__cta" id="sm-open-modal" type="button">
          ${t('ctaButton')}
        </button>
      </div>
    `;
    document.getElementById('sm-open-modal').addEventListener('click', openModal);
  }

  function renderBannerSelected() {
    root.innerHTML = `
      <div class="sm-banner">
        <svg class="sm-banner__deco" viewBox="0 0 90 90" fill="none" aria-hidden="true">
          <circle cx="45" cy="45" r="40" stroke="white" stroke-width="6"/>
          <circle cx="45" cy="45" r="18" stroke="white" stroke-width="4"/>
          <line x1="45" y1="5" x2="45" y2="85" stroke="white" stroke-width="3"/>
          <line x1="5" y1="45" x2="85" y2="45" stroke="white" stroke-width="3"/>
        </svg>
        <span class="sm-banner__title">SMART MATCH</span>
        <p class="sm-banner__subtitle">${t('bannerSubtitleSelected')}</p>
        <div class="sm-banner__device-row">
          <div class="sm-banner__device-info">
            <div class="sm-banner__device-brand">${escHtml(selectedDevice.brand)}</div>
            <div class="sm-banner__device-model">${escHtml(selectedDevice.model)}</div>
          </div>
          <button class="sm-banner__clear-btn" id="sm-clear-device" type="button" aria-label="Clear device selection">&#10005;</button>
        </div>
        <button class="sm-banner__change-btn" id="sm-change-device" type="button">
          ${t('changeButton')}
        </button>
      </div>
    `;
    document.getElementById('sm-clear-device').addEventListener('click', () => {
      clearDevice();
      renderBanner();
      restoreAllProducts();
      removeCategoryTabs();
    });
    document.getElementById('sm-change-device').addEventListener('click', openModal);
  }

  // ── Category Tabs ─────────────────────────────────────────────────────────
  function renderCategoryTabs() {
    if (!config.strapsCollection && !config.protectionCollection && !config.accessoriesCollection) return;

    const existing = document.getElementById('sm-tabs');
    if (existing) existing.remove();

    const tabs = [];

    if (config.strapsCollection) {
      tabs.push({
        label: t('tabStraps'),
        handle: config.strapsCollection,
        icon: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/><path d="M12 5V2M12 22v-3"/></svg>`,
      });
    }
    if (config.protectionCollection) {
      tabs.push({
        label: t('tabProtection'),
        handle: config.protectionCollection,
        icon: `<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>`,
      });
    }
    if (config.accessoriesCollection) {
      tabs.push({
        label: t('tabAccessories'),
        handle: config.accessoriesCollection,
        icon: `<svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
      });
    }

    if (tabs.length === 0) return;

    const currentCollection = config.collection;
    const tabsEl = document.createElement('nav');
    tabsEl.id = 'sm-tabs';
    tabsEl.className = 'sm-tabs';
    tabsEl.setAttribute('aria-label', 'Product categories');

    tabsEl.innerHTML = tabs.map((tab) => {
      const isActive = currentCollection === tab.handle;
      const href = selectedDevice
        ? `/collections/${tab.handle}?sm_device=${encodeURIComponent(selectedDevice.handle)}`
        : `/collections/${tab.handle}`;
      return `
        <a href="${href}" class="sm-tab${isActive ? ' sm-tab--active' : ''}" data-handle="${escHtml(tab.handle)}">
          ${tab.icon}
          <span>${escHtml(tab.label)}</span>
        </a>
      `;
    }).join('');

    root.insertAdjacentElement('afterend', tabsEl);
  }

  function removeCategoryTabs() {
    const el = document.getElementById('sm-tabs');
    if (el) el.remove();
  }

  // ── Modal ─────────────────────────────────────────────────────────────────
  function bindModalEvents() {
    modalClose.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.hidden) closeModal();
    });

    brandSelect.addEventListener('change', onBrandChange);
    modelSelect.addEventListener('change', onModelChange);
    searchInput.addEventListener('input', onSearch);
  }

  async function openModal() {
    modal.hidden = false;
    document.body.style.overflow = 'hidden';

    // Restore default select options text if catalog already loaded
    if (deviceCatalog) {
      populateBrandSelect();
      if (selectedDevice) {
        brandSelect.value = selectedDevice.brandHandle;
        onBrandChange(null, selectedDevice.modelHandle);
      } else {
        renderDeviceGrid(deviceCatalog.brands);
      }
    } else {
      await loadCatalog();
    }

    searchInput.focus();
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    searchInput.value = '';
  }

  // ── Catalog loading ───────────────────────────────────────────────────────
  async function loadCatalog() {
    showGridLoading();

    try {
      const url = `${config.appUrl}/api/devices?shop=${encodeURIComponent(config.shop)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch devices');
      deviceCatalog = await res.json();
    } catch (_) {
      // Fallback: try the hardcoded static data embedded in the page
      deviceCatalog = window.__SM_DEVICE_CATALOG__ || { brands: [] };
    }

    populateBrandSelect();

    if (selectedDevice) {
      brandSelect.value = selectedDevice.brandHandle;
      onBrandChange(null, selectedDevice.modelHandle);
    } else {
      renderDeviceGrid(deviceCatalog.brands);
    }
  }

  function populateBrandSelect() {
    // Keep the "All brands" option and add brands
    brandSelect.innerHTML = `<option value="">${t('allBrands')}</option>`;
    if (!deviceCatalog) return;

    for (const bg of deviceCatalog.brands) {
      const opt = document.createElement('option');
      opt.value = bg.brandHandle;
      opt.textContent = bg.brand;
      brandSelect.appendChild(opt);
    }
  }

  function onBrandChange(event, preselectModelHandle) {
    const brandHandle = brandSelect.value;

    // Style the brand select as active
    brandWrap.classList.toggle('sm-select-wrap--active', !!brandHandle);
    modelWrap.classList.remove('sm-select-wrap--active');

    // Reset model select
    modelSelect.innerHTML = `<option value="">${t('allModels')}</option>`;
    modelSelect.disabled = !brandHandle;
    modelSelect.value = '';

    if (!brandHandle) {
      renderDeviceGrid(deviceCatalog.brands);
      return;
    }

    const brandGroup = deviceCatalog.brands.find((b) => b.brandHandle === brandHandle);
    if (!brandGroup) return;

    // Populate model select
    for (const model of brandGroup.models) {
      const opt = document.createElement('option');
      opt.value = model.modelHandle;
      opt.textContent = model.model;
      modelSelect.appendChild(opt);
    }

    if (preselectModelHandle) {
      modelSelect.value = preselectModelHandle;
      modelWrap.classList.add('sm-select-wrap--active');
      renderVariantsGrid(brandGroup);
    } else {
      renderBrandGrid(brandGroup);
    }
  }

  function onModelChange() {
    const brandHandle = brandSelect.value;
    const modelHandle = modelSelect.value;

    modelWrap.classList.toggle('sm-select-wrap--active', !!modelHandle);

    if (!brandHandle) return;

    const brandGroup = deviceCatalog.brands.find((b) => b.brandHandle === brandHandle);
    if (!brandGroup) return;

    if (modelHandle) {
      renderVariantsGrid(brandGroup);
    } else {
      renderBrandGrid(brandGroup);
    }
  }

  function onSearch() {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
      const brandHandle = brandSelect.value;
      if (brandHandle) {
        const bg = deviceCatalog.brands.find((b) => b.brandHandle === brandHandle);
        renderBrandGrid(bg || null);
      } else {
        renderDeviceGrid(deviceCatalog.brands);
      }
      return;
    }

    const filtered = deviceCatalog.brands
      .map((bg) => ({
        ...bg,
        models: bg.models.filter(
          (m) =>
            m.model.toLowerCase().includes(query) ||
            m.brand.toLowerCase().includes(query)
        ),
      }))
      .filter((bg) => bg.models.length > 0);

    renderDeviceGrid(filtered);
  }

  // ── Grid rendering ────────────────────────────────────────────────────────
  function showGridLoading() {
    deviceGrid.innerHTML = `<div class="sm-loading-spinner"><div class="sm-spinner"></div></div>`;
  }

  function renderDeviceGrid(brands) {
    if (!brands || brands.length === 0) {
      deviceGrid.innerHTML = `<div class="sm-no-results">${t('noResults')}</div>`;
      return;
    }

    let html = '';
    for (const bg of brands) {
      html += `<p class="sm-group-label">${t('popularLabel', bg.brand, bg.models.length)}</p>`;
      html += `<div class="sm-grid">`;
      for (const model of bg.models) {
        html += renderDeviceCard(model, bg.brand);
      }
      html += `</div>`;
    }
    deviceGrid.innerHTML = html;
    bindCardClicks();
  }

  function renderBrandGrid(brandGroup) {
    if (!brandGroup) {
      renderDeviceGrid(deviceCatalog.brands);
      return;
    }
    let html = `<p class="sm-group-label">${t('popularLabel', brandGroup.brand, brandGroup.models.length)}</p>`;
    html += `<div class="sm-grid">`;
    for (const model of brandGroup.models) {
      html += renderDeviceCard(model, brandGroup.brand);
    }
    html += `</div>`;
    deviceGrid.innerHTML = html;
    bindCardClicks();
  }

  function renderVariantsGrid(brandGroup) {
    const modelHandle = modelSelect.value;
    const primaryModel = brandGroup.models.find((m) => m.modelHandle === modelHandle);

    if (!primaryModel) {
      renderBrandGrid(brandGroup);
      return;
    }

    // Show the selected model and closely related variants
    // (same brand, similar name — simplified: just show all brand models with selected first)
    const variants = [primaryModel, ...brandGroup.models.filter((m) => m.modelHandle !== modelHandle)];

    let html = `<p class="sm-group-label">${t('variantsLabel', primaryModel.model)}</p>`;
    html += `<div class="sm-grid">`;
    for (const model of variants) {
      const isSelected = selectedDevice && selectedDevice.handle === model.handle;
      html += renderDeviceCard(model, brandGroup.brand, isSelected);
    }
    html += `</div>`;
    deviceGrid.innerHTML = html;
    bindCardClicks();
  }

  function renderDeviceCard(model, brand, isSelected) {
    const selected = isSelected || (selectedDevice && selectedDevice.handle === model.handle);
    const imgHtml = model.imageUrl
      ? `<img class="sm-device-card__img" src="${escHtml(model.imageUrl)}" alt="${escHtml(model.model)}" loading="lazy" />`
      : `<div class="sm-device-card__img-placeholder">⌚</div>`;

    return `
      <button
        class="sm-device-card${selected ? ' sm-device-card--selected' : ''}"
        type="button"
        data-handle="${escHtml(model.handle)}"
        data-brand="${escHtml(brand)}"
        data-brand-handle="${escHtml(model.brandHandle)}"
        data-model="${escHtml(model.model)}"
        aria-label="${escHtml(brand)} ${escHtml(model.model)}"
        aria-pressed="${selected ? 'true' : 'false'}"
      >
        ${imgHtml}
        <div class="sm-device-card__brand">${escHtml(brand)}</div>
        <div class="sm-device-card__model">${escHtml(model.model)}</div>
      </button>
    `;
  }

  function bindCardClicks() {
    deviceGrid.querySelectorAll('.sm-device-card').forEach((card) => {
      card.addEventListener('click', () => {
        const device = {
          handle: card.dataset.handle,
          brand: card.dataset.brand,
          brandHandle: card.dataset.brandHandle,
          model: card.dataset.model,
        };
        selectDevice(device);
      });
    });
  }

  // ── Device selection & filtering ──────────────────────────────────────────
  function selectDevice(device) {
    saveDevice(device);
    closeModal();
    renderBanner();
    filterProducts(device.handle);
    renderCategoryTabs();

    // Auto-redirect if on a category tab and device changed
    const urlParams = new URLSearchParams(window.location.search);
    const smDevice = urlParams.get('sm_device');
    if (smDevice && smDevice !== device.handle) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('sm_device', device.handle);
      window.history.replaceState({}, '', newUrl.toString());
    }
  }

  // Filter products using the Storefront API
  async function filterProducts(deviceHandle) {
    if (!config.storefrontToken || !config.collection) {
      filterProductsClientSide(deviceHandle);
      return;
    }

    try {
      const tag = `device:${deviceHandle}`;
      const query = `
        {
          collection(handle: ${JSON.stringify(config.collection)}) {
            products(first: 250, query: ${JSON.stringify(`tag:${tag}`)}) {
              nodes {
                handle
              }
            }
          }
        }
      `;

      const res = await fetch(
        `https://${config.shop}/api/${STOREFRONT_API_VERSION}/graphql.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': config.storefrontToken,
          },
          body: JSON.stringify({ query }),
        }
      );

      const json = await res.json();
      const compatibleHandles = new Set(
        (json?.data?.collection?.products?.nodes || []).map((p) => p.handle)
      );

      applyProductFilter(compatibleHandles);
    } catch (_) {
      // Fallback to tag-based client-side filtering
      filterProductsClientSide(deviceHandle);
    }
  }

  function filterProductsClientSide(deviceHandle) {
    // Look for data-device-handles or data-tags attributes on product cards
    const tag = `device:${deviceHandle}`;
    const compatibleHandles = new Set();

    document.querySelectorAll(getProductSelectors()).forEach((card) => {
      const tags = (card.dataset.tags || card.dataset.deviceHandles || '').split(',');
      if (tags.some((t) => t.trim() === tag || t.trim() === deviceHandle)) {
        const handle = card.dataset.productHandle || card.dataset.handle;
        if (handle) compatibleHandles.add(handle);
      }
    });

    applyProductFilter(compatibleHandles);
  }

  function applyProductFilter(compatibleHandles) {
    let visibleCount = 0;

    document.querySelectorAll(getProductSelectors()).forEach((card) => {
      const handle =
        card.dataset.productHandle ||
        card.dataset.handle ||
        card.getAttribute('data-product-handle');

      if (!handle) return;

      if (compatibleHandles.size === 0 || compatibleHandles.has(handle)) {
        card.classList.remove('sm-product-hidden');
        visibleCount++;
      } else {
        card.classList.add('sm-product-hidden');
      }
    });

    // Show "no products" message if nothing matches
    updateNoProductsMessage(visibleCount, compatibleHandles.size);
  }

  function restoreAllProducts() {
    document.querySelectorAll('.sm-product-hidden').forEach((el) => {
      el.classList.remove('sm-product-hidden');
    });
    removeNoProductsMessage();
  }

  function getProductSelectors() {
    // Try multiple common theme selectors
    return config.productSelector
      .split(',')
      .map((s) => s.trim())
      .join(', ');
  }

  function updateNoProductsMessage(visible, total) {
    removeNoProductsMessage();
    if (visible === 0) {
      const msg = document.createElement('p');
      msg.id = 'sm-no-products-msg';
      msg.className = 'sm-no-results';
      msg.style.cssText = 'margin-top: 24px; width: 100%;';
      msg.textContent = t('noProducts');
      root.insertAdjacentElement('afterend', msg);
    }
  }

  function removeNoProductsMessage() {
    const msg = document.getElementById('sm-no-products-msg');
    if (msg) msg.remove();
  }

  // ── Auto-apply from URL param ─────────────────────────────────────────────
  (function checkUrlParam() {
    const urlParams = new URLSearchParams(window.location.search);
    const smDevice = urlParams.get('sm_device');
    if (smDevice && !selectedDevice) {
      // Find the device in catalog — will be resolved once catalog loads
      window.__SM_PENDING_DEVICE__ = smDevice;
    }
  })();

  // ── Utility ───────────────────────────────────────────────────────────────
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

})();
