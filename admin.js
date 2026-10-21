(function () {
  const config = window.SKY_WATERS_BACKEND;
  const pageType = document.body.dataset.adminPage;
  const currentSection = document.body.dataset.section || '';
  const setupNotice = document.getElementById('setup-notice');
  const loginPanel = document.getElementById('login-panel');
  const adminPanel = document.getElementById('admin-panel');
  const loginForm = document.getElementById('login-form');
  const contentForm = document.getElementById('content-form');
  const fieldsContainer = document.getElementById('content-fields');
  const adminNav = document.getElementById('admin-nav');
  const sectionCards = document.getElementById('section-cards');
  const sectionTitle = document.getElementById('section-title');
  const sectionDescription = document.getElementById('section-description');
  const status = document.getElementById('admin-status');
  const saveButton = document.getElementById('save-content');
  const signOutButton = document.getElementById('sign-out');
  const sessionKey = 'sky-waters-admin-session';
  const storageBucket = 'site-images';
  let baseUrl = '';
  let contentFields = [];
  let values = {};
  const pendingImageDeletes = new Set();

  function setStatus(message, kind) {
    if (!status) return;
    status.textContent = message;
    status.dataset.kind = kind || '';
  }

  function configured() {
    return config && config.supabaseUrl && config.supabaseAnonKey;
  }

  function readSession() {
    try {
      return JSON.parse(sessionStorage.getItem(sessionKey) || 'null');
    } catch (error) {
      sessionStorage.removeItem(sessionKey);
      return null;
    }
  }

  function writeSession(session) {
    sessionStorage.setItem(sessionKey, JSON.stringify(session));
  }

  function clearSession() {
    sessionStorage.removeItem(sessionKey);
  }

  function authHeaders(token) {
    const headers = { apikey: config.supabaseAnonKey };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  function responseMessage(response, body) {
    if (body && typeof body === 'object') {
      return body.msg || body.message || body.error_description || body.error || `Request failed (${response.status})`;
    }
    return body || `Request failed (${response.status})`;
  }

  async function request(path, options, token) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        ...authHeaders(token),
        ...(options && options.headers)
      }
    });
    const text = await response.text();
    let body = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }
    if (!response.ok) throw new Error(responseMessage(response, body));
    return body;
  }

  async function refreshSession(session) {
    if (!session || !session.refresh_token) {
      clearSession();
      throw new Error('Your session has expired. Sign in again.');
    }
    try {
      const refreshed = await request('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: session.refresh_token })
      });
      const nextSession = {
        ...refreshed,
        expires_at: Date.now() + refreshed.expires_in * 1000
      };
      writeSession(nextSession);
      return nextSession;
    } catch (error) {
      clearSession();
      throw new Error(`Your session could not be refreshed. Sign in again. ${error.message}`);
    }
  }

  async function getSession() {
    const session = readSession();
    if (!session || !session.access_token) return null;
    if (session.expires_at && session.expires_at > Date.now() + 60000) return session;
    return refreshSession(session);
  }

  async function authenticatedRequest(path, options, session) {
    session = session || await getSession();
    if (!session) throw new Error('Your session has expired. Sign in again.');
    try {
      return await request(path, options, session.access_token);
    } catch (error) {
      if (!/401|unauthorized|JWT/i.test(error.message)) throw error;
      session = await refreshSession(session);
      return request(path, options, session.access_token);
    }
  }

  const sectionDefinitions = [
    { id: 'hero', file: 'home.html', title: 'Home page', navTitle: 'Home', description: 'Update the main message, buttons, and photos visitors see first.', prefixes: ['hero.'] },
    { id: 'borehole', file: 'borehole.html', title: 'Borehole drilling', description: 'Manage the borehole drilling service details and photos.', prefixes: ['services.borehole.'] },
    { id: 'auto', file: 'auto-care.html', title: 'Auto care', description: 'Manage the vehicle servicing and auto care information.', prefixes: ['services.auto.'] },
    { id: 'general', file: 'general-services.html', title: 'General services', description: 'Manage the general services information and photos.', prefixes: ['services.general.'] },
    { id: 'about', file: 'about.html', title: 'About & expertise', description: 'Edit the company introduction, service overview, and borehole expertise.', prefixes: ['about.', 'divisions.', 'expertise.'] },
    { id: 'work', file: 'work.html', title: 'Our work & team', description: 'Update project photos, gallery details, and the team section.', prefixes: ['work.', 'team.'] },
    { id: 'process', file: 'process.html', title: 'Process & FAQs', description: 'Edit the steps in your process and answers to common questions.', prefixes: ['process.', 'faq.'] },
    { id: 'contact', file: 'contact.html', title: 'Contact & social links', description: 'Update contact details, quote form, footer, and social media links.', prefixes: ['contact.', 'footer.', 'social.'] },
    { id: 'site', file: 'site-details.html', title: 'Site details & navigation', description: 'Manage your business name, page description, and navigation links.', prefixes: ['site.', 'meta.', 'nav.'] }
  ];

  function sectionFor(key) {
    return sectionDefinitions.find(section => section.prefixes.some(prefix => key.startsWith(prefix)));
  }

  function subsectionFor(field) {
    const parts = field.key.split('.');
    const area = parts[0];
    const name = parts[1] || '';

    if (area === 'services') {
      return ({
        borehole: 'Borehole drilling',
        auto: 'Auto care',
        general: 'General services'
      })[name] || 'Other services';
    }
    if (area === 'site') return 'Business name & tagline';
    if (area === 'meta') return 'Page title & description';
    if (area === 'nav') return 'Menu & main button';
    if (area === 'hero') {
      if (field.type === 'image' || field.type === 'alt') return 'Home page photos';
      if (field.type === 'background') return 'Background photo';
      return 'Main message & buttons';
    }
    if (area === 'about' || area === 'divisions' || area === 'expertise') {
      return ({
        about: 'About us',
        divisions: 'Services introduction',
        expertise: 'Borehole expertise'
      })[area];
    }
    if (area === 'work') return 'Our work gallery';
    if (area === 'team') return 'Team section';
    if (area === 'process') return 'Our process';
    if (area === 'faq') return 'Frequently asked questions';
    if (area === 'contact') {
      return /^(name|phone|email|service|message|submit|form)/i.test(name)
        ? 'Quote form'
        : 'Contact details';
    }
    if (area === 'social') return 'Social media links';
    if (area === 'footer') return 'Footer details & links';
    return 'Other settings';
  }

  function fieldLabel(key, type) {
    const name = key.split('.').slice(1).join('.');
    const specialLabels = {
      backgroundImage: 'Background photo',
      whatsappNumber: 'WhatsApp number',
      linkHref: 'Button link',
      linkText: 'Button text',
      galleryLabel: 'Photo gallery label',
      copyright: 'Copyright message',
      image: 'Photo',
      imageAlt: 'Photo description'
    };

    if (specialLabels[name]) return specialLabels[name];
    const photo = name.match(/^image(\d+)(Alt)?$/i);
    if (photo) return photo[2] ? `Photo ${photo[1]} description` : `Photo ${photo[1]}`;
    const item = name.match(/^item(\d+)(Title|Description)$/i);
    if (item) return `Service ${item[1]} ${item[2].toLowerCase()}`;
    const step = name.match(/^step(\d+)(Title|Description)$/i);
    if (step) return `Step ${step[1]} ${step[2].toLowerCase()}`;

    const label = name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[._]/g, ' ');
    return label ? label.charAt(0).toUpperCase() + label.slice(1) : type;
  }

  function isMajorField(field) {
    if (field.type === 'image' || field.type === 'background' || field.type === 'list' || field.type === 'phone') {
      return true;
    }
    const name = field.key.split('.').slice(1).join('.');
    if (/^(?:title|description|headlineTop|headlineBottom|primaryText|secondaryText|linkText|tagline|brandFirst|brandMiddle|brandLast|location|email|whatsapp|phone|trustTitle|trustDescription)$/.test(name)) {
      return true;
    }
    if (/^(?:step\d+(?:Title|Description)|question\d+|answer\d+|item\d+(?:Title|Description))$/.test(name)) {
      return true;
    }
    return /^(?:hero\.(?:primaryHref|secondaryHref)|nav\.quoteHref|(?:services\.[^.]+|expertise)\.linkHref|contact\.(?:emailHref|phoneHref|whatsappHref)|social\.(?:facebook|instagram))$/.test(field.key);
  }

  function validateValue(field, value) {
    if (field.type === 'href'
      && (/[\u0000-\u001f"'<>\\]/.test(value) || !/^(https?:\/\/|mailto:|tel:|#|\/(?!\/))/i.test(value))) {
      throw new Error(`${fieldLabel(field.key)} must use a safe https, mailto, tel, or local link.`);
    }
    if ((field.type === 'image' || field.type === 'background')
      && value !== ''
      && (/[\u0000-\u0020"'<>\\]/.test(value)
        || !(/^https:\/\//i.test(value) || /^(?!\/\/|[a-z]+:)[^\s"'<>\\]+$/i.test(value)))) {
      throw new Error(`${fieldLabel(field.key)} must be an https URL or a local image path.`);
    }
    if (field.type === 'phone' && !/^\+?[0-9]{7,15}$/.test(value)) {
      throw new Error(`${fieldLabel(field.key)} must be an international phone number with 7 to 15 digits.`);
    }
    if ((field.type === 'text' || field.type === 'alt' || field.type === 'label')
      && /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) {
      throw new Error(`${fieldLabel(field.key)} contains unsupported control characters.`);
    }
  }

  function fieldValue(element, type) {
    if (type === 'list') {
      return [...element.children].map(item => item.textContent.trim()).join('\n');
    }
    if (type === 'text') {
      if (element instanceof HTMLMetaElement) return element.content;
      return element.textContent.trim();
    }
    if (type === 'background') return element.dataset.cmsBackgroundDefault || '';
    if (type === 'phone') return element.dataset.cmsWhatsappDefault || '';
    const attribute = type === 'image' ? 'src'
      : type === 'alt' ? 'alt'
      : type === 'label' ? 'aria-label'
      : 'href';
    return element.getAttribute(attribute) || '';
  }

  function collectFields(documentToScan) {
    const fields = new Map();
    const add = (key, type, element) => {
      if (!key) return;
      const value = fieldValue(element, type);
      const existing = fields.get(key);
      if (existing && (existing.type !== type || existing.value !== value)) {
        throw new Error(`The editable field "${key}" is assigned more than once with different values.`);
      }
      if (!existing) fields.set(key, { key, type, value });
    };

    documentToScan.querySelectorAll('[data-cms-text]').forEach(element => {
      add(element.dataset.cmsText, 'text', element);
    });
    documentToScan.querySelectorAll('[data-cms-href]').forEach(element => {
      add(element.dataset.cmsHref, 'href', element);
    });
    documentToScan.querySelectorAll('[data-cms-image]').forEach(element => {
      add(element.dataset.cmsImage, 'image', element);
    });
    documentToScan.querySelectorAll('[data-cms-background]').forEach(element => {
      add(element.dataset.cmsBackground, 'background', element);
    });
    documentToScan.querySelectorAll('[data-cms-whatsapp-number]').forEach(element => {
      add(element.dataset.cmsWhatsappNumber, 'phone', element);
    });
    documentToScan.querySelectorAll('[data-cms-alt]').forEach(element => {
      add(element.dataset.cmsAlt, 'alt', element);
    });
    documentToScan.querySelectorAll('[data-cms-label]').forEach(element => {
      add(element.dataset.cmsLabel, 'label', element);
    });
    documentToScan.querySelectorAll('[data-cms-list]').forEach(element => {
      add(element.dataset.cmsList, 'list', element);
    });
    return [...fields.values()].sort((a, b) => a.key.localeCompare(b.key));
  }

  function fieldIcon(type) {
    const paths = {
      image: 'M4 5h16v14H4z M8 14l3-3 5 5 M14 13l2-2 3 3 M9 9h.01',
      background: 'M4 5h16v14H4z M8 14l3-3 5 5 M14 13l2-2 3 3',
      href: 'M10 13a5 5 0 0 0 7.07 0l3-3A5 5 0 0 0 13 2.93l-1.72 1.72 M14 11a5 5 0 0 0-7.07 0l-3 3A5 5 0 0 0 11 21.07l1.72-1.72',
      phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72l.45 3.1a2 2 0 0 1-.57 1.7L7.2 10.3a16 16 0 0 0 6 6l1.78-1.79a2 2 0 0 1 1.7-.57l3.1.45a2 2 0 0 1 1.72 2.53',
      list: 'M9 6h11 M9 12h11 M9 18h11 M4 6h.01 M4 12h.01 M4 18h.01',
      alt: 'M4 5h16v14H4z M8 14l3-3 5 5 M14 13l2-2 3 3',
      label: 'M20.59 13.41 11 3.83V3H4v7h.83l9.58 9.59a2 2 0 0 0 2.83 0l3.35-3.35a2 2 0 0 0 0-2.83z M7 7h.01',
      text: 'M4 7V4h16v3 M9 20h6 M12 4v16'
    };
    const svgNamespace = 'http://www.w3.org/2000/svg';
    const icon = document.createElementNS(svgNamespace, 'svg');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('fill', 'none');
    icon.setAttribute('stroke', 'currentColor');
    icon.setAttribute('stroke-width', '1.7');
    icon.setAttribute('stroke-linecap', 'round');
    icon.setAttribute('stroke-linejoin', 'round');
    icon.setAttribute('aria-hidden', 'true');
    icon.classList.add('field-icon');
    const path = document.createElementNS(svgNamespace, 'path');
    path.setAttribute('d', paths[type] || paths.text);
    icon.appendChild(path);
    return icon;
  }

  function createInput(field) {
    const label = document.createElement('label');
    label.className = `editor-field${field.type === 'image' || field.type === 'background' ? ' image-field' : ''}`;
    label.htmlFor = `cms-${field.key.replace(/[^a-z0-9_-]/gi, '-')}`;
    const heading = document.createElement('span');
    heading.className = 'editor-field-name';
    heading.appendChild(fieldIcon(field.type));
    const title = document.createElement('span');
    title.textContent = fieldLabel(field.key, field.type);
    heading.appendChild(title);
    label.appendChild(heading);
    const control = document.createElement('span');
    control.className = 'editor-field-control';

    if (field.type === 'image' || field.type === 'background') {
      const input = document.createElement('input');
      input.id = label.htmlFor;
      input.type = 'text';
      input.value = values[field.key];
      input.placeholder = 'Image URL or upload an image';
      input.autocomplete = 'url';
      control.appendChild(input);

      const actions = document.createElement('div');
      actions.className = 'image-actions';
      const upload = document.createElement('input');
      upload.type = 'file';
      upload.accept = 'image/jpeg,image/png,image/webp,image/gif';
      upload.setAttribute('aria-label', `Upload ${fieldLabel(field.key, field.type)}`);
      const preview = document.createElement('img');
      preview.className = 'image-preview';
      preview.alt = `Preview: ${fieldLabel(field.key, field.type)}`;
      preview.hidden = !input.value;
      if (input.value) preview.src = input.value;

      input.addEventListener('input', () => {
        if (input.value) {
          preview.src = input.value;
          preview.hidden = false;
        } else {
          preview.removeAttribute('src');
          preview.hidden = true;
        }
      });

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'secondary remove-photo';
      remove.textContent = field.type === 'background' ? 'Remove background photo' : 'Remove photo';
      remove.setAttribute('aria-label', `${remove.textContent}: ${fieldLabel(field.key, field.type)}`);
      remove.addEventListener('click', () => {
        if (input.value) pendingImageDeletes.add(input.value);
        input.value = '';
        preview.removeAttribute('src');
        preview.hidden = true;
        setStatus('Photo and its uploaded file will be removed when you save this page.', 'success');
      });

      upload.addEventListener('change', async () => {
        const file = upload.files && upload.files[0];
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
          upload.value = '';
          setStatus('Choose a JPEG, PNG, WebP, or GIF image.', 'error');
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          upload.value = '';
          setStatus('Images must be 5 MB or smaller.', 'error');
          return;
        }
        upload.disabled = true;
        setStatus(`Uploading ${file.name}…`);
        try {
          const url = await uploadImage(file);
          input.value = url;
          preview.src = url;
          preview.hidden = false;
          setStatus(`${file.name} uploaded. Save and publish to use it on the site.`, 'success');
        } catch (error) {
          setStatus(`Image upload failed: ${error.message}`, 'error');
        } finally {
          upload.disabled = false;
          upload.value = '';
        }
      });
      actions.appendChild(upload);
      actions.appendChild(remove);
      const note = document.createElement('small');
      note.className = 'photo-note';
      note.textContent = 'Saving removes this photo from the site and deletes its admin-uploaded file from storage.';
      control.append(actions, preview, note);
      label.appendChild(control);
      input.dataset.cmsKey = field.key;
      return label;
    }

    let input;
    if (field.type === 'href' || field.type === 'phone') {
      input = document.createElement('input');
      input.type = field.type === 'phone' ? 'tel' : 'text';
      input.placeholder = field.type === 'phone' ? 'International format, for example 263713041100' : 'Link (for example #contact or https://...)';
      input.required = true;
      if (field.type === 'phone') {
        input.pattern = '\\+?[0-9]{7,15}';
        input.title = 'Use an international number with 7 to 15 digits, optionally starting with +.';
      }
    } else {
      input = document.createElement('textarea');
      input.rows = field.type === 'list' ? Math.min(8, Math.max(3, values[field.key].split('\n').length)) : 3;
      if (field.type === 'list') input.placeholder = 'Enter one item per line';
    }
    input.id = label.htmlFor;
    input.value = values[field.key];
    input.dataset.cmsKey = field.key;
    control.appendChild(input);
    label.appendChild(control);
    return label;
  }

  function renderFields(fields, savedContent) {
    values = {};
    contentFields = fields;
    fields.forEach(field => {
      const saved = savedContent && savedContent[field.key];
      values[field.key] = typeof saved === 'string' ? saved : field.value;
    });
    const visibleFields = fields.filter(isMajorField);
    const sections = new Map();
    visibleFields.forEach(field => {
      const section = sectionFor(field.key);
      if (!section) throw new Error(`No admin section is configured for "${field.key}".`);
      if (!sections.has(section.id)) sections.set(section.id, new Map());
      const subsections = sections.get(section.id);
      const subsection = subsectionFor(field);
      if (!subsections.has(subsection)) subsections.set(subsection, []);
      subsections.get(subsection).push(field);
    });

    if (pageType === 'dashboard') {
      adminNav.replaceChildren();
      sectionCards.replaceChildren();
      const dashboardLink = document.createElement('a');
      dashboardLink.className = 'admin-nav-link';
      dashboardLink.href = 'dashboard.html';
      dashboardLink.textContent = 'Dashboard';
      dashboardLink.setAttribute('aria-current', 'page');
      adminNav.appendChild(dashboardLink);

      sectionDefinitions.forEach(section => {
        const subsections = sections.get(section.id);
        if (!subsections) return;
        const link = document.createElement('a');
        link.className = 'admin-nav-link';
        link.href = section.file;
        link.textContent = section.navTitle || section.title;
        adminNav.appendChild(link);

        const card = document.createElement('a');
        card.className = 'section-card';
        card.href = section.file;
        const title = document.createElement('h2');
        title.textContent = section.title;
        card.appendChild(title);
        sectionCards.appendChild(card);
      });
      return;
    }

    const selectedSection = sectionDefinitions.find(section => section.id === currentSection);
    if (!selectedSection) throw new Error(`No admin section matches "${currentSection}".`);
    sectionTitle.textContent = selectedSection.title;
    sectionDescription.textContent = `${selectedSection.description} Edit the main text, links, lists, and photos here.`;
    adminNav.replaceChildren();

    const dashboardLink = document.createElement('a');
    dashboardLink.className = 'admin-nav-link';
    dashboardLink.href = 'dashboard.html';
    dashboardLink.textContent = 'Dashboard';
    adminNav.appendChild(dashboardLink);

    sectionDefinitions.forEach(section => {
      const link = document.createElement('a');
      link.className = 'admin-nav-link';
      link.href = section.file;
      link.textContent = section.navTitle || section.title;
      if (section.id === currentSection) link.setAttribute('aria-current', 'page');
      adminNav.appendChild(link);
    });

    const subsections = sections.get(selectedSection.id);
    if (!subsections) throw new Error(`No editable fields are configured for "${selectedSection.title}".`);
    fieldsContainer.replaceChildren();
    [...subsections.entries()].forEach(([subsection, subsectionFields]) => {
      const group = document.createElement('section');
      group.className = 'field-subsection';
      if (subsections.size > 1) {
        const heading = document.createElement('h3');
        heading.textContent = subsection;
        group.appendChild(heading);
      }
      const list = document.createElement('div');
      list.className = 'field-list';
      subsectionFields.forEach(field => list.appendChild(createInput(field)));
      group.appendChild(list);
      fieldsContainer.appendChild(group);
    });
  }

  async function uploadImage(file) {
    const session = await getSession();
    if (!session) throw new Error('Sign in again before uploading.');
    const extensions = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif'
    };
    const objectPath = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${extensions[file.type]}`;
    const encodedPath = objectPath.split('/').map(encodeURIComponent).join('/');
    await authenticatedRequest(`/storage/v1/object/${storageBucket}/${encodedPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': file.type,
        'x-upsert': 'false'
      },
      body: file
    });
    return `${baseUrl}/storage/v1/object/public/${storageBucket}/${encodedPath}`;
  }

  function storageObjectPath(imageUrl) {
    let image;
    let project;
    try {
      image = new URL(imageUrl);
      project = new URL(baseUrl);
    } catch {
      return null;
    }
    const publicPrefix = `${project.pathname.replace(/\/+$/, '')}/storage/v1/object/public/${storageBucket}/`;
    if (image.origin !== project.origin || !image.pathname.startsWith(publicPrefix)) return null;
    const objectPath = image.pathname.slice(publicPrefix.length);
    if (!objectPath.startsWith('uploads/')) return null;
    try {
      const decodedPath = objectPath.split('/').map(decodeURIComponent);
      if (decodedPath.some(part => !part || part === '.' || part === '..')) return null;
      return decodedPath.map(encodeURIComponent).join('/');
    } catch {
      return null;
    }
  }

  async function deleteImage(imageUrl) {
    const objectPath = storageObjectPath(imageUrl);
    if (!objectPath) return false;
    await authenticatedRequest(`/storage/v1/object/${storageBucket}/${objectPath}`, { method: 'DELETE' });
    return true;
  }

  async function loadEditor(session) {
    setStatus('Loading editor…');
    if (!session) throw new Error('Your session has expired. Sign in again.');
    const [isAdmin, response] = await Promise.all([
      authenticatedRequest('/rest/v1/rpc/is_site_admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      }, session),
      fetch('index.html')
    ]);
    if (isAdmin !== true) throw new Error('This Supabase account is not authorized to manage this site.');
    if (!response.ok) throw new Error(`Could not load site content fields (${response.status}).`);
    const source = new DOMParser().parseFromString(await response.text(), 'text/html');
    const fields = collectFields(source);
    if (fields.length === 0) throw new Error('No editable content fields were found in index.html.');
    let savedContent = {};
    if (pageType !== 'dashboard') {
      const rows = await authenticatedRequest('/rest/v1/site_content?id=eq.main&select=content', undefined, session);
      savedContent = rows.length ? rows[0].content : {};
    }
    renderFields(fields, savedContent);
    setStatus(pageType === 'dashboard' ? 'Choose a page to manage.' : `Loaded ${fields.length} editable fields.`, 'success');
  }

  async function signIn(email, password) {
    const result = await request('/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    writeSession({
      ...result,
      expires_at: Date.now() + result.expires_in * 1000
    });
  }

  if (loginForm) loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = loginForm.querySelector('button[type="submit"]');
    const formData = new FormData(loginForm);
    submit.disabled = true;
    setStatus('Signing in…');
    try {
      await signIn(formData.get('email').trim(), formData.get('password'));
      window.location.href = 'dashboard.html';
    } catch (error) {
      clearSession();
      setStatus(`Sign-in failed: ${error.message}`, 'error');
    } finally {
      submit.disabled = false;
    }
  });

  if (contentForm) contentForm.addEventListener('submit', async event => {
    event.preventDefault();
    saveButton.disabled = true;
    setStatus('Saving changes…');
    try {
      const content = {};
      Object.assign(content, values);
      contentForm.querySelectorAll('[data-cms-key]').forEach(input => {
        content[input.dataset.cmsKey] = input.value.trim();
      });
      contentFields.forEach(field => {
        content[field.key] = content[field.key] ?? field.value;
        validateValue(field, content[field.key]);
      });
      const imagesToDelete = [...pendingImageDeletes].filter(imageUrl => !Object.values(content).includes(imageUrl));
      await authenticatedRequest('/rest/v1/site_content?on_conflict=id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify({ id: 'main', content })
      });
      const deletionErrors = [];
      for (const imageUrl of imagesToDelete) {
        try {
          await deleteImage(imageUrl);
          pendingImageDeletes.delete(imageUrl);
        } catch (error) {
          deletionErrors.push(error.message);
        }
      }
      if (deletionErrors.length) {
        setStatus(`Changes saved, but ${deletionErrors.length} image file(s) could not be deleted from Supabase Storage: ${deletionErrors.join('; ')}`, 'error');
      } else {
        imagesToDelete.forEach(imageUrl => pendingImageDeletes.delete(imageUrl));
        setStatus('Changes saved and published.', 'success');
      }
    } catch (error) {
      setStatus(`Could not save content: ${error.message}`, 'error');
    } finally {
      saveButton.disabled = false;
    }
  });

  if (signOutButton) signOutButton.addEventListener('click', async () => {
    const session = readSession();
    setStatus('Signing out…');
    let signOutError;
    try {
      if (session && session.access_token) {
        await request('/auth/v1/logout', { method: 'POST' }, session.access_token);
      }
    } catch (error) {
      signOutError = error;
    } finally {
      clearSession();
      window.location.href = `login.html${signOutError ? '?signedOut=1&serverError=' + encodeURIComponent(signOutError.message) : ''}`;
    }
  });

  if (!configured()) {
    if (setupNotice) setupNotice.hidden = false;
    return;
  }

  baseUrl = config.supabaseUrl.replace(/\/+$/, '');
  if (pageType === 'login') {
    loginPanel.hidden = false;
    const params = new URLSearchParams(window.location.search);
    if (params.has('error')) setStatus(params.get('error'), 'error');
    if (params.has('serverError')) setStatus(`Signed out here, but server sign-out failed: ${params.get('serverError')}`, 'error');
    if (params.has('signedOut') && !params.has('serverError')) setStatus('Signed out.');
    if (readSession()) window.location.replace('dashboard.html');
    return;
  }

  adminPanel.hidden = false;
  getSession()
    .then(session => {
      if (!session) {
        window.location.replace('login.html');
        return;
      }
      return loadEditor(session);
    })
    .catch(error => {
      clearSession();
      window.location.replace(`login.html?error=${encodeURIComponent(error.message)}`);
    });
})();
