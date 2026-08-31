import http.server, socketserver, webbrowser, threading
PORT=8080
threading.Timer(1, lambda: webbrowser.open(f'http://localhost:{PORT}')).start()
with socketserver.TCPServer(('',PORT), http.server.SimpleHTTPRequestHandler) as httpd: httpd.serve_forever()
