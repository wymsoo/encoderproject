import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const ALPHABET = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', ' '];
const EMPTY_CODES = Object.fromEntries(ALPHABET.map((character) => [character, '']));
const STORAGE_KEY = 'code-garden-mapping';
const CUSTOM_MAPPING_KEY = 'code-garden-custom-mapping';
const ACTIVE_MAPPING_KEY = 'code-garden-active-mapping';
const SAVED_MESSAGES_KEY = 'code-garden-saved-messages';

function App() {
  const [usePreset, setUsePreset] = useState(true);
  const [codes, setCodes] = useState(EMPTY_CODES);
  const [encodedInput, setEncodedInput] = useState('013023023032123111023202');
  const [plainInput, setPlainInput] = useState('HELLO WORLD');
  const [result, setResult] = useState(null);
  const [logs, setLogs] = useState(['Connecting to the Python decoder...']);
  const [savedMessages, setSavedMessages] = useState([]);

  const applyCodes = (nextCodes, message) => {
    setCodes({ ...EMPTY_CODES, ...nextCodes });
    setUsePreset(false);
    setLogs([message]);
  };

  const loadPreset = async (enabled) => {
    setUsePreset(enabled);
    if (!enabled) {
      const savedCustomCodes = sessionStorage.getItem(CUSTOM_MAPPING_KEY);
      if (savedCustomCodes) {
        try {
          setCodes({ ...EMPTY_CODES, ...JSON.parse(savedCustomCodes) });
          setLogs(['Custom codebook restored from your saved mapping.']);
          return;
        } catch {
          sessionStorage.removeItem(CUSTOM_MAPPING_KEY);
        }
      }
      setCodes(EMPTY_CODES);
      setLogs(['Custom codebook selected. Enter codes for each character. Save it to restore it later.']);
      return;
    }
    try {
      const response = await fetch('/api/preset', { method: 'POST' });
      const data = await response.json();
      setCodes(data.codes);
      setLogs(['Preset loaded from code2.csv.']);
    } catch {
      setLogs(['Could not reach Python backend. Start it with: python main.py']);
    }
  };

  useEffect(() => {
    const savedMessagesJson = localStorage.getItem(SAVED_MESSAGES_KEY);
    if (savedMessagesJson) {
      try {
        setSavedMessages(JSON.parse(savedMessagesJson));
      } catch {
        localStorage.removeItem(SAVED_MESSAGES_KEY);
      }
    }
    const savedCodes = sessionStorage.getItem(STORAGE_KEY);
    if (savedCodes) {
      try {
        const parsedCodes = JSON.parse(savedCodes);
        sessionStorage.setItem(CUSTOM_MAPPING_KEY, JSON.stringify(parsedCodes));
        applyCodes(parsedCodes, 'Saved mapping restored from this session.');
        return;
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
    loadPreset(true);
  }, []);

  const updateCode = (character, value) => {
    setCodes((current) => ({ ...current, [character]: value.replace(/[^0-3]/g, '') }));
  };

  const saveMapping = () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
    sessionStorage.setItem(CUSTOM_MAPPING_KEY, JSON.stringify(codes));
    setUsePreset(false);
    setLogs(['Custom mapping saved. Toggle preset on and off to compare it with the saved custom code.']);
  };

  const saveEncodedMessage = () => {
    if (!result?.encoded_preview) {
      setLogs(['Submit a message first, then save its encoded result.']);
      return;
    }
    const savedMessage = {
      id: Date.now(),
      message: plainInput,
      encoded: result.encoded_preview,
      savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    const nextMessages = [savedMessage, ...savedMessages];
    setSavedMessages(nextMessages);
    localStorage.setItem(SAVED_MESSAGES_KEY, JSON.stringify(nextMessages));
    setLogs(['Encoded message saved in local storage.']);
  };

  const openEncoder = () => {
    localStorage.setItem(ACTIVE_MAPPING_KEY, JSON.stringify(codes));
    window.open('/encoder.html', '_blank', 'noopener,noreferrer');
  };

  const downloadCsv = () => {
    const csv = ['Character,Code', ...ALPHABET.map((character) => `${character === ' ' ? ' ' : character},${codes[character] || ''}`)].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = 'character-mapping.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    setLogs(['Mapping downloaded as character-mapping.csv.']);
  };

  const uploadCsv = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const importedCodes = { ...EMPTY_CODES };
      const rows = String(reader.result).trim().split(/\r?\n/).slice(1);
      let importedCount = 0;
      rows.forEach((row) => {
        const [rawCharacter, rawCode] = row.split(',');
        const character = rawCharacter === ' ' ? ' ' : rawCharacter?.trim();
        const code = rawCode?.trim();
        if (ALPHABET.includes(character) && /^[0-3]*$/.test(code || '')) {
          importedCodes[character] = code;
          importedCount += 1;
        }
      });
      applyCodes(importedCodes, `Imported ${importedCount} character codes from ${file.name}.`);
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLogs(['Sending codebook and message to Python backend...']);
    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codes, encoded_text: encodedInput, plain_text: plainInput }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResult(data);
      setLogs(data.logs);
    } catch (error) {
      setLogs([`Backend error: ${error.message}`]);
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar"><div className="brand-mark">↗</div><div><p className="eyebrow">COMPUTING LAB / 01</p><h1>Code Garden</h1></div><div className="topbar-note">An encoder · decoder playground</div><button type="button" className="topbar-button" onClick={openEncoder}>Open encoder ↗</button></header>
      <section className="intro"><div><p className="eyebrow">EXPLORE THE SIGNAL</p><h2>Build a codebook.<br /><em>Read the message.</em></h2></div><p className="intro-copy">Change the symbols, send a code stream through the decoder, and watch every decision appear in the trace.</p></section>
      <form onSubmit={handleSubmit}>
        <section className="workspace-grid">
          <div className="left-column">
            <div className="panel codebook-panel"><div className="panel-heading"><div><p className="eyebrow">01 / CODEBOOK</p><h3>Character mapping</h3></div><label className="toggle-control"><span>Use preset</span><input type="checkbox" checked={usePreset} onChange={(event) => loadPreset(event.target.checked)} /><span className="toggle-track"><span /></span></label></div><p className="helper-text">Each character gets a code made from the digits 0, 1, 2, and 3.</p><div className="mapping-actions"><button type="button" className="secondary-button" onClick={saveMapping}>Save mapping</button><button type="button" className="secondary-button" onClick={downloadCsv}>Download CSV</button><label className="secondary-button upload-button">Upload CSV<input type="file" accept=".csv,text/csv" onChange={uploadCsv} /></label></div><div className="code-grid">{ALPHABET.map((character) => <label className={`code-cell ${character === ' ' ? 'space-cell' : ''}`} key={character}><span>{character === ' ' ? 'SPACE' : character}</span><input aria-label={`Code for ${character === ' ' ? 'space' : character}`} value={codes[character] || ''} onChange={(event) => updateCode(character, event.target.value)} inputMode="numeric" maxLength={6} /></label>)}</div></div>
            <div className="panel message-panel"><div className="panel-heading compact-heading"><div><p className="eyebrow">02 / MESSAGE</p><h3>Send a stream through</h3></div><button className="submit-button" type="submit">Decode <span>↗</span></button></div><label className="field-label" htmlFor="encoded-input">Encoded code</label><textarea id="encoded-input" value={encodedInput} onChange={(event) => setEncodedInput(event.target.value)} placeholder="Example: 013023023032..." rows="3" /><p className="helper-text">Whitespace is ignored, so you can group digits while testing.</p><label className="field-label" htmlFor="plain-input">Plaintext encoder preview <span>optional</span></label><input id="plain-input" value={plainInput} onChange={(event) => setPlainInput(event.target.value)} placeholder="Type a message to encode" />{result?.encoded_preview && <div className="encoded-preview"><span>Encoded preview</span><code>{result.encoded_preview}</code></div>}<div className="message-actions"><button type="button" className="secondary-button" onClick={saveEncodedMessage}>Save encoded message</button><button type="button" className="secondary-button" onClick={openEncoder}>Open full encoder ↗</button></div>{savedMessages.length > 0 && <div className="saved-messages"><div className="saved-heading"><span>Saved messages</span><small>{savedMessages.length}</small></div>{savedMessages.map((saved) => <div className="saved-message" key={saved.id}><strong>{saved.message || '(empty message)'}</strong><code>{saved.encoded}</code><time>{saved.savedAt}</time></div>)}</div>}</div>
          </div>
          <aside className="right-column"><div className="panel result-panel"><p className="eyebrow">03 / OUTPUT</p><h3>Decoded sentence</h3><div className="decoded-output">{result?.decoded || <span>Waiting for a message...</span>}</div><div className="metrics"><div><strong>{result?.code_length ?? '—'}</strong><span>Length of code</span></div><div><strong>{result?.message_length ?? '—'}</strong><span>Length of message</span></div><div><strong>{result?.average_bits_per_character ?? '—'}</strong><span>Bits per character</span></div></div></div><div className="panel log-panel"><div className="log-heading"><div><p className="eyebrow">LIVE TRACE</p><h3>Debug log</h3></div><span className="status-dot" /></div><div className="log-output" role="log" aria-live="polite">{logs.map((log, index) => <p key={`${log}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span>{log}</p>)}</div></div></aside>
        </section>
      </form>
      <footer><span>CODE GARDEN</span><span>Make a code. Break a code. Learn why it works.</span></footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
