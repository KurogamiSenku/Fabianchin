(() => {
  const SECRET_ACCESS_CODE = 'mamahuevo';

  function typingInField(event) {
    const target = event.target || document.activeElement;
    return target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    );
  }

  window.registerSecretAccessCode = function (onAccepted, isBlocked) {
    let buffer = '';

    window.addEventListener('keydown', event => {
      if (typingInField(event) || (isBlocked && isBlocked())) {
        buffer = '';
        return;
      }

      if (event.key.length !== 1 || !/^[a-z]$/i.test(event.key)) {
        buffer = '';
        return;
      }

      const candidate = buffer + event.key.toLowerCase();
      if (SECRET_ACCESS_CODE.startsWith(candidate)) {
        buffer = candidate;
      } else {
        buffer = '';
        for (let size = Math.min(candidate.length, SECRET_ACCESS_CODE.length - 1); size > 0; size--) {
          const suffix = candidate.slice(-size);
          if (SECRET_ACCESS_CODE.startsWith(suffix)) {
            buffer = suffix;
            break;
          }
        }
      }

      if (!buffer) return;
      event.preventDefault();
      event.stopImmediatePropagation();

      if (buffer === SECRET_ACCESS_CODE) {
        buffer = '';
        onAccepted();
      }
    }, true);
  };
})();
