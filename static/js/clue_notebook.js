(function () {
  function isTyping(event) {
    const target = event.target || document.activeElement;
    return target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    );
  }

  window.createClueNotebook = function (options) {
    const clues = options.clues.map(clue => ({ ...clue, found: false }));
    let open = false;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'clue-notebook-btn';
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-expanded', 'false');
    button.title = 'Abrir bitácora (Q)';

    const label = document.createElement('span');
    label.textContent = '📓 BITÁCORA';
    const count = document.createElement('span');
    count.className = 'clue-notebook-count';
    button.append(label, count);

    const overlay = document.createElement('div');
    overlay.className = 'clue-notebook-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    const card = document.createElement('section');
    card.className = 'clue-notebook-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-label', options.title);

    const bar = document.createElement('div');
    bar.className = 'clue-notebook-bar';
    const title = document.createElement('span');
    title.className = 'clue-notebook-title';
    title.textContent = options.title;
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'clue-notebook-close';
    close.textContent = 'CERRAR [Esc]';
    bar.append(title, close);

    const intro = document.createElement('p');
    intro.className = 'clue-notebook-intro';
    intro.textContent = options.intro;
    const list = document.createElement('div');
    card.append(bar, intro, list);
    overlay.append(card);
    document.body.append(button, overlay);

    function render() {
      const found = clues.filter(clue => clue.found).length;
      count.textContent = `${found}/${clues.length}`;
      list.replaceChildren();

      for (const clue of clues) {
        const entry = document.createElement('article');
        entry.className = `clue-notebook-entry ${clue.found ? 'found' : 'locked'}`;
        const head = document.createElement('div');
        head.className = 'clue-notebook-entry-head';
        const icon = document.createElement('span');
        icon.className = 'clue-notebook-icon';
        icon.textContent = clue.found ? (clue.icon || '◆') : '🔒';
        const heading = document.createElement('span');
        heading.className = 'clue-notebook-entry-title';
        heading.textContent = clue.found ? clue.title : 'Pista por descubrir';
        head.append(icon, heading);
        const body = document.createElement('div');
        body.className = 'clue-notebook-body';
        body.textContent = clue.found ? clue.body : options.lockedText;
        entry.append(head, body);
        if (clue.found && clue.source) {
          const source = document.createElement('div');
          source.className = 'clue-notebook-source';
          source.textContent = `✔ ${clue.source}`;
          entry.append(source);
        }
        list.append(entry);
      }
    }

    function setOpen(nextOpen) {
      if (nextOpen && options.isBlocked && options.isBlocked()) return;
      if (open === nextOpen) return;
      open = nextOpen;
      overlay.classList.toggle('show', open);
      overlay.setAttribute('aria-hidden', String(!open));
      button.setAttribute('aria-expanded', String(open));
      if (options.onToggle) options.onToggle(open);
      if (open) close.focus();
      else button.focus();
    }

    button.addEventListener('click', () => setOpen(!open));
    close.addEventListener('click', () => setOpen(false));
    overlay.addEventListener('click', event => {
      if (event.target === overlay) setOpen(false);
    });
    window.addEventListener('keydown', event => {
      if (isTyping(event) || (options.isBlocked && options.isBlocked())) return;
      if (event.key.toLowerCase() === 'q') {
        event.preventDefault();
        setOpen(!open);
      } else if (event.key === 'Escape' && open) {
        setOpen(false);
      }
    });

    render();
    return {
      unlock(id) {
        const clue = clues.find(item => item.id === id);
        if (!clue || clue.found) return false;
        clue.found = true;
        render();
        button.classList.remove('flash');
        void button.offsetWidth;
        button.classList.add('flash');
        return true;
      },
      isOpen() {
        return open;
      },
    };
  };
})();
