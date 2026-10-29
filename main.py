import csv
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).parent


def load_mapping(filename):
    with (ROOT / filename).open(newline='', encoding='utf-8') as file:
        return {row['Character']: row['Code'].strip() for row in csv.DictReader(file)}


def encode_sentence(text, char_to_code, logs):
    encoded = []
    for character in text.upper():
        code = char_to_code.get(character)
        if code:
            encoded.append(code)
            logs.append(f'Encoded {"space" if character == " " else character} -> {code}')
        else:
            encoded.append(f'[{character}?]')
            logs.append(f'No code for {character}; added [{character}?]')
    return ''.join(encoded)


def decode_sentence(encoded_text, char_to_code, logs):
    code_to_char = {code: char for char, code in char_to_code.items()}
    stream = ''.join(encoded_text.split())
    max_code_length = max((len(code) for code in code_to_char), default=1)
    buffer = ''
    decoded = []
    logs.append(f'Input stream: {stream or "(empty)"}')
    for symbol in stream:
        if symbol not in '0123':
            logs.append(f'Ignored {symbol}; codes may only use 0, 1, 2, or 3')
            continue
        buffer += symbol
        logs.append(f'Reading {symbol} -> buffer {buffer}')
        if buffer in code_to_char:
            character = code_to_char[buffer]
            decoded.append(character)
            logs.append(f'Decoded {buffer} -> {"space" if character == " " else character}')
            buffer = ''
        elif len(buffer) >= max_code_length:
            logs.append(f'No match for {buffer}; inserted ? and reset buffer')
            decoded.append('?')
            buffer = ''
    if buffer:
        logs.append(f'Unfinished buffer {buffer}; inserted ?')
        decoded.append('?')
    return ''.join(decoded)


class ApiHandler(BaseHTTPRequestHandler):
    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/preset':
            self.send_json({'codes': load_mapping('code2.csv')})
            return
        if self.path != '/api/process':
            self.send_json({'error': 'Not found'}, 404)
            return
        try:
            length = int(self.headers.get('Content-Length', 0))
            request = json.loads(self.rfile.read(length))
            codes = request.get('codes') or load_mapping('code2.csv')
            logs = []
            encoded_preview = encode_sentence(request.get('plain_text', ''), codes, logs)
            decoded = decode_sentence(request.get('encoded_text', ''), codes, logs)
            code_length = len(''.join(request.get('encoded_text', '').split()))
            self.send_json({
                'decoded': decoded,
                'encoded_preview': encoded_preview,
                'code_length': code_length,
                'message_length': len(decoded),
                'average_bits_per_character': round(code_length / len(decoded), 2) if decoded else None,
                'logs': logs,
            })
        except (ValueError, KeyError, json.JSONDecodeError) as error:
            self.send_json({'error': str(error)}, 400)


if __name__ == '__main__':
    server = ThreadingHTTPServer(('127.0.0.1', 8500), ApiHandler)
    print('Python API running at http://localhost:8500')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
