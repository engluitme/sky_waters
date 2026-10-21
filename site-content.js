(function () {
  const config = window.SKY_WATERS_BACKEND;
  if (!config || !config.supabaseUrl || !config.supabaseAnonKey) return;

  const baseUrl = config.supabaseUrl.replace(/\/+$/, '');

  function setText(element, value) {
    if (element instanceof HTMLMetaElement) {
      element.content = value;
    } else {
      element.textContent = value;
    }
  }

  function safeLink(value) {
    const trimmed = value.trim();
    if (!/[\u0000-\u001f"'<>\\]/.test(trimmed) && /^(https?:\/\/|mailto:|tel:|#|\/(?!\/))/i.test(trimmed)) {
      return trimmed;
    }
    throw new Error(`Rejected unsupported link URL: ${trimmed}`);
  }

  function safeImage(value) {
    const trimmed = value.trim();
    if (!/[\u0000-\u0020"'<>\\]/.test(trimmed)
      && (/^https:\/\//i.test(trimmed) || /^(?!\/\/|[a-z]+:)/i.test(trimmed))) {
      return trimmed;
    }
    throw new Error(`Rejected unsupported image URL: ${trimmed}`);
  }

  function setSafeAttribute(element, attribute, value, validator, key) {
    try {
      element.setAttribute(attribute, validator(value));
    } catch (error) {
      console.error(`Could not apply saved ${key} content. The built-in value is unchanged.`, error);
    }
  }

  function applyContent(content) {
    document.querySelectorAll('[data-cms-text]').forEach(element => {
      const key = element.dataset.cmsText;
      if (typeof content[key] === 'string') setText(element, content[key]);
    });

    document.querySelectorAll('[data-cms-href]').forEach(element => {
      const key = element.dataset.cmsHref;
      const value = content[key];
      if (typeof value === 'string') setSafeAttribute(element, 'href', value, safeLink, key);
    });

    document.querySelectorAll('[data-cms-image]').forEach(element => {
      const key = element.dataset.cmsImage;
      const value = content[key];
      if (typeof value === 'string') setSafeAttribute(element, 'src', value, safeImage, key);
    });

    document.querySelectorAll('[data-cms-background]').forEach(element => {
      const key = element.dataset.cmsBackground;
      const value = content[key];
      if (typeof value !== 'string') return;
      try {
        element.style.setProperty('--hero-background-image', `url("${safeImage(value)}")`);
      } catch (error) {
        console.error(`Could not apply saved ${key} content. The built-in value is unchanged.`, error);
      }
    });

    document.querySelectorAll('[data-cms-alt]').forEach(element => {
      const value = content[element.dataset.cmsAlt];
      if (typeof value === 'string') element.setAttribute('alt', value);
    });

    document.querySelectorAll('[data-cms-label]').forEach(element => {
      const value = content[element.dataset.cmsLabel];
      if (typeof value === 'string') element.setAttribute('aria-label', value);
    });

    document.querySelectorAll('[data-cms-whatsapp-number]').forEach(element => {
      const key = element.dataset.cmsWhatsappNumber;
      const value = content[key];
      if (typeof value !== 'string') return;
      if (/^\+?[0-9]{7,15}$/.test(value)) {
        element.dataset.whatsappNumber = value.replace(/^\+/, '');
      } else {
        console.error(`Could not apply saved ${key} content. It must be an international phone number.`);
      }
    });

    document.querySelectorAll('[data-cms-list]').forEach(element => {
      const value = content[element.dataset.cmsList];
      if (typeof value !== 'string') return;
      const items = value.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
      element.replaceChildren(...items.map(text => {
        const item = document.createElement('li');
        item.textContent = text;
        return item;
      }));
    });
  }

  fetch(`${baseUrl}/rest/v1/site_content?id=eq.main&select=content`, {
    headers: {
      apikey: config.supabaseAnonKey,
      Accept: 'application/json'
    }
  })
    .then(response => {
      if (!response.ok) throw new Error(`Content request failed (${response.status})`);
      return response.json();
    })
    .then(rows => {
      if (rows.length > 0) applyContent(rows[0].content);
    })
    .catch(error => {
      console.error('Could not load saved Sky Waters content; showing the built-in site content.', error);
    });
})();
