(function () {
  const config = window.SKY_WATERS_BACKEND;
  const setupNotice = document.getElementById('setup-notice');
  const loginPanel = document.getElementById('login-panel');
  const editorPanel = document.getElementById('editor-panel');
  const loginForm = document.getElementById('login-form');
  const contentForm = document.getElementById('content-form');
  const fieldsContainer = document.getElementById('content-fields');
  const status = document.getElementById('admin-status');
  const saveButton = document.getElementById('save-content');
  const sessionKey = 'sky-waters-admin-session';
  const storageBucket = 'site-images';
  let baseUrl = '';
  let contentFields = [];
  let values = {};

  function setStatus(message, kind) {
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

  async function authenticatedRequest(path, options) {
    let session = await getSession();
    if (!session) throw new Error('Your session has expired. Sign in again.');
    try {
      return await request(path, options, session.access_token);
    } catch (error) {
      if (!/401|unauthorized|JWT/i.test(error.message)) throw error;
      session = await refreshSession(session);
      return request(path, options, session.access_token);
    }
  }

  function fieldLabel(key) {
    return key.split('.').slice(1).join(' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, letter => letter.toUpperCase());
  }

  function fieldGroup(key) {
    return key.split('.')[0];
  }

  function validateValue(field, value) {
    if (field.type === 'href'
      && (/[\u0000-\u001f"'<>\\]/.test(value) || !/^(https?:\/\/|mailto:|tel:|#|\/(?!\/))/i.test(value))) {
      throw new Error(`${fieldLabel(field.key)} must use a safe https, mailto, tel, or local link.`);
    }
    if ((field.type === 'image' || field.type === 'background')
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

  function createInput(field) {
    const label = document.createElement('label');
    label.className = field.type === 'image' ? 'image-field' : '';
    label.htmlFor = `cms-${field.key.replace(/[^a-z0-9_-]/gi, '-')}`;
    const title = document.createElement('span');
    title.textContent = fieldLabel(field.key);
    label.appendChild(title);

    if (field.type === 'image' || field.type === 'background') {
      const input = document.createElement('input');
      input.id = label.htmlFor;
      input.type = 'text';
      input.value = values[field.key];
      input.placeholder = 'Image URL or upload an image';
      input.autocomplete = 'url';
      input.required = true;
      label.appendChild(input);

      const actions = document.createElement('div');
      actions.className = 'image-actions';
      const upload = document.createElement('input');
      upload.type = 'file';
      upload.accept = 'image/jpeg,image/png,image/webp,image/gif';
      upload.setAttribute('aria-label', `Upload ${fieldLabel(field.key)}`);
      const preview = document.createElement('img');
      preview.className = 'image-preview';
      preview.alt = `Preview: ${fieldLabel(field.key)}`;
      preview.hidden = !input.value;
      if (input.value) preview.src = input.value;

      input.addEventListener('input', () => {
        preview.src = input.value;
        preview.hidden = !input.value;
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
      label.append(actions, preview);
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
    label.appendChild(input);
    return label;
  }

  function renderFields(fields, savedContent) {
    values = {};
    contentFields = fields;
    fields.forEach(field => {
      const saved = savedContent && savedContent[field.key];
      values[field.key] = typeof saved === 'string' ? saved : field.value;
    });
    fieldsContainer.replaceChildren();

    const groups = new Map();
    fields.forEach(field => {
      const group = fieldGroup(field.key);
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(field);
    });

    [...groups.entries()].forEach(([group, groupFields], index) => {
      const details = document.createElement('details');
      details.className = 'content-group';
      details.open = index === 0;
      const summary = document.createElement('summary');
      summary.textContent = group.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, letter => letter.toUpperCase());
      const list = document.createElement('div');
      list.className = 'field-list';
      groupFields.forEach(field => list.appendChild(createInput(field)));
      details.append(summary, list);
      fieldsContainer.appendChild(details);
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

  async function loadEditor() {
    setStatus('Loading editor…');
    const session = await getSession();
    if (!session) throw new Error('Your session has expired. Sign in again.');
    const isAdmin = await authenticatedRequest('/rest/v1/rpc/is_site_admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    if (isAdmin !== true) throw new Error('This Supabase account is not authorized to manage this site.');
    const response = await fetch('index.html');
    if (!response.ok) throw new Error(`Could not load site content fields (${response.status}).`);
    const source = new DOMParser().parseFromString(await response.text(), 'text/html');
    const fields = collectFields(source);
    if (fields.length === 0) throw new Error('No editable content fields were found in index.html.');
    const rows = await authenticatedRequest('/rest/v1/site_content?id=eq.main&select=content');
    renderFields(fields, rows.length ? rows[0].content : {});
    loginPanel.hidden = true;
    editorPanel.hidden = false;
    setStatus(`Loaded ${fields.length} editable fields.`, 'success');
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

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = loginForm.querySelector('button[type="submit"]');
    const formData = new FormData(loginForm);
    submit.disabled = true;
    setStatus('Signing in…');
    try {
      await signIn(formData.get('email').trim(), formData.get('password'));
      await loadEditor();
      loginForm.reset();
    } catch (error) {
      clearSession();
      setStatus(`Sign-in failed: ${error.message}`, 'error');
    } finally {
      submit.disabled = false;
    }
  });

  contentForm.addEventListener('submit', async event => {
    event.preventDefault();
    saveButton.disabled = true;
    setStatus('Saving changes…');
    try {
      const content = {};
      contentForm.querySelectorAll('[data-cms-key]').forEach(input => {
        content[input.dataset.cmsKey] = input.value.trim();
      });
      contentFields.forEach(field => validateValue(field, content[field.key]));
      await authenticatedRequest('/rest/v1/site_content?on_conflict=id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify({ id: 'main', content })
      });
      setStatus('Changes saved and published. Refresh the website to see them.', 'success');
    } catch (error) {
      setStatus(`Could not save content: ${error.message}`, 'error');
    } finally {
      saveButton.disabled = false;
    }
  });

  document.getElementById('sign-out').addEventListener('click', async () => {
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
      editorPanel.hidden = true;
      loginPanel.hidden = false;
      if (signOutError) {
        setStatus(`Signed out on this device, but server sign-out failed: ${signOutError.message}`, 'error');
      } else {
        setStatus('Signed out.');
      }
    }
  });

  if (!configured()) {
    setupNotice.hidden = false;
    return;
  }

  baseUrl = config.supabaseUrl.replace(/\/+$/, '');
  const existingSession = readSession();
  if (existingSession) {
    loginPanel.hidden = false;
    getSession()
      .then(session => session && loadEditor())
      .catch(error => {
        clearSession();
        setStatus(error.message, 'error');
      });
  } else {
    loginPanel.hidden = false;
  }
})();
