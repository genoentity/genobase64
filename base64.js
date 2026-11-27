/* Reine Base64-Logik – läuft ausschließlich lokal, ohne Netzwerkzugriff. */
(function (root) {
  'use strict';

  const utf8Encoder = new TextEncoder();
  const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
  const CHUNK = 0x8000;

  function toBinary(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    return binary;
  }

  function toBytes(binary) {
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function normalize(input) {
    const clean = input.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) throw new Error('Ungültige Base64-Zeichen.');
    if (clean.length % 4 === 1) throw new Error('Ungültige Base64-Länge.');
    return clean + '='.repeat((4 - (clean.length % 4)) % 4);
  }

  function encode(text, options) {
    const urlSafe = !!(options && options.urlSafe);
    let result = btoa(toBinary(utf8Encoder.encode(text)));
    if (urlSafe) result = result.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return result;
  }

  function decode(input) {
    const binary = atob(normalize(input));
    try {
      return utf8Decoder.decode(toBytes(binary));
    } catch (error) {
      throw new Error('Kein gültiger UTF-8-Text.');
    }
  }

  /* Heuristik: Base64-artige Struktur + lesbarer UTF-8-Text spricht für Dekodierung. */
  function isPlausibleText(text) {
    if (!text.trim()) return false;
    for (const char of text) {
      const cp = char.codePointAt(0);
      if (cp === 9 || cp === 10 || cp === 13) continue;
      if (cp < 32 || (cp >= 127 && cp < 160) || cp === 0xfffd) return false;
    }
    return true;
  }

  function looksLikeBase64(input) {
    const clean = input.replace(/\s+/g, '');
    if (clean.length < 4 || clean.length % 4 === 1) return false;
    if (!/^[A-Za-z0-9+/\-_]+={0,2}$/.test(clean)) return false;
    try {
      return isPlausibleText(decode(clean));
    } catch (error) {
      return false;
    }
  }

  function detectDirection(input, mode) {
    if (mode === 'encode') return 'encode';
    if (mode === 'decode') return 'decode';
    return looksLikeBase64(input) ? 'decode' : 'encode';
  }

  function convert(input, mode, options) {
    const value = input == null ? '' : String(input);
    if (!value.trim()) return { empty: true, direction: null, output: '', error: null };

    const direction = detectDirection(value, mode);
    try {
      const output = direction === 'decode' ? decode(value) : encode(value, options);
      return { empty: false, direction, output, error: null };
    } catch (error) {
      return { empty: false, direction, output: '', error: error.message || 'Umwandlung fehlgeschlagen.' };
    }
  }

  const api = { encode, decode, detectDirection, looksLikeBase64, convert };
  root.NeonB64 = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
