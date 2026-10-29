import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { jsPDF } from 'jspdf';
import './encoder.css';

const ACTIVE_MAPPING_KEY = 'code-garden-active-mapping';
const FALLBACK_CODES = { A: '000', B: '001', C: '002', D: '003', E: '010', F: '011', G: '012', H: '013', I: '020', J: '021', K: '022', L: '023', M: '030', N: '031', O: '032', P: '100', Q: '101', R: '102', S: '103', T: '110', U: '111', V: '112', W: '113', X: '120', Y: '121', Z: '122', ' ': '123' };

function encodeMessage(message, codes) {
  return [...message.toUpperCase()].map((character) => codes[character] || `[${character}?]`).join('');
}

function Encoder() {
  const [message, setMessage] = useState('HELLO WORLD');
  const [codes] = useState(() => {
    try {
      return { ...FALLBACK_CODES, ...JSON.parse(localStorage.getItem(ACTIVE_MAPPING_KEY) || '{}') };
    } catch {
      return FALLBACK_CODES;
    }
  });
  const encoded = useMemo(() => encodeMessage(message, codes), [message, codes]);

  const downloadPdf = () => {
    const pdf = new jsPDF({ unit: 'pt', format: 'letter' });
    const left = 54;
    pdf.setFillColor(232, 240, 234);
    pdf.rect(0, 0, 612, 792, 'F');
    pdf.setTextColor(45, 59, 61);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(28);
    pdf.text('Code Garden', left, 78);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(113, 129, 126);
    pdf.text('ENCODER WORKSHEET', left, 101);
    pdf.setDrawColor(193, 211, 199);
    pdf.line(left, 120, 558, 120);
    pdf.setTextColor(45, 59, 61);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('Original message', left, 159);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(16);
    const messageLines = pdf.splitTextToSize(message || '(empty message)', 504);
    pdf.text(messageLines, left, 185);
    const encodedY = 185 + messageLines.length * 22 + 42;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('Encoded message', left, encodedY);
    pdf.setFont('courier', 'normal');
    pdf.setFontSize(12);
    const encodedLines = pdf.splitTextToSize(encoded || '(empty message)', 504);
    pdf.text(encodedLines, left, encodedY + 27);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(113, 129, 126);
    pdf.text(`Characters: ${message.length}    Code length: ${encoded.length}`, left, encodedY + 65 + encodedLines.length * 15);
    pdf.save('encoded-message.pdf');
  };

  return <main className="encoder-shell">
    <header className="encoder-header"><div className="brand-mark">↗</div><div><p className="eyebrow">CODE GARDEN / ENCODER</p><h1>Write the message.</h1></div><a href="/" className="back-link">Back to decoder ↗</a></header>
    <section className="encoder-intro"><p className="eyebrow">ACTIVE DICTIONARY</p><h2>Turn a thought<br /><em>into a signal.</em></h2><p>Type a message below. The active character mapping from the decoder is applied instantly.</p></section>
    <section className="encoder-grid"><div className="encoder-card input-card"><label htmlFor="message">Your message</label><textarea id="message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Type something to encode..." rows="7" /><div className="input-footer"><span>{message.length} characters</span><button type="button" className="pdf-button" onClick={downloadPdf}>Download PDF <span>↓</span></button></div></div><div className="encoder-card output-card"><p className="eyebrow">ENCODED OUTPUT</p><h3>Your signal</h3><div className="encoded-result">{encoded || <span>Nothing to encode yet.</span>}</div><div className="output-note">The PDF includes your original message and this encoded signal.</div></div></section>
    <footer><span>CODE GARDEN</span><span>Dictionary synced from the decoder tab.</span></footer>
  </main>;
}

createRoot(document.getElementById('encoder-root')).render(<Encoder />);
