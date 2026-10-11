// Script esterno e non inline: la Content-Security-Policy (script-src 'self') blocca gli script inline.
parent.postMessage(location.href, location.origin);
